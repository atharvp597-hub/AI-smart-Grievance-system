# AI Smart Grievance System - Test & Demo Guide

## Quick Start (5 minutes)

### 1. Start Backend

```bash
cd backend
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
MONGO_URI=mongodb://localhost:27017
DB_NAME=grievance_db
EOF

# Start backend
uvicorn main:app --reload
```

**Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

✅ Backend running on: http://localhost:8000

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

**Output:**
```
  ➜  Local:   http://localhost:5173/
```

✅ Frontend running on: http://localhost:5173

### 3. Start MongoDB

**Option A: Local MongoDB**
```bash
# Make sure MongoDB is running
mongod
```

**Option B: MongoDB Atlas (Cloud)**
- Create account at https://www.mongodb.com/cloud/atlas
- Create cluster
- Copy connection string
- Update MONGO_URI in backend/.env

---

## Test Scenarios

### Scenario 1: Submit a Simple Complaint

1. Open http://localhost:5173 in browser
2. Click "Submit Complaint" button
3. Fill form:
   - Name: John Doe
   - Email: john@example.com
   - Phone: +919876543210
   - Category: Water Supply
   - Description: "No water supply since morning in sector 5"
4. Click "Submit Complaint"

**Expected Result:**
```
✓ Success!
Your Tracking ID: CMP-ABC1234567
Department: Water
Priority: HIGH
You can track your complaint on the "Track Complaint" page.
```

### Scenario 2: Test Different Categories

Try these descriptions to see different classifications:

#### Water Supply Issue
```
Description: Water is not coming in my house since 3 days. The pipeline seems damaged.
Expected Department: Water
Expected Priority: HIGH
```

#### Electricity Problem
```
Description: The street lights in our area have been off for a week. It's getting dark at night.
Expected Department: Electricity
Expected Priority: MEDIUM
```

#### Road Damage
```
Description: There are huge potholes on Main Street causing accidents. Very dangerous!
Expected Department: Roads
Expected Priority: HIGH
```

#### Garbage/Sanitation
```
Description: Garbage is piling up on our street. The waste collection hasn't happened for 2 weeks.
Expected Department: Garbage
Expected Priority: MEDIUM
```

#### Police/Crime
```
Description: There was a theft in our neighborhood last night. We need urgent police assistance.
Expected Department: Police
Expected Priority: HIGH
```

### Scenario 3: Track a Complaint

1. Click "Track Complaint" in navigation
2. Search for the complaint ID from Scenario 1
3. Click on complaint in list
4. View details:
   - Complaint ID
   - Status (PENDING)
   - Priority
   - Department
   - Confidence score
   - Created date

### Scenario 4: View Analytics

1. Click "Analytics" in navigation
2. See dashboard with:
   - Total complaints count
   - Breakdown by priority (HIGH/MEDIUM/LOW)
   - Department-wise distribution
   - Priority distribution chart

---

## API Testing with curl

### Test 1: Health Check

```bash
curl http://localhost:8000/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "AI Smart Grievance System",
  "version": "1.0.0"
}
```

### Test 2: Submit Complaint (API)

```bash
curl -X POST http://localhost:8000/api/complaints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "category": "Water Supply",
    "description": "No water supply since morning",
    "requested_priority": null
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Complaint registered successfully",
  "data": {
    "complaint_id": "CMP-ABC1234567",
    "department": "Water",
    "priority": "HIGH",
    "confidence": 0.95,
    "severity_score": 8,
    "status": "PENDING",
    "routed_to": "water@gov.in",
    "needs_manual_review": false
  }
}
```

### Test 3: Get All Complaints

```bash
curl http://localhost:8000/api/complaints
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "complaint_id": "CMP-ABC1234567",
      "name": "John Doe",
      "email": "john@example.com",
      "department": "Water",
      "priority": "HIGH",
      "status": "PENDING",
      ...
    }
  ]
}
```

### Test 4: Get Single Complaint

```bash
curl http://localhost:8000/api/complaints/CMP-ABC1234567
```

