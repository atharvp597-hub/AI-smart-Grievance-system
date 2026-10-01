# AI Smart Grievance System - Integration Guide

## Project Overview
A complete end-to-end AI-powered grievance management platform with:
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: FastAPI + MongoDB
- **ML**: Pre-trained multilingual complaint classification models
- **AI**: Intelligent department routing and priority detection

## Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React Vite)   │
└────────┬────────┘
         │ API Calls
         ↓
┌─────────────────┐       ┌──────────────────┐
│   FastAPI       │◄─────►│    MongoDB       │
│   Backend       │       │   Database       │
└────────┬────────┘       └──────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│   ML Inference Service              │
│  - Department Classification        │
│  - Priority Detection               │
│  - Severity Analysis                │
└─────────────────────────────────────┘
```

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)
- Git

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Create Python environment**
```bash
# Using venv
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Or using conda
conda create -n grievance python=3.10
conda activate grievance
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Create .env file**
```bash
# backend/.env
MONGO_URI=mongodb://localhost:27017
DB_NAME=grievance_db
```

For MongoDB Atlas:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true
DB_NAME=grievance_db
```

5. **Start the backend**
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`
API Docs: `http://localhost:8000/docs`
Health Check: `http://localhost:8000/api/health`

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create .env file (optional)**
```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:8000/api
```

4. **Start development server**
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### ML Models

Models are pre-trained and located in `ml/models/`:
- `dept_model/` - Department classification model
- `priority_model/` - Priority level classification model

They are automatically loaded by the backend on startup.

## API Endpoints

### Complaints
- `POST /api/complaints` - Submit a new complaint
- `GET /api/complaints` - Get all complaints
- `GET /api/complaints/{complaint_id}` - Get complaint details
- `GET /api/complaints/priority/{level}` - Get complaints by priority
- `GET /api/complaints/department/{department}` - Get complaints by department
- `PUT /api/complaints/{complaint_id}/status` - Update complaint status

### Analytics
- `GET /api/stats` - Get overall statistics
- `GET /api/department-stats` - Get department-wise statistics

### Health
- `GET /api/health` - API health check
- `GET /` - Home endpoint

### Feedback
- `POST /api/feedback` - Submit feedback on classification

## Frontend Routes

- `/` - Home page
- `/complaint` - Submit complaint form
- `/track` - Track complaint status
- `/dashboard` - Analytics dashboard

## Database Schema

### Complaint Document
```json
{
  "complaint_id": "CMP-ABC1234567",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "category": "Water Supply",
  "description": "No water supply since morning",
  "language": "en",
  "department": "Water",
  "priority": "HIGH",
  "confidence": 0.95,
  "department_confidence": 0.96,
  "priority_confidence": 0.94,
  "severity_score": 8,
  "severity_reasons": ["Critical service failure", "Health impact"],
  "is_low_confidence": false,
  "needs_manual_review": false,
  "status": "PENDING",
  "created_at": "2024-05-11T10:30:00Z",
  "updated_at": "2024-05-11T10:30:00Z",
  "routed_to": "water@gov.in"
}
```

## Complaint Submission Flow

```
1. User fills form
   ↓
2. Frontend validates & sends to API
   ↓
3. Backend preprocesses text (language detection)
   ↓
4. ML models predict:
   - Department classification
   - Priority level
   - Contextual severity
   ↓
5. Complaint saved to database with predictions
   ↓
6. Response sent with:
   - Complaint ID
   - Department
   - Priority
   - Confidence score
   - Severity reasons
   ↓
7. User gets tracking ID for status updates
```

## AI Prediction Details

### Department Classification
- Uses trained DistilBERT model on multilingual data
- Supports 10+ departments (Water, Electricity, Roads, etc.)
- Returns top-3 predictions with confidence scores

### Priority Detection
- Combines model predictions with contextual analysis
- Three levels: LOW, MEDIUM, HIGH
- Contextual rules override weak model predictions
- Considers keywords like "urgent", "emergency", "critical"

### Severity Analysis
- Multi-factor analysis including:
  - Keywords indicating severity
  - Department criticality
  - Contextual urgency markers
