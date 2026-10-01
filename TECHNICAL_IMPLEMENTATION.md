# 🏗️ Technical Implementation Details

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      React Frontend (Vite)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ VoiceInput   │  │ Emergency    │  │ AI Explanation          │
│  │ Component    │  │ Banner       │  │ Panel                   │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Complaint    │  │ Summary      │  │ Modern       │         │
│  │ Form         │  │ Component    │  │ Dashboard    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Framer Motion | React Router | Hooks            │   │
│  │         TailwindCSS | Recharts | Context API            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │ API Calls
                     │ WebSocket
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Python)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Complaint    │  │ Auth         │  │ Admin        │         │
│  │ Routes       │  │ Routes       │  │ Routes       │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│       ▲                  ▲                   ▲                  │
│       │ Uses             │ Uses              │ Uses             │
│       ▼                  ▼                   ▼                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ AI Service   │  │ Auth Service │  │ Preprocess   │         │
│  │              │  │              │  │ Service      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│       ▲                                     ▲                  │
│       │ Uses                                │ Uses             │
│       ▼                                     ▼                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │     Inference Service (ML Models Wrapper)        │          │
│  │     DistilBERT Models | Fallback Classifier      │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │   MongoDB Database       │
        │  (Complaints, Users)     │
        └──────────────────────────┘
```

---

## Frontend Component Structure

### 1. VoiceInput Component
**File**: `frontend/src/component/VoiceInput.jsx`

```jsx
// Key Features:
├─ Web Speech API Integration
├─ Language Selection (en-IN, hi-IN)
├─ Real-time Transcription Display
├─ Microphone Button with Glowing Animation
├─ Animated Recording Status
└─ Transcript Management (Clear, Submit)

// Hook Pattern Used:
useState for: isListening, transcript, language, error
useEffect for: SpeechRecognition setup, cleanup
useRef for: recognitionRef (persistent API reference)

// Animation Framework:
Framer Motion with:
├─ motion.div for container scaling
├─ motion.button for microphone button
├─ motion.p for animated listening status
└─ animate={{ scale: [1, 1.2, 1] }} for pulse effect

// Component Lifecycle:
1. Mount: Initialize SpeechRecognition API
2. Listen: Handle onstart, onresult, onerror, onend
3. Display: Show transcripts in real-time
4. Submit: Call parent callback with transcript
5. Unmount: Cleanup recognitionRef
```

**Integration**: Imported in `ComplaintForm.jsx`
```jsx
<VoiceInput 
  isOpen={voiceModalOpen}
  onClose={() => setVoiceModalOpen(false)}
  onTranscript={handleVoiceTranscript}
/>
```

---

### 2. EmergencyBanner Component
**File**: `frontend/src/component/EmergencyBanner.jsx`

```jsx
// Algorithm:
function isEmergency(complaint) {
  return EMERGENCY_KEYWORDS.some(keyword =>
    complaint.description.toLowerCase().includes(keyword.toLowerCase())
  )
}

// Emergency Keywords Array (15+ keywords):
["fire", "hospital", "accident", "electrocution", "contamination",
 "gas leak", "flood", "sewage", "collapse", "danger", "critical",
 "urgent", "emergency", ...]

// Multilingual Support:
- English: fire, hospital, accident, danger, emergency
- Hindi: आग, अस्पताल, दुर्घटना, खतरा, इमरजेंसी
- Hinglish: emergency, accident (romanized Hindi)

// Animation Loop:
backgroundColor: [rgb(239, 68, 68), rgb(220, 38, 38), rgb(239, 68, 68)]
duration: 0.6s
repeat: Infinity

// Composition:
<AnimatePresence>
  <motion.div animate={flashingAnimation}>
    <AlertTriangle animate={{ rotate: [0, 10, -10, 0] }} />
    <div>Emergency Details</div>
    <motion.div animate={{ scale: [1, 1.1, 1] }}>⚡</motion.div>
  </motion.div>
</AnimatePresence>
```

---

### 3. AIExplanationPanel Component
**File**: `frontend/src/component/AIExplanationPanel.jsx`

```jsx
// State Management:
useState {
  isExpanded: boolean,
  // Data comes from props (complaint object)
}

// Data Extracted from Complaint:
{
  confidence: 0-1,           // AI confidence score
  severity_score: 0-1,       // Severity from preprocessing
  severity_reasons: [...],   // List of detected severity factors
  language: 'en'|'hi'|'mixed',
  priority: 'High'|'Medium'|'Low',
  department: 'Water'|'Electricity'|...,
  is_low_confidence: boolean
}

// Visualization Pattern:
confidence % → progress bar width calculation
bar color → conditional based on confidence threshold (80%, 60%)

// Animations:
Chevron rotation: isExpanded ? 180 : 0
Height animation: opacity + height.auto transition
Staggered badges: delay: idx * 0.1
Progress bars: initial { width: 0 } → animate { width: `${pct}%` }

// Code Pattern:
<motion.button onClick={() => setIsExpanded(!isExpanded)}>
  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} />
</motion.button>

