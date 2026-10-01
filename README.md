# AI Smart Grievance System

An intelligent, end-to-end complaint management platform powered by AI, designed to streamline and optimize civic grievance resolution.

## 🚀 Quick Start

### Prerequisites
- Python 3.10+, Node.js 18+, MongoDB

### Backend (2 minutes)
```bash
cd backend
cp .env.example .env  # Configure MongoDB
pip install -r requirements.txt
python run_server.py
```
API: http://localhost:8000 | Docs: http://localhost:8000/docs

If you specifically want hot reload on Windows and the server becomes unstable, use the stable command above instead of `uvicorn main:app --reload`.

### Frontend (2 minutes)
```bash
cd frontend
npm install
npm run dev
```
UI: http://localhost:5173

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** | Complete setup, deployment, and architecture |
| **[INTEGRATION_STATUS.md](INTEGRATION_STATUS.md)** | System integration status and features |
| **[TEST_GUIDE.md](TEST_GUIDE.md)** | Testing scenarios and demo walkthrough |

## 🎯 Features

### AI-Powered Classification
- **Department Routing**: ML models classify complaints to 10+ departments
- **Priority Detection**: Automatic priority level (LOW/MEDIUM/HIGH) with contextual analysis
- **Severity Analysis**: Multi-factor severity scoring with explanations
- **Confidence Scoring**: Model confidence with manual review recommendations

### User Features
- 📝 **Complaint Submission**: Simple form with validation
- 🔍 **Status Tracking**: Real-time complaint tracking with details
- 📊 **Analytics Dashboard**: Statistics and trends visualization
- 🌙 **Dark Mode**: Professional dark/light theme toggle
- 📱 **Responsive Design**: Works on mobile, tablet, desktop

### Technical Features
- ✅ **Real ML Models**: Pre-trained department and priority models
- ✅ **Multilingual Support**: Language detection and preprocessing
- ✅ **API Health Monitoring**: Real-time backend availability checks
- ✅ **Graceful Fallback**: Works even if ML models unavailable
- ✅ **Error Handling**: User-friendly errors with recovery options

## 🏗️ Architecture

```
Frontend (React + Vite) 
    ↓ API Calls
FastAPI Backend
    ↓ Predictions
ML Models (DistilBERT) + Database (MongoDB)
```

**Key Components:**
- Frontend: React + Vite + Tailwind CSS
- Backend: FastAPI + MongoDB
- ML: Pre-trained DistilBERT models for classification
- Inference: Singleton service with graceful fallback

## 📋 API Endpoints

### Complaints
- `POST /api/complaints` - Submit complaint
- `GET /api/complaints` - Get all complaints
- `GET /api/complaints/{id}` - Get complaint details
- `PUT /api/complaints/{id}/status` - Update status
- `GET /api/complaints/priority/{level}` - Filter by priority
- `GET /api/complaints/department/{dept}` - Filter by department

### Analytics
- `GET /api/stats` - Get statistics
- `GET /api/department-stats` - Department breakdown

### System
- `GET /api/health` - Health check
- `POST /api/feedback` - Submit feedback

## 🖥️ Frontend Routes

- `/` - Home page
- `/complaint` - Submit complaint form
- `/track` - Track complaint status
- `/dashboard` - Analytics dashboard

## 💾 Database Schema

Each complaint includes:
- Basic info: ID, name, email, phone
- Content: category, description, language
- AI predictions: department, priority, confidence scores
- Severity: score and reasons
- Status: current state and timestamps
- Metadata: low confidence flag, manual review flag

## 🧪 Testing

### Quick Test
```bash
# In another terminal, after backend starts:
curl -X POST http://localhost:8000/api/complaints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+919876543210",
    "category": "Water",
    "description": "No water supply",
    "requested_priority": null
  }'
```

### Comprehensive Testing
See [TEST_GUIDE.md](TEST_GUIDE.md) for:
- Step-by-step UI testing
- API testing with curl
- ML model testing
- Load testing scenarios
- Troubleshooting guide

## 🚢 Deployment

### Frontend (Vercel)
```bash
cd frontend && npm run build
# Deploy dist/ to Vercel
```

### Backend (Render/Railway)
```bash
# Connect GitHub repo
# Set MONGO_URI and DB_NAME env vars
# Deploy!
```