### Test 5: Get Statistics

```bash
curl http://localhost:8000/api/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_complaints": 5,
    "high_priority": 2,
    "medium_priority": 2,
    "low_priority": 1
  }
}
```

### Test 6: Get Department Stats

```bash
curl http://localhost:8000/api/department-stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "Water": 2,
    "Electricity": 1,
    "Roads": 1,
    "Police": 1,
    "General": 0
  }
}
```

### Test 7: Update Complaint Status

```bash
curl -X PUT http://localhost:8000/api/complaints/CMP-ABC1234567/status \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

---

## ML Model Testing

### Test Inference Directly

```bash
cd ml
python inference.py "No water supply since morning"
```

**Output:**
```json
{
  "department": "Water",
  "priority": "HIGH",
  "confidence": 0.95,
  "department_confidence": 0.96,
  "priority_confidence": 0.94,
  "severity_score": 8,
  "severity_reasons": [...],
  "is_low_confidence": false,
  "needs_manual_review": false,
  ...
}
```

---

## Performance Tests

### Load Test: Multiple Complaints

```bash
#!/bin/bash
# test_load.sh

for i in {1..10}; do
  curl -X POST http://localhost:8000/api/complaints \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"User $i\",
      \"email\": \"user$i@example.com\",
      \"phone\": \"+9198765432$i\",
      \"category\": \"Water Supply\",
      \"description\": \"Complaint number $i - Water issue\",
      \"requested_priority\": null
    }"
  echo "Submitted complaint $i"
  sleep 1
done
```

Run:
```bash
bash test_load.sh
```

Monitor:
- Backend logs for performance
- MongoDB collections growing
- Frontend dashboard updating

---

## Debugging Tips

### 1. Check Backend Logs
```
Look for:
- ✓ ML models loaded successfully
- ✗ Failed to load ML models
- Any Python errors or exceptions
```

### 2. Check Browser Console
```javascript
// In browser console (F12)
// Check for API errors
fetch('/api/health').then(r => r.json()).then(console.log)
```

### 3. Check Database
```bash
# MongoDB CLI
mongo
use grievance_db
db.complaints.find()
```

### 4. Test ML Models Directly
```bash
cd ml
python -c "from ai_core import get_default_adapter; adapter = get_default_adapter(); print(adapter.predict('water supply issue'))"
```

---

## Common Issues & Solutions

### Issue: Backend can't load ML models
**Solution:**
- Check ml/models/ directory exists
- Check path in inference_service.py is correct
- Check all model files present (config.json, model.safetensors, tokenizer.json, label_encoder.joblib)
- Check Python can access the directory

### Issue: Frontend can't connect to backend
**Solution:**
- Ensure backend is running: `curl http://localhost:8000/api/health`
- Check VITE_API_BASE_URL in frontend/.env matches backend URL
- Check CORS is enabled in backend (it is by default)
- Check browser console for errors

### Issue: MongoDB connection fails
**Solution:**
- For local: Ensure mongod is running
- For Atlas: Verify connection string, username, password, IP whitelist
- Check network connectivity

### Issue: Models load but predictions are slow
**Solution:**
- This is normal for first prediction (model initialization)
- Subsequent predictions should be fast (<100ms)
- Use GPU if available (torch will auto-detect)

---

## Success Indicators

✅ **System is working correctly if:**
1. Backend starts without errors
2. `/api/health` returns healthy status
3. Frontend loads without console errors
4. Can submit complaint and get tracking ID
5. Can view complaint on tracking page
6. Dashboard shows statistics
7. ML models load (check logs for "✓ ML models loaded")
8. Predictions include department, priority, confidence

---

## Next: Advanced Testing

For admin features, authentication, and advanced analytics, see:
- `INTEGRATION_GUIDE.md` - Complete setup guide
- `backend/routes/complaint.py` - Available endpoints
- `frontend/src/hooks/useAPI.js` - Available API functions

---

**Test Date**: May 11, 2024
**System Version**: 1.0.0