<AnimatePresence>
  {isExpanded && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Expanded Content */}
    </motion.div>
  )}
</AnimatePresence>
```

---

### 4. ComplaintSummary Component
**File**: `frontend/src/component/ComplaintSummary.jsx`

```jsx
// API Integration:
async function fetchSummary(complaintId) {
  const response = await complaintAPI.getSummary(complaintId)
  // Response: {
  //   complaint_id, original, summary,
  //   department, priority
  // }
}

// State Management:
useState {
  summary: null,
  loading: false,
  error: null,
  copied: false
}

// useEffect Pattern:
useEffect(() => {
  if (complaintId) fetchSummary()
}, [complaintId])

// Copy Functionality:
const handleCopy = (text) => {
  navigator.clipboard.writeText(text)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}

// Conditional Rendering:
loading   → <LoadingState />
error     → <ErrorState />
!summary  → null
success   → <SummaryDisplay />

// Animations:
Container: initial={{ opacity: 0, y: 10 }}
Content: initial={{ opacity: 0 }} with delay: 0.2
Button: whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
```

---

### 5. Modern Dashboard Component
**File**: `frontend/src/pages/Dashboard.jsx`

```jsx
// Data Fetching:
useEffect(() => {
  fetchDashboardData()
  const interval = setInterval(fetchDashboardData, 5000)
  return () => clearInterval(interval)
}, [])

// Data Structure:
{
  total_complaints: number,
  priority_distribution: {
    High: number,
    Medium: number,
    Low: number
  },
  department_distribution: {
    'Water': number,
    'Electricity': number,
    ...
  },
  status_distribution: {
    PENDING: number,
    IN_PROGRESS: number,
    RESOLVED: number,
    REJECTED: number
  }
}

// Chart Data Transformation:
const priorityData = [
  { name: 'High', value: 15, color: '#ef4444' },
  { name: 'Medium', value: 8, color: '#f59e0b' },
  { name: 'Low', value: 12, color: '#10b981' }
]

const deptData = Object.entries(dept_distribution).map(([name, value]) => ({
  name: name.substring(0, 10),
  value,
  color: `hsl(${Math.random() * 360}, 70%, 60%)`
}))

// Recharts Components Used:
├─ <PieChart /> for priority distribution
├─ <BarChart /> for department breakdown
├─ <LineChart /> (for future trending)
└─ <ResponsiveContainer /> for responsive sizing

// Animation Pattern:
Grid container: motion.div with staggerChildren
Cards: StatCard with initial={{ opacity: 0 }} animate={{ opacity: 1 }}
Number counters: initial={{ opacity: 0 }} animate={{ opacity: 1 }}
Icons: animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3 }}

// Emergency Filter:
const emergencies = complaints.filter(c =>
  EMERGENCY_KEYWORDS.some(keyword =>
    c.description?.toLowerCase().includes(keyword.toLowerCase())
  )
)

