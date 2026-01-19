#!/usr/bin/env python3

import requests
import sys
import base64
import json
import time
from datetime import datetime
from io import BytesIO
from PIL import Image, ImageDraw

class NESRSafetyAPITester:
    def __init__(self, base_url="https://safetyscan-11.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", response_data=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def create_test_image(self, image_type="safety_scene"):
        """Create a test image with real visual content for safety analysis"""
        # Create a 400x300 image with realistic safety scene elements
        img = Image.new('RGB', (400, 300), color='lightblue')
        draw = ImageDraw.Draw(img)
        
        if image_type == "safety_scene":
            # Draw a construction/industrial scene
            # Ground
            draw.rectangle([0, 250, 400, 300], fill='brown')
            
            # Building/structure
            draw.rectangle([50, 150, 200, 250], fill='gray')
            draw.rectangle([60, 160, 90, 190], fill='darkblue')  # Window
            draw.rectangle([110, 160, 140, 190], fill='darkblue')  # Window
            
            # Equipment/machinery
            draw.rectangle([220, 200, 280, 250], fill='yellow')
            draw.circle([250, 225], 15, fill='black')  # Wheel
            
            # Person (potential PPE violation)
            draw.ellipse([300, 180, 320, 200], fill='#FFDBAC')  # Head (no hard hat)
            draw.rectangle([305, 200, 315, 240], fill='blue')  # Body
            draw.rectangle([300, 240, 320, 250], fill='black')  # Legs
            
            # Hazard - spill
            draw.ellipse([150, 260, 180, 280], fill='black')
            
            # Add some texture/details
            for i in range(10):
                x = i * 40
                draw.line([x, 0, x, 300], fill='lightgray', width=1)
            
        elif image_type == "clean_site":
            # Draw a clean, compliant site
            draw.rectangle([0, 250, 400, 300], fill='green')  # Clean ground
            draw.rectangle([100, 100, 300, 200], fill='white')  # Clean building
            draw.rectangle([150, 120, 180, 150], fill='blue')  # Window
            draw.rectangle([220, 120, 250, 150], fill='blue')  # Window
            
            # Person with proper PPE
            draw.ellipse([200, 180, 220, 200], fill='yellow')  # Hard hat
            draw.ellipse([202, 182, 218, 198], fill='#FFDBAC')  # Face
            draw.rectangle([205, 200, 215, 240], fill='orange')  # Safety vest
            
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=85)
        img_data = buffer.getvalue()
        return base64.b64encode(img_data).decode('utf-8')

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "NESR" in data["message"]:
                    self.log_test("Root Endpoint", True, response_data=data)
                    return True
                else:
                    self.log_test("Root Endpoint", False, "Invalid response format", data)
            else:
                self.log_test("Root Endpoint", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Request failed: {str(e)}")
        return False

    def test_health_endpoint(self):
        """Test the health check endpoint"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_test("Health Check", True, response_data=data)
                    return True
                else:
                    self.log_test("Health Check", False, "Status not healthy", data)
            else:
                self.log_test("Health Check", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Health Check", False, f"Request failed: {str(e)}")
        return False

    def test_analyze_endpoint_with_violations(self):
        """Test analyze endpoint with image that should have violations"""
        try:
            # Create test image with potential safety violations
            image_base64 = self.create_test_image("safety_scene")
            
            payload = {
                "image_base64": image_base64,
                "file_name": "test_safety_scene.jpg"
            }
            
            print("🔍 Sending image for analysis (this may take 10-15 seconds)...")
            start_time = time.time()
            
            response = requests.post(
                f"{self.api_url}/analyze", 
                json=payload, 
                timeout=30,
                headers={'Content-Type': 'application/json'}
            )
            
            processing_time = time.time() - start_time
            print(f"⏱️  Analysis completed in {processing_time:.2f} seconds")
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ['photoId', 'fileName', 'uploadTime', 'analysisResults', 'processingTime']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Analyze Endpoint - Structure", False, f"Missing fields: {missing_fields}", data)
                    return False
                
                # Validate analysisResults structure
                analysis = data['analysisResults']
                required_analysis_fields = ['violations', 'riskLevel', 'safetyScore']
                missing_analysis_fields = [field for field in required_analysis_fields if field not in analysis]
                
                if missing_analysis_fields:
                    self.log_test("Analyze Endpoint - Analysis Structure", False, f"Missing analysis fields: {missing_analysis_fields}", data)
                    return False
                
                # Validate data types and ranges
                if not isinstance(analysis['safetyScore'], int) or not (0 <= analysis['safetyScore'] <= 100):
                    self.log_test("Analyze Endpoint - Safety Score", False, f"Invalid safety score: {analysis['safetyScore']}", data)
                    return False
                
                if analysis['riskLevel'] not in ['High', 'Medium', 'Low']:
                    self.log_test("Analyze Endpoint - Risk Level", False, f"Invalid risk level: {analysis['riskLevel']}", data)
                    return False
                
                # Validate violations structure if present
                if analysis['violations']:
                    for i, violation in enumerate(analysis['violations']):
                        required_violation_fields = ['type', 'location', 'confidence', 'category']
                        missing_violation_fields = [field for field in required_violation_fields if field not in violation]
                        
                        if missing_violation_fields:
                            self.log_test("Analyze Endpoint - Violation Structure", False, f"Violation {i} missing fields: {missing_violation_fields}", data)
                            return False
                        
                        if not isinstance(violation['confidence'], int) or not (0 <= violation['confidence'] <= 100):
                            self.log_test("Analyze Endpoint - Violation Confidence", False, f"Invalid confidence: {violation['confidence']}", data)
                            return False
                        
                        if violation['category'] not in ['PPE', 'Equipment', 'Environmental', 'Housekeeping']:
                            self.log_test("Analyze Endpoint - Violation Category", False, f"Invalid category: {violation['category']}", data)
                            return False
                
                self.log_test("Analyze Endpoint - Safety Scene", True, f"Violations: {len(analysis['violations'])}, Risk: {analysis['riskLevel']}, Score: {analysis['safetyScore']}%", data)
                return True
                
            else:
                self.log_test("Analyze Endpoint - Safety Scene", False, f"Status code: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Analyze Endpoint - Safety Scene", False, f"Request failed: {str(e)}")
        return False

    def test_analyze_endpoint_clean_site(self):
        """Test analyze endpoint with clean site image"""
        try:
            # Create test image with no violations
            image_base64 = self.create_test_image("clean_site")
            
            payload = {
                "image_base64": image_base64,
                "file_name": "test_clean_site.jpg"
            }
            
            print("🔍 Analyzing clean site image...")
            start_time = time.time()
            
            response = requests.post(
                f"{self.api_url}/analyze", 
                json=payload, 
                timeout=30,
                headers={'Content-Type': 'application/json'}
            )
            
            processing_time = time.time() - start_time
            print(f"⏱️  Analysis completed in {processing_time:.2f} seconds")
            
            if response.status_code == 200:
                data = response.json()
                analysis = data['analysisResults']
                
                # For a clean site, we expect fewer violations and higher safety score
                self.log_test("Analyze Endpoint - Clean Site", True, f"Violations: {len(analysis['violations'])}, Risk: {analysis['riskLevel']}, Score: {analysis['safetyScore']}%", data)
                return True
                
            else:
                self.log_test("Analyze Endpoint - Clean Site", False, f"Status code: {response.status_code}")
                
        except Exception as e:
            self.log_test("Analyze Endpoint - Clean Site", False, f"Request failed: {str(e)}")
        return False

    def test_analyze_endpoint_invalid_data(self):
        """Test analyze endpoint with invalid data"""
        try:
            # Test with invalid base64
            payload = {
                "image_base64": "invalid_base64_data",
                "file_name": "test.jpg"
            }
            
            response = requests.post(
                f"{self.api_url}/analyze", 
                json=payload, 
                timeout=15,
                headers={'Content-Type': 'application/json'}
            )
            
            # Should return error status
            if response.status_code >= 400:
                self.log_test("Analyze Endpoint - Invalid Data", True, f"Correctly rejected invalid data with status {response.status_code}")
                return True
            else:
                self.log_test("Analyze Endpoint - Invalid Data", False, f"Should have rejected invalid data but got status {response.status_code}")
                
        except Exception as e:
            self.log_test("Analyze Endpoint - Invalid Data", False, f"Request failed: {str(e)}")
        return False

    def test_cors_headers(self):
        """Test CORS headers are present"""
        try:
            response = requests.options(f"{self.api_url}/health", timeout=10)
            headers = response.headers
            
            cors_headers = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            ]
            
            present_headers = [h for h in cors_headers if h in headers]
            
            if len(present_headers) >= 1:  # At least one CORS header should be present
                self.log_test("CORS Headers", True, f"Found headers: {present_headers}")
                return True
            else:
                self.log_test("CORS Headers", False, f"No CORS headers found in: {list(headers.keys())}")
                
        except Exception as e:
            self.log_test("CORS Headers", False, f"Request failed: {str(e)}")
        return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting NESR Safety API Tests")
        print(f"📍 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Basic connectivity tests
        print("\n📡 Testing Basic Connectivity...")
        self.test_root_endpoint()
        self.test_health_endpoint()
        self.test_cors_headers()
        
        # Core functionality tests
        print("\n🔬 Testing AI Analysis Functionality...")
        self.test_analyze_endpoint_with_violations()
        time.sleep(2)  # Brief pause between AI calls
        self.test_analyze_endpoint_clean_site()
        
        # Error handling tests
        print("\n🛡️  Testing Error Handling...")
        self.test_analyze_endpoint_invalid_data()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check details above.")
            return 1

    def get_test_summary(self):
        """Get detailed test summary"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_details": self.test_results
        }

def main():
    tester = NESRSafetyAPITester()
    exit_code = tester.run_all_tests()
    
    # Save detailed results
    summary = tester.get_test_summary()
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")
    return exit_code

if __name__ == "__main__":
    sys.exit(main())