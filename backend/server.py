from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64
from openai import OpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'safety_vision')]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class Violation(BaseModel):
    type: str
    location: str
    confidence: int
    category: str  # PPE, Equipment, Environmental, Housekeeping

class AnalysisResults(BaseModel):
    violations: List[Violation]
    riskLevel: str  # High, Medium, Low
    safetyScore: int  # 0-100

class PhotoAnalysisRequest(BaseModel):
    image_base64: str
    file_name: str

class PhotoAnalysisResponse(BaseModel):
    photoId: str
    fileName: str
    uploadTime: str
    analysisResults: AnalysisResults
    processingTime: float

class BatchAnalysisRequest(BaseModel):
    images: List[PhotoAnalysisRequest]

# Safety Analysis Prompt
SAFETY_ANALYSIS_PROMPT = """You are an expert industrial safety inspector analyzing site photos. Be STRICT in your safety scoring.

Analyze this image and identify ALL safety violations. For each violation found, provide:
1. Type of violation (e.g., "Missing Hard Hat", "Exposed Wiring", "Spill Hazard")
2. Location in image (e.g., "top-left", "center", "bottom-right", "left-center")
3. Confidence score (0-100)
4. Category: PPE, Equipment, Environmental, or Housekeeping

VIOLATION CATEGORIES:

PPE Violations (CRITICAL - deduct 15-25 points each):
- Missing hard hat (-25 points)
- Missing safety vest/high-visibility clothing (-20 points)
- Missing gloves (-15 points)
- Missing safety glasses/goggles (-20 points)
- Missing safety boots (-15 points)
- Improper PPE usage (-15 points)

Equipment Hazards (SERIOUS - deduct 15-25 points each):
- Exposed machinery parts (-20 points)
- Uncovered pits/holes (-25 points)
- Improperly stacked materials (-15 points)
- Unsecured equipment (-20 points)
- Missing guards on machinery (-20 points)

Environmental Hazards (CRITICAL - deduct 20-30 points each):
- Spills (oil, chemical, water) (-20 points)
- Exposed wiring (-30 points)
- Fire hazards (-30 points)
- Blocked exits/pathways (-25 points)
- Poor lighting conditions (-15 points)

Housekeeping Violations (MODERATE - deduct 5-15 points each):
- Clutter and debris (-10 points)
- Disorganized workspace (-5 points)
- Unsanitary conditions (-10 points)
- Improper waste disposal (-15 points)

STRICT SCORING RULES:
- Start at 100 points
- Subtract points for EACH violation found based on severity above
- MINIMUM score is 0 (cannot go negative)
- Multiple violations of same type: deduct for EACH instance

SAFETY SCORE INTERPRETATION:
- 90-100: Excellent (0-1 minor violations)
- 70-89: Good (few minor violations)
- 50-69: Fair (multiple violations, needs attention)
- 30-49: Poor (serious violations, immediate action needed)
- 0-29: Critical (multiple serious violations, work should stop)

RISK LEVEL (must match safety score):
- High Risk: Safety score 0-49 OR any critical violation (missing hard hat, exposed wiring, fire hazard)
- Medium Risk: Safety score 50-74
- Low Risk: Safety score 75-100 AND no critical violations

Respond in this exact JSON format:
{
    "violations": [
        {"type": "Violation Name", "location": "location-in-image", "confidence": 95, "category": "Category"},
        ...
    ],
    "riskLevel": "High|Medium|Low",
    "safetyScore": 0-100,
    "summary": "Brief summary of findings"
}

IMPORTANT: If you detect 3+ violations, the safety score should be BELOW 60. If you detect 5+ violations or any critical violation, the score should be BELOW 40.

If the image is not a worksite/industrial setting or has no violations, return:
{
    "violations": [],
    "riskLevel": "Low",
    "safetyScore": 100,
    "summary": "No safety violations detected"
}

Analyze the image thoroughly and be STRICT with scoring."""