// Realtime Update Loop:
setInterval(fetchDashboardData, 5000) // 5-second refresh
```

---

## Backend Implementation

### 1. Complaint Routes
**File**: `backend/routes/complaint.py`

**Summarization Endpoint**:
```python
@router.get("/complaints/{complaint_id}/summary")
def get_complaint_summary(complaint_id: str, _: dict = Depends(get_current_user)):
    """
    Generate extractive summary of complaint
    
    Algorithm:
    1. Fetch complaint from MongoDB
    2. Split description into sentences
    3. Apply extractive logic:
       - If ≤2 sentences: return original
       - If >2 sentences: 
         * first_sentence + middle_sentence + last_sentence
    4. Return summary with metadata
    """
    
    complaint = db.complaints.find_one({"complaint_id": complaint_id})
    sentences = [s.strip() for s in description.split('.') if s.strip()]
    
    if len(sentences) <= 2:
        summary = description
    else:
        summary = (sentences[0] + ". " +
                   sentences[len(sentences)//2] + ". " +
                   sentences[-1])
    
    return {
        "success": True,
        "data": {
            "complaint_id": complaint_id,
            "original": description,
            "summary": summary,
            "department": complaint.get("department"),
            "priority": complaint.get("priority")
        }
    }
```

---

### 2. API Service Layer
**File**: `frontend/src/utils/api.js`

```javascript
// Pattern: Centralized API client with error handling

export const complaintAPI = {
  async create(complaint) {
    return apiRequest('/complaints', {
      method: 'POST',
      body: JSON.stringify(complaint)
    })
  },

  async getSummary(complaintId) {
    return apiRequest(`/complaints/${complaintId}/summary`)
  },

  async getStats() {
    return apiRequest('/stats')
  },

  async getComplaints(params = {}) {
    const query = new URLSearchParams(params).toString()
    const path = query ? `/complaints?${query}` : '/complaints'
    return apiRequest(path)
  }
}

// Helper function with error handling:
async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`
  const auth = getAuthState()
  const token = auth?.token
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      },
      ...options
    })

    const contentType = response.headers.get('content-type') || ''
    const hasJson = contentType.includes('application/json')
    
    let payload = hasJson ? await response.json() : await response.text()

    if (!response.ok) {
      const message = payload?.detail || payload?.message || 'Request failed'
      const error = new Error(message)
      error.status = response.status
      error.response = payload
      throw error
    }

    return payload
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Network error')
  }
}
```

---

## Animation Patterns

### Pattern 1: Glowing Pulse
```jsx
<motion.div
  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
  transition={{ duration: 1, repeat: Infinity }}
  className="glow-effect"
/>
```

### Pattern 2: Expanding Collapse
```jsx
<AnimatePresence>
  {isExpanded && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      Content
    </motion.div>
  )}
</AnimatePresence>
```

### Pattern 3: Staggered List
```jsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ staggerChildren: 0.1 }}
>
  {items.map((item, idx) => (
    <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
      {item}
    </motion.div>
  ))}
</motion.div>
```

### Pattern 4: Progress Bar Fill
```jsx
<motion.div
  initial={{ width: 0 }}
  animate={{ width: `${percentage}%` }}
  transition={{ duration: 0.8, ease: 'easeOut' }}
  className="progress-bar"
/>
```

### Pattern 5: Hover Lift
```jsx
<motion.button
  whileHover={{ y: -5, shadow: "0 10px 20px rgba(0,0,0,0.2)" }}
  whileTap={{ scale: 0.98 }}
/>
```

---

## State Management Pattern

### Context-based Global State
```jsx
// AuthContext.jsx
export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)

  const login = async (credentials) => {
    const response = await authAPI.login(credentials)
    setToken(response.token)
    setUser(response.user)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }))
  }

  const value = {
    token,
    user,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    register
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Usage in components:
const { user, isAuthenticated, login } = useAuth()
```

---

## Error Handling Pattern

### API Error Handling
```javascript
try {
  const response = await complaintAPI.create(data)
  if (response.success) {
    // Success path
  }
} catch (error) {
  // Handle specific error types
  if (error.status === 401) {
    // Unauthorized - redirect to login
  } else if (error.status === 422) {
    // Validation error - show field errors
  } else {
    // Generic error - show message
    setError(error.message)
  }
}
```

### Component Error Boundary
```jsx
// Future: Add ErrorBoundary for crash prevention
<ErrorBoundary fallback={<ErrorPage />}>
  <Dashboard />
</ErrorBoundary>
```

---

## Performance Optimizations

### 1. Memoization
```jsx
const MemoizedChart = React.memo(function Chart({ data }) {
  return <BarChart data={data} />
}, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data)
})
```

### 2. useCallback for Handlers
```jsx
const handleSearch = useCallback((id) => {
  if (id.trim()) {
    setSelectedId(id.trim())
  }
}, []) // No dependencies - stable reference
```

### 3. Lazy Loading for Routes
```jsx
const Dashboard = React.lazy(() => import('./Dashboard'))

<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

### 4. Debounced API Calls
```jsx
const debouncedSearch = useCallback(
  debounce((searchTerm) => {
    fetchComplaints(searchTerm)
  }, 300),
  []
)
```

---

## Testing Patterns

### Frontend Component Testing (Example)
```jsx
// VoiceInput.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import VoiceInput from './VoiceInput'

describe('VoiceInput', () => {
  test('opens modal when isOpen is true', () => {
    render(<VoiceInput isOpen={true} onClose={jest.fn()} />)
    expect(screen.getByText('Voice Complaint')).toBeInTheDocument()
  })

  test('calls onTranscript with text on submit', async () => {
    const onTranscript = jest.fn()
    render(<VoiceInput isOpen={true} onTranscript={onTranscript} />)
    
    fireEvent.change(screen.getByPlaceholderText('transcript'), {
      target: { value: 'test complaint' }
    })
    fireEvent.click(screen.getByText('Submit'))
    
    expect(onTranscript).toHaveBeenCalledWith('test complaint')
  })
})
```

---

## Deployment Considerations

### Environment Variables
```bash
# Frontend (.env)
VITE_API_BASE_URL=http://localhost:8000/api  # Dev
VITE_API_BASE_URL=https://api.example.com/api  # Prod

# Backend (.env)
MONGO_URI=mongodb://localhost:27017
DB_NAME=grievances
JWT_SECRET_KEY=your-secret-key-32-chars-min
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
```

### Docker Deployment
```dockerfile
# Frontend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]

# Backend Dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Browser Compatibility

| Feature | Chrome | Firefox | Edge | Safari |
|---------|--------|---------|------|--------|
| Voice API | ✅ 25+ | ✅ 25+ | ✅ 79+ | ⚠️ 14.1+ |
| Fetch API | ✅ | ✅ | ✅ | ✅ |
| CSS Grid | ✅ | ✅ | ✅ | ✅ |
| Framer Motion | ✅ | ✅ | ✅ | ✅ |
| WebSocket | ✅ | ✅ | ✅ | ✅ |
| localStorage | ✅ | ✅ | ✅ | ✅ |

---

**Last Updated**: 2024
**Framework**: React 19 + FastAPI
**Styling**: TailwindCSS 4.2
**Animations**: Framer Motion 12.0
**Charts**: Recharts 2.10

