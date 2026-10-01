# API Reference - AI Smart Grievance System

## Base URL
```
http://localhost:8000
```

## Authentication
Currently: None (public endpoints)
Future: JWT-based authentication

## Response Format
All responses follow this format:
```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

---

## Endpoints

### 1. Submit Complaint
**Endpoint**: `POST /api/complaints`

**Request**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "category": "Water Supply",
  "description": "No water supply since morning",
  "requested_priority": null
}
```

**Validation**:
- name: 2-100 chars (required)
- email: valid email (required)
- phone: 8-15 digits, optional + prefix (required)
- category: 2-60 chars (required)
- description: 10-4000 chars (required)
- requested_priority: null | "LOW" | "MEDIUM" | "HIGH"

**Response** (201 Created):
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

**Errors**:
- 400: Invalid input
- 500: Database error

---

### 2. Get All Complaints
**Endpoint**: `GET /api/complaints`

**Query Parameters**: None

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "complaint_id": "CMP-ABC1234567",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543210",
      "category": "Water Supply",
      "description": "No water supply...",
      "language": "en",
      "department": "Water",
      "priority": "HIGH",
      "confidence": 0.95,
      "department_confidence": 0.96,
      "priority_confidence": 0.94,
      "severity_score": 8,
      "severity_reasons": ["Critical service failure"],
      "status": "PENDING",
      "created_at": "2024-05-11T10:30:00Z",
      "updated_at": "2024-05-11T10:30:00Z",
      "is_low_confidence": false,
      "needs_manual_review": false,
      "routed_to": "water@gov.in"
    }
  ]
}
```

**Errors**:
- 500: Database error

---

### 3. Get Single Complaint
**Endpoint**: `GET /api/complaints/{complaint_id}`

**Path Parameters**:
- complaint_id: string (required) - Format: CMP-XXXXXXXXXX

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    // Same as complaint object above
  }
}
```

**Errors**:
- 404: Complaint not found
- 500: Database error

---

### 4. Get Complaints by Priority
**Endpoint**: `GET /api/complaints/priority/{level}`

**Path Parameters**:
- level: "LOW" | "MEDIUM" | "HIGH" (required)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    // Array of complaints with matching priority
  ]
}
```

---

### 5. Get Complaints by Department
**Endpoint**: `GET /api/complaints/department/{department}`

**Path Parameters**:
- department: string (required)
  - Valid: Water, Electricity, Roads, Garbage, Drainage, Sanitation, Transport, Street Light, Health, Police, General

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    // Array of complaints for that department
  ]
}
```

---

### 6. Update Complaint Status
**Endpoint**: `PUT /api/complaints/{complaint_id}/status`

**Path Parameters**:
- complaint_id: string (required)

**Request**:
```json
{
  "status": "IN_PROGRESS"
}
```

**Status Values**:
- PENDING: Initial state
- IN_PROGRESS: Officer assigned
- RESOLVED: Complaint resolved
- REJECTED: Cannot resolve

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Status updated successfully"
}
```

**Errors**:
- 404: Complaint not found
- 500: Database error

---

### 7. Submit Feedback
**Endpoint**: `POST /api/feedback`

**Request**:
```json
{
  "text": "The complaint was mislabeled",
  "correct_department": "Electricity",
  "complaint_id": "CMP-ABC1234567"
}
```

**Validation**:
- text: 3-2000 chars (required)
- correct_department: 2-50 chars (required)
- complaint_id: optional string

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Feedback stored successfully"
}
```

---

### 8. Get Statistics
**Endpoint**: `GET /api/stats`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "total_complaints": 15,
    "high_priority": 5,
    "medium_priority": 6,
    "low_priority": 4
  }
}
```

---

### 9. Get Department Statistics
**Endpoint**: `GET /api/department-stats`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "Water": 3,
    "Electricity": 2,
    "Roads": 1,
    "Garbage": 2,
    "Drainage": 1,
    "Sanitation": 1,
    "Transport": 2,
    "Health": 2,
    "Police": 1,
    "General": 0
  }
}
```

---

### 10. Health Check
**Endpoint**: `GET /api/health`

**Response** (200 OK):
```json
{
  "status": "healthy",
  "service": "AI Smart Grievance System",
  "version": "1.0.0"
}
```

---

### 11. Home Endpoint
**Endpoint**: `GET /`

**Response** (200 OK):
```json
{
  "message": "AI Smart Grievance System is running",
  "docs": "/docs",
  "health": "/api/health"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Field validation error message"
}
```

### 404 Not Found
```json
{
  "detail": "Complaint not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Database error message"
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Complaint created successfully |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Complaint not found |
| 500 | Server Error - Database or processing error |

---

## Field Descriptions

### Complaint Object

| Field | Type | Description |
|-------|------|-------------|
| complaint_id | string | Unique ID: CMP-XXXXXXXXXX |
| name | string | Citizen name |
| email | string | Email address |
| phone | string | Phone number with country code |
| category | string | Category selected by user |
| description | string | Full complaint text |
| language | string | Detected language (en, hi, etc.) |
| department | string | AI-classified department |
| priority | string | AI-detected priority (LOW/MEDIUM/HIGH) |
| confidence | float | Overall confidence (0.0-1.0) |
| department_confidence | float | Department prediction confidence |
| priority_confidence | float | Priority prediction confidence |
| severity_score | integer | Severity (1-10) |
| severity_reasons | array | List of reasons for severity |
| status | string | Current status |
| created_at | string | ISO timestamp |
| updated_at | string | ISO timestamp |
| is_low_confidence | boolean | Needs manual review? |
| needs_manual_review | boolean | Manual review recommended? |
| routed_to | string | Department email |

---

## Usage Examples

### Using curl

**Submit Complaint**:
```bash
curl -X POST http://localhost:8000/api/complaints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "category": "Water",
    "description": "No water supply since morning",
    "requested_priority": null
  }'
```

**Get All Complaints**:
```bash
curl http://localhost:8000/api/complaints
```

**Get Specific Complaint**:
```bash
curl http://localhost:8000/api/complaints/CMP-ABC1234567
```

**Update Status**:
```bash
curl -X PUT http://localhost:8000/api/complaints/CMP-ABC1234567/status \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

**Get Stats**:
```bash
curl http://localhost:8000/api/stats
```

### Using JavaScript/Fetch

```javascript
// Import from frontend
import { complaintAPI } from './utils/api.js'

// Submit complaint
const result = await complaintAPI.create({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+919876543210',
  category: 'Water',
  description: 'No water supply',
  requested_priority: null
})

// Get all complaints
const complaints = await complaintAPI.getAll()

// Get single complaint
const complaint = await complaintAPI.getById('CMP-ABC1234567')

// Update status
await complaintAPI.updateStatus('CMP-ABC1234567', 'IN_PROGRESS')

// Get stats
import { analyticsAPI } from './utils/api.js'
const stats = await analyticsAPI.getStats()
```

---

## Rate Limiting
Currently: None
Future: May be added for production

---

## Pagination
Currently: Not implemented (returns all results)
Future: May add limit/offset parameters

---

## Filtering
Currently: Filter by priority, department (separate endpoints)
Future: May add advanced filtering options

---

## Sorting
Currently: None
Future: May add sort parameters

---

## Documentation
- **Interactive Docs**: http://localhost:8000/docs (Swagger UI)
- **Alternative Docs**: http://localhost:8000/redoc (ReDoc)

---

**Last Updated**: May 11, 2024
**API Version**: 1.0.0