async def analyze_image_with_vision(image_base64: str) -> dict:
    """Analyze image using GPT-4o Vision"""
    import time
    import json
    start_time = time.time()
    
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    
    try:
        client = OpenAI(api_key=api_key)
        
        # Call GPT-4o Vision API
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert industrial safety inspector. Always respond with valid JSON."
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": SAFETY_ANALYSIS_PROMPT
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1500
        )
        
        processing_time = time.time() - start_time
        
        # Get response text
        response_text = response.choices[0].message.content.strip()
        
        # Clean response - remove markdown code blocks if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        analysis_data = json.loads(response_text)
        
        # Extract data
        violations = analysis_data.get("violations", [])
        risk_level = analysis_data.get("riskLevel", "Low")
        safety_score = analysis_data.get("safetyScore", 100)
        
        # Validate and adjust safety score based on violations
        num_violations = len(violations)
        
        # Count critical violations
        critical_violations = sum(1 for v in violations if v.get("type", "").lower() in [
            "missing hard hat", "exposed wiring", "fire hazard", "uncovered pit",
            "blocked exit", "missing safety glasses", "exposed machinery"
        ] or v.get("category", "") in ["PPE", "Environmental"])
        
        # Calculate expected max score based on violations
        if num_violations >= 5 or critical_violations >= 2:
            max_expected_score = 35
        elif num_violations >= 3 or critical_violations >= 1:
            max_expected_score = 55
        elif num_violations >= 2:
            max_expected_score = 70
        elif num_violations >= 1:
            max_expected_score = 85
        else:
            max_expected_score = 100
        
        # Adjust score if AI returned too high
        if safety_score > max_expected_score:
            safety_score = max_expected_score
        
        # Validate risk level matches score
        if safety_score <= 49 or critical_violations >= 1:
            risk_level = "High"
        elif safety_score <= 74:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        
        return {
            "violations": violations,
            "riskLevel": risk_level,
            "safetyScore": safety_score,
            "summary": analysis_data.get("summary", ""),
            "processingTime": processing_time
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}, response: {response[:500] if response else 'None'}")
        # Return default response on parse error
        return {
            "violations": [],
            "riskLevel": "Low",
            "safetyScore": 100,
            "summary": "Unable to parse analysis results",
            "processingTime": time.time() - start_time
        }
    except Exception as e:
        logger.error(f"Vision API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Vision analysis failed: {str(e)}")

# Routes
@api_router.get("/")
async def root():
    return {"message": "NESR Safety Inspection API"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "NESR Safety Vision"}

@api_router.post("/analyze", response_model=PhotoAnalysisResponse)
async def analyze_photo(request: PhotoAnalysisRequest):
    """Analyze a single photo for safety violations"""
    photo_id = str(uuid.uuid4())
    upload_time = datetime.now(timezone.utc).isoformat()
    
    # Analyze with Vision API
    analysis = await analyze_image_with_vision(request.image_base64)
    
    return PhotoAnalysisResponse(
        photoId=photo_id,
        fileName=request.file_name,
        uploadTime=upload_time,
        analysisResults=AnalysisResults(
            violations=[Violation(**v) for v in analysis["violations"]],
            riskLevel=analysis["riskLevel"],
            safetyScore=analysis["safetyScore"]
        ),
        processingTime=analysis["processingTime"]
    )

@api_router.post("/analyze-batch", response_model=List[PhotoAnalysisResponse])
async def analyze_batch(request: BatchAnalysisRequest):
    """Analyze multiple photos for safety violations"""
    results = []
    
    for image_req in request.images:
        try:
            photo_id = str(uuid.uuid4())
            upload_time = datetime.now(timezone.utc).isoformat()
            
            analysis = await analyze_image_with_vision(image_req.image_base64)
            
            results.append(PhotoAnalysisResponse(
                photoId=photo_id,
                fileName=image_req.file_name,
                uploadTime=upload_time,
                analysisResults=AnalysisResults(
                    violations=[Violation(**v) for v in analysis["violations"]],
                    riskLevel=analysis["riskLevel"],
                    safetyScore=analysis["safetyScore"]
                ),
                processingTime=analysis["processingTime"]
            ))
        except Exception as e:
            logger.error(f"Error analyzing {image_req.file_name}: {str(e)}")
            # Add error result
            results.append(PhotoAnalysisResponse(
                photoId=str(uuid.uuid4()),
                fileName=image_req.file_name,
                uploadTime=datetime.now(timezone.utc).isoformat(),
                analysisResults=AnalysisResults(
                    violations=[],
                    riskLevel="Low",
                    safetyScore=0
                ),
                processingTime=0
            ))
    
    return results

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve React Frontend Static Files (for unified deployment)
STATIC_DIR = ROOT_DIR / "static"
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR / "static")), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        """Serve React app for all non-API routes"""
        # Check if it's a file request
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        # Return index.html for all other routes (React Router)
        return FileResponse(STATIC_DIR / "index.html")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
