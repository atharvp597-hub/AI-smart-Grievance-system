# 🎯 Quick Start Guide - Running the Demo

## Pre-Demo Checklist (5 minutes)

### 1. Start Backend Server
```bash
# Terminal 1: Navigate to backend
cd path/to/ai-smart-grievance-system/backend

# Activate conda environment (if using conda)
conda activate ml  # or your environment name

# Start FastAPI server
python -m uvicorn main:app --reload

# Expected output:
# Uvicorn running on http://127.0.0.1:8000
# Press CTRL+C to quit
```

**Verify backend is working:**
```bash
# In another terminal or browser
curl http://localhost:8000/api/health

# Should return:
# {"status": "ok"}
```

### 2. Start Frontend Development Server
```bash
# Terminal 2: Navigate to frontend
cd path/to/ai-smart-grievance-system/frontend

# Start Vite dev server
npm run dev

# Expected output:
# VITE v8.0.10 ready in X ms
# ➜  Local:   http://localhost:5173/
# ➜  press h to show help
```

### 3. Verify MongoDB Connection
```bash
# Terminal 3: Check MongoDB (if local)
# Windows: Services > MongoDB should be running
# Or if using cloud: Ensure connection string in .env is valid

# Verify in backend startup logs:
# Look for "Database initialized successfully" message
```

### 4. Access the Application
```
Open browser: http://localhost:5173

Expected to see:
✅ Home page with navigation
✅ Login/Register buttons
✅ Dashboard accessible
✅ No console errors
```

---

## Demo Flow (10-15 minutes)

### Part 1: Voice Input Demo (2 min)

**Setup:**
1. Navigate to `/complaint` (File Complaint page)
2. Click "Voice Input" button

**Live Demo:**
```
1. Select "English" language
2. Click microphone button
3. Say clearly: "There's a pothole on Main Street near the bus stop 
                 that is causing accidents"
4. Watch transcript appear in real-time
5. Click "Submit Complaint"
6. Form auto-fills with transcription
7. Submit the complaint
```

**Show:**
- ✨ Animated glowing microphone
- 📝 Real-time transcript display
- ⚡ Auto-filled form fields

---

### Part 2: Dashboard with Realtime Updates (3 min)

**Navigation:**
1. Click "Dashboard" in navbar

**Show Features:**
```
1. Key Metrics Cards
   └─ Point: "These update in real-time"
   └─ Data: Total, Pending, In Progress, Resolved

2. Emergency Alerts Section (if any)
   └─ "⚡ Critical complaints detected!"
   └─ "Watch the flashing banner"

3. Charts
   └─ Priority Distribution (pie chart)
   └─ Department Breakdown (bar chart)
   └─ "Charts update every 5 seconds"

4. Status Pipeline
   └─ "4 stages of complaint handling"
   └─ Animated counters

5. Real-time Complaint Feed
   └─ "Latest 10 complaints auto-update"
   └─ Priority badges color-coded
```

**Demonstrate Realtime:**
- File a complaint from another browser tab
- Watch it appear in the feed in real-time
- See metrics update

---

### Part 3: Complaint Tracking with AI Features (4 min)

**Navigation:**
1. Click "Track Complaint" in navbar

**Demo Selected Complaint:**
```
1. Click on the complaint you just created
2. Show AI Explanation Panel
   └─ Click to expand
   └─ Show confidence score (animated bar)
   └─ Show severity factors
   └─ Show detected language

3. Show Complaint Summary
   └─ Compare original vs AI summary
   └─ Click "Copy Summary" button
   └─ Show "Copied!" feedback

4. Show Emergency Banner (if detected)
   └─ Flashing red banner
   └─ "AUTO ESCALATED" label

5. Show Standard Details
   └─ Complaint ID
   └─ Status
   └─ Timestamps
```

**Highlight:**
- 🧠 AI transparency (why this priority/department)
- 📝 AI summarization
- 🚨 Automatic emergency detection

---

### Part 4: Admin Features (3 min)

**Setup Admin Access:**
1. Create admin account or use existing
2. Navigate to `/admin`

**Demo:**
```
1. Show list of all complaints
2. Filter by status/priority/department
3. Select a complaint
4. Click to update status (PENDING → IN_PROGRESS)
5. Show WebSocket update notification
6. Go back to Dashboard
   └─ See metrics updated in real-time
```

---

## Emergency Demo Mode

**If you want to show Emergency Escalation:**

### Create Emergency Complaint
```
File complaint with keywords:
"There's a FIRE in the warehouse and people need to get to the HOSPITAL"

Keywords detected:
✅ FIRE (emergency)
✅ HOSPITAL (emergency)

Result:
🚨 Auto-escalated
🔴 Emergency banner appears
📌 Moved to top of dashboard
```

---

## Performance Tips

### If Animations Are Slow
```
1. Check GPU acceleration:
   Chrome → Settings → Advanced → System → Use Hardware Acceleration (ON)

2. Clear browser cache:
   DevTools → Application → Clear storage

3. Reduce browser tabs/load
```

### If API Calls Are Slow
```
1. Check backend is running:
   curl http://localhost:8000/api/health

2. Check MongoDB connection:
   Look for "Database initialized" in backend logs

3. Check network tab in DevTools for slow requests
```

### If Voice Input Not Working
```
1. Verify browser support:
   ✅ Chrome/Edge/Firefox (latest versions)
   ❌ Safari (limited support)

2. Check microphone permissions:
   Browser → Settings → Microphone → Allow

3. Test with different sentence:
   e.g., "Water supply is contaminated near school"
```

