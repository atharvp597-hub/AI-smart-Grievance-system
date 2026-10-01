# AI Smart Grievance System — Problem Tracker

All issues found during code audit. Fixed ones are checked off.

---

## 🔴 Critical

- [x] **P1** — Real API keys committed in `backend/.env` (Gemini + Resend) → replaced with placeholders
- [x] **P2** — JWT secret is default `"change-me-in-production"` (not set in .env) → added placeholder to `.env`
- [x] **P3** — CORS `allow_origins=["*"]` + `allow_credentials=True` — invalid combination, breaks browser auth → fixed to use `ALLOWED_ORIGINS` env var
- [x] **P4** — Complaint image is `File(...)` (required) — text-only submissions fail with 422 → changed to `File(None)` (optional)
- [x] **P5** — OTP / verified-email store is in-memory only — wiped on restart, locks users out → migrated to MongoDB with TTL indexes

---

## 🟠 High

- [x] **P6** — Route ordering bug: `GET /api/complaints/my` shadowed by `/{complaint_id}` → 404/403 → moved `/my` before `/{complaint_id}`
- [x] **P7** — `GET /api/complaints` has no pagination — OOMs server at scale → added `page` + `page_size` query params
- [x] **P8** — `department_stats` makes 11 separate DB queries — needs `$group` aggregation → replaced with single aggregation pipeline
- [x] **P9** — `ADMIN_BOOTSTRAP_KEY` not set in `.env` → can never create admin account → added to `.env` template
- [x] **P10** — `@app.on_event("startup")` is deprecated in FastAPI — should use `lifespan` → rewritten with `@asynccontextmanager lifespan`

---

## 🟡 Medium

- [x] **P11** — `OTP_DEV_MODE` defaults `true` → OTP codes returned in API responses in production → changed default to `false` in `.env`
- [x] **P12** — WebSocket auth token sent in URL query string (logged in server access logs) → now sent as first WS message frame
- [x] **P13** — Gemini in-memory cache (`_CACHE`, `_TRANSLATION_CACHE`) has no size cap → unbounded memory growth → capped at 500 entries with LRU eviction
- [ ] **P14** — No rate limiting on login / OTP endpoints → brute-force risk *(requires slowapi or nginx config — left as TODO)*
- [x] **P15** — ML `requirements.txt` has unpinned `torch`, `transformers`, `numpy` → reproducibility risk → all versions pinned

---

## 🟢 Minor / Code Quality

- [x] **P16** — Duplicate `complaintAPI.getAll()` and `complaintAPI.getComplaints()` in `frontend/src/utils/api.js` → removed `getAll()`
- [x] **P17** — `framer-motion` and `motion` both listed in `frontend/package.json` (same package) → removed `motion`
- [x] **P18** — No 404 catch-all route in React router → added `path="*"` fallback route
- [ ] **P19** — Mixed CRLF / LF line endings throughout the project *(editor/git config level fix — use `.editorconfig`)*
- [x] **P20** — `import json` inside function body in `ml/ai_core.py` → moved to module top level

---

## Fix Log

| Problem | Status | Notes |
|---------|--------|-------|
| P1 | ✅ Fixed | `backend/.env` — real keys removed |
| P2 | ✅ Fixed | `backend/.env` — JWT_SECRET_KEY placeholder added |
| P3 | ✅ Fixed | `backend/main.py` — CORS uses `ALLOWED_ORIGINS` env var |
| P4 | ✅ Fixed | `backend/routes/complaint.py` — image is now `File(None)` |
| P5 | ✅ Fixed | `backend/services/otp_service.py` — MongoDB + TTL indexes |
| P6 | ✅ Fixed | `backend/routes/complaint.py` — `/my` route moved above `/{id}` |
| P7 | ✅ Fixed | `backend/routes/complaint.py` — pagination added |
| P8 | ✅ Fixed | `backend/routes/complaint.py` — `$group` aggregation |
| P9 | ✅ Fixed | `backend/.env` — ADMIN_BOOTSTRAP_KEY placeholder added |
| P10 | ✅ Fixed | `backend/main.py` — `lifespan` context manager |
| P11 | ✅ Fixed | `backend/.env` — OTP_DEV_MODE=false |
| P12 | ✅ Fixed | `backend/routes/realtime.py` — first-frame auth |
| P13 | ✅ Fixed | `backend/services/gemini_service.py` — 500-entry cap + eviction |
| P14 | ⚠️ TODO | Requires `slowapi` middleware or nginx rate limit config |
| P15 | ✅ Fixed | `ml/requirements.txt` — all packages pinned |
| P16 | ✅ Fixed | `frontend/src/utils/api.js` — duplicate `getAll()` removed |
| P17 | ✅ Fixed | `frontend/package.json` — `motion` package removed |
| P18 | ✅ Fixed | `frontend/src/App.jsx` — `path="*"` 404 route added |
| P19 | ⚠️ TODO | Add `.editorconfig` or configure git `core.autocrlf` |
| P20 | ✅ Fixed | `ml/ai_core.py` — `import json` moved to top level |

---

## ⚠️ Remaining TODOs

### P14 — Rate Limiting
Install `slowapi` and add to `backend/main.py`:
```bash
pip install slowapi
```
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Then on endpoints:
@router.post("/auth/login")
@limiter.limit("10/minute")
async def login_user(request: Request, payload: LoginRequest): ...
```

### P19 — Line Endings
Create a `.editorconfig` at the project root:
```ini
[*]
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```
And configure git:
```bash
git config core.autocrlf input
```

> [!NOTE]
> Remember to **revoke and regenerate** the original Gemini and Resend API keys that were exposed in P1, even though they've been removed from the file.
