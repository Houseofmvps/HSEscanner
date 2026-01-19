# AI Safety Vision - Product Requirements Document

## Original Problem Statement
Build a safety inspection tool that uses AI vision to detect safety violations in real-time site photos. Added requirement: Create a beautiful, modern landing page explaining the tool's features.

## Architecture
- **Frontend**: React with Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI (Python)
- **AI Integration**: OpenAI GPT-4o Vision via Emergent LLM Key
- **PDF Generation**: jsPDF (client-side)
- **Database**: MongoDB (not used for image storage per requirements)

## User Personas
1. **HSE Professionals** - Primary users conducting site safety audits
2. **Site Inspectors** - Field workers using tablets/phones
3. **Safety Managers** - Reviewing reports and compliance

## Core Requirements (Static)
- Upload multiple photos (JPG, PNG, WEBP)
- AI-powered detection of PPE, Equipment, Environmental, Housekeeping violations
- Risk level classification (High/Medium/Low)
- Confidence scores for each detection
- User notes and flagging capability
- PDF report generation
- Landing page explaining features

## What's Been Implemented (January 2025)
- ✅ Modern landing page with hero, features, how it works, detection categories
- ✅ Multi-photo upload with drag-drop support
- ✅ GPT-4o Vision integration for safety analysis
- ✅ Photo gallery with risk badges and violation summaries
- ✅ Photo detail modal with HUD overlay styling
- ✅ User notes and flag-for-followup functionality
- ✅ PDF report generation with executive summary
- ✅ Dark mode enterprise design (Safety Orange + Cyan accents)
- ✅ Real-time upload progress indicators
- ✅ Statistics dashboard (total photos, risk counts, avg safety score)
- ✅ Responsive design for mobile/tablet

## Routes
- `/` - Landing page (marketing/features)
- `/inspect` - Inspection tool (upload & analyze)

## Prioritized Backlog
### P0 (Critical)
- All core features implemented ✅

### P1 (High Priority)
- Email functionality to send reports to HSE team
- Batch upload optimization for large photo sets

### P2 (Medium Priority)
- Historical inspection tracking in database
- Dashboard with analytics/charts
- Photo annotation tools

## Next Tasks
1. Add email integration for sending reports
2. Implement historical inspection storage
3. Add user authentication for teams