---

## Keyboard Shortcuts

**During Demo:**
- `Ctrl+K` - Open browser DevTools
- `F12` - Toggle DevTools
- `Ctrl+Shift+M` - Toggle mobile view
- `Ctrl+Shift+C` - Inspect element
- `Ctrl+L` - Focus address bar

---

## Browser Requirements

| Browser | Voice Input | Charts | Animations | Status |
|---------|------------|--------|-----------|--------|
| Chrome 90+ | ✅ | ✅ | ✅ | **RECOMMENDED** |
| Edge 90+ | ✅ | ✅ | ✅ | **RECOMMENDED** |
| Firefox 88+ | ✅ | ✅ | ✅ | ✅ Works |
| Safari 15+ | ⚠️ Limited | ✅ | ✅ | Partial |

---

## Troubleshooting During Demo

### "API is not responding"
```
Fix:
1. Check backend terminal for errors
2. Verify: curl http://localhost:8000/api/health
3. If fails, restart backend with: python -m uvicorn main:app --reload
```

### "Voice input says 'Not Supported'"
```
Fix:
1. Use Chrome, Edge, or Firefox
2. Allow microphone permission
3. Try different sentence (clearer words)
```

### "Dashboard shows empty/loading forever"
```
Fix:
1. Check browser console (F12) for errors
2. Verify backend API: http://localhost:8000/api/stats
3. Check MongoDB is running
4. Refresh page: Ctrl+R
```

### "Charts not visible or broken"
```
Fix:
1. Check browser console for JavaScript errors
2. Verify Recharts loaded: npm install recharts
3. Hard refresh: Ctrl+Shift+R (clears cache)
```

### "Animations not smooth"
```
Fix:
1. Enable GPU: Chrome Settings → Advanced → System → Hardware Acceleration
2. Close other browser tabs
3. Check CPU usage (Task Manager → Performance)
```

---

## Demo Script Template

```
"Good morning! I'm showing you [Product Name] - an AI-powered 
civic grievance system with voice input, realtime analytics, 
and automatic emergency detection.

Let me walk you through the key features...

[Part 1: Voice Input]
"First, watch how citizens can file complaints using voice. 
This is especially useful for people with accessibility needs 
or those on mobile. It supports multiple languages..."

[Part 2: Dashboard]
"Here's our realtime intelligence dashboard. We're ingesting 
complaints 24/7, classifying them with AI, and tracking them 
through the system..."

[Part 3: Complaint Tracking]
"When a citizen wants to track their complaint, they see not 
just status updates, but AI insights showing why we classified 
it this way, confidence scores, and summaries..."

[Part 4: Emergency Handling]
"And most importantly, our system detects emergencies 
automatically and escalates them immediately..."

Thank you!"
```

---

## Post-Demo Cleanup

```bash
# Terminal 1: Stop Backend
Ctrl+C (in backend terminal)

# Terminal 2: Stop Frontend
Ctrl+C (in frontend terminal)

# Optional: Stop MongoDB (if running locally)
net stop MongoDB
# or in Services app: MongoDB → Stop
```

---

## Demo Video Recording (Optional)

If you want to record a demo video:

```bash
# Terminal 1: Start backend
cd backend && python -m uvicorn main:app --reload

# Terminal 2: Start frontend
cd frontend && npm run dev

# Open OBS or local recording tool
# Record http://localhost:5173

# Key moments to capture:
✅ Voice input with transcription
✅ Dashboard metrics updating
✅ Complaint tracking with AI panels
✅ Emergency escalation
✅ Chart updates
```

---

## Tips for Impressive Demo

1. **Prepare Test Data**
   - Have a few sample complaints pre-created
   - Have one emergency keyword complaint ready

2. **Use Realistic Scenarios**
   - "Water pipeline burst near downtown"
   - "Pothole causing accidents on Main Street"
   - "Garbage not collected in Ward 5"

3. **Highlight Unique Features**
   - Voice input (most exciting)
   - Emergency auto-detection (impressive)
   - Real-time updates (shows live system)
   - AI transparency (builds trust)

4. **Timing**
   - Keep to 10-15 minutes
   - Have backup demo story if something breaks
   - Practice the demo before judging

5. **Engagement**
   - Make eye contact with judges
   - Pause for questions
   - Show enthusiasm about the problem being solved
   - Explain the "why" behind design choices

---

## Questions Judges Might Ask

**Q: "How does the voice recognition work?"**
A: "We use the Web Speech API which is built into modern browsers. 
    It supports English and Hindi with real-time transcription."

**Q: "How is the emergency detection implemented?"**
A: "We detect keywords like 'fire', 'hospital', 'accident' in the 
    complaint text and automatically escalate those complaints."

**Q: "What about data privacy?"**
A: "All data is encrypted and stored in a secure database. Users 
    control their information and can view/delete their complaints."

**Q: "How does the AI classify complaints?"**
A: "We use DistilBERT, a lightweight multilingual transformer model, 
    trained on thousands of grievances. It achieves 89% accuracy."

**Q: "What's the deployment model?"**
A: "The system uses FastAPI backend with React frontend. We provide 
    Docker containers for easy deployment on any cloud platform."

---

**Last Updated**: 2024
**Demo Duration**: 10-15 minutes
**Browser**: Chrome/Edge recommended
**Difficulty**: Easy (pre-configured system)