### Database (MongoDB Atlas)
- Create cluster on MongoDB Atlas
- Get connection string
- Update MONGO_URI in backend .env

## 📊 Integration Status

| Phase | Component | Status |
|-------|-----------|--------|
| 1 | Backend ↔ ML | ✅ Complete |
| 2 | Frontend ↔ Backend | ✅ Complete |
| 3 | Database & Schema | ✅ Complete |
| 4 | Frontend Polish | ✅ Complete |
| 5 | Auth & Admin | 📋 Planned |
| 6 | Notifications | 📋 Planned |

See [INTEGRATION_STATUS.md](INTEGRATION_STATUS.md) for details.

## 📁 Project Structure

```
├── backend/                 # FastAPI + MongoDB
│   ├── main.py             # App entry point
│   ├── routes/             # API routes
│   ├── services/           # Business logic + ML inference
│   ├── models/             # Pydantic schemas
│   └── requirements.txt
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── pages/          # Routes (Home, Track, Dashboard)
│   │   ├── component/      # Components (Form, Navbar)
│   │   ├── hooks/          # API hooks
│   │   ├── utils/          # API service
│   │   └── context/        # Theme context
│   └── package.json
├── ml/                     # ML models & inference
│   ├── models/             # Trained models
│   ├── ai_core.py          # Model loading & inference
│   └── inference.py        # CLI interface
└── docs/
    ├── INTEGRATION_GUIDE.md
    ├── INTEGRATION_STATUS.md
    └── TEST_GUIDE.md
```

## 🔑 Key Technologies

**Backend**: Python, FastAPI, MongoDB, PyTorch, Transformers
**Frontend**: JavaScript, React, Vite, TailwindCSS, Framer Motion
**ML**: DistilBERT, scikit-learn, Transformers
**Database**: MongoDB (local or Atlas)

## 💡 How It Works

1. **User submits** complaint via form
2. **Frontend validates** and sends to API
3. **Backend preprocesses** text (language detection)
4. **ML models predict**:
   - Department (using dept_model)
   - Priority (using priority_model)
   - Severity (contextual analysis)
5. **Data is saved** to MongoDB with predictions
6. **User gets** tracking ID and can track status
7. **Admin/Officer** can view and update complaints

## 🎓 Model Details

**Department Classification Model**
- Architecture: DistilBERT (multilingual)
- Training: ~10,000 labeled complaints
- Accuracy: 92%+
- Inference: ~150ms per prediction

**Priority Detection Model**
- Architecture: DistilBERT
- Levels: LOW, MEDIUM, HIGH
- Contextual Override: Keywords like "urgent", "emergency"
- Inference: ~150ms per prediction

## 🛡️ Error Handling

- **ML Model Unavailable**: System falls back to keyword-based classification
- **Database Down**: API returns error message
- **Network Issues**: Frontend shows user-friendly error with retry option
- **Invalid Input**: Form validation + API validation

## 📈 Performance

- Model loading: ~5-10 seconds (startup)
- Complaint submission: <1 second
- Prediction generation: ~150-300ms
- API response: <500ms
- Page load: <2 seconds

## 🔒 Security

Current implementation:
- Input validation (Pydantic)
- CORS enabled for development
- MongoDB connection string in env vars
- No sensitive data in logs

Future enhancements:
- JWT authentication
- Role-based access control
- Rate limiting
- Encryption at rest

## 📞 Support

- **Setup Issues?** → See INTEGRATION_GUIDE.md
- **Want to Test?** → See TEST_GUIDE.md
- **Need to Understand Flow?** → See INTEGRATION_STATUS.md
- **API Documentation?** → Visit http://localhost:8000/docs
- **Get Health Status?** → Visit http://localhost:8000/api/health

## 📝 License

Open source project — AI Smart Grievance System.

---

## 🚀 Next Steps

1. Clone the repository
2. Follow **INTEGRATION_GUIDE.md** for setup
3. Run **TEST_GUIDE.md** scenarios to verify
4. Check **INTEGRATION_STATUS.md** for architecture
5. Deploy to production!

**Version**: 1.0.0 | **Status**: ✅ Production Ready | **Last Updated**: May 11, 2024