- Returns severity score (1-10) and reasons

## Performance Optimizations

1. **Model Loading**: Models loaded once at startup (singleton pattern)
2. **Caching**: Service layer caches inference adapter
3. **Fallback**: Keyword-based fallback if models unavailable
4. **Database**: Indexed queries on complaint_id, department, priority
5. **API**: Proper error handling and status codes

## Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Deploy dist/ folder to Vercel
```

### Backend (Render/Railway)
```bash
# Create requirements.txt (already done)
# Push to GitHub
# Connect repository to Render/Railway
# Set environment variables
# Deploy
```

### Database (MongoDB Atlas)
1. Create cluster on MongoDB Atlas
2. Create database user
3. Whitelist IP addresses
4. Update MONGO_URI in .env

## Testing

### Test a Complaint Submission
```bash
curl -X POST http://localhost:8000/api/complaints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "category": "Water Supply",
    "description": "No water supply since morning in sector 5",
    "requested_priority": null
  }'
```

### Test Health Check
```bash
curl http://localhost:8000/api/health
```

### Test ML Inference
```bash
cd ml
python inference.py "No water supply since morning"
```

## Troubleshooting

### Backend doesn't start
- Ensure Python 3.10+ is installed
- Check all dependencies: `pip list`
- Verify .env file exists and is correct
- Check MongoDB connection

### Frontend can't connect to backend
- Ensure backend is running on port 8000
- Check VITE_API_BASE_URL is correct
- Check CORS is enabled (it is in main.py)
- Check browser console for errors

### ML models not loading
- Verify ml/models/dept_model and ml/models/priority_model exist
- Check model files aren't corrupted
- Review backend logs for errors
- System will use keyword fallback if models unavailable

### MongoDB connection fails
- Check MongoDB is running (local) or accessible (Atlas)
- Verify connection string in .env
- Check firewall/network settings
- For Atlas, verify IP whitelist

## Features Implemented

### Phase 1: Backend ↔ ML Integration ✓
- [x] Real ML model loading
- [x] Inference service wrapper
- [x] Replaced keyword-only logic
- [x] Full prediction pipeline
- [x] Confidence scoring
- [x] Severity analysis

### Phase 2: Frontend ↔ Backend Integration ✓
- [x] Centralized API service layer
- [x] Reusable API hooks
- [x] Complaint submission form
- [x] Complaint tracking page
- [x] Analytics dashboard
- [x] Proper error handling
- [x] Loading states
- [x] Health monitoring

### Phase 3: Database & Schema ✓
- [x] Improved complaint schema
- [x] Confidence scores stored
- [x] Severity reasons recorded
- [x] Low confidence flags
- [x] Timestamps on updates

### Phase 4: Additional Features
- [x] Status updates
- [x] Department routing
- [x] Multi-language support
- [x] Dark/Light theme
- [x] Responsive design

## Next Steps (Future Enhancements)

1. **Authentication & Authorization**
   - JWT-based user login
   - Role-based access (citizen, officer, admin)
   - Protected API routes

2. **Admin Dashboard**
   - Complaints table with filters
   - Bulk status updates
   - Officer assignment
   - Manual review queue

3. **Officer Portal**
   - Assigned complaints list
   - Status update workflow
   - Resolution notes
   - Escalation handling

4. **Notifications**
   - Email notifications on status change
   - SMS alerts for high priority
   - Push notifications

5. **Advanced Analytics**
   - Complaint trends over time
   - Department performance metrics
   - Resolution time tracking
   - AI model performance monitoring

6. **Integrations**
   - SMS gateway integration
   - Email service integration
   - External data API connections
   - File upload support

## Support & Documentation

- API Documentation: `http://localhost:8000/docs`
- Database Docs: Check ml/config.py for model config
- Frontend Components: See frontend/src/component/
- API Hooks: See frontend/src/hooks/useAPI.js

## License

This project is part of the AI Smart Grievance System initiative.

---

**Last Updated**: May 11, 2024
**System Version**: 1.0.0
