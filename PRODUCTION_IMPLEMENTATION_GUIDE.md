# PRODUCTION IMPLEMENTATION GUIDE
## Critical Code for Missing Features

### Table of Contents
1. Security Hardening
2. Docker Setup
3. Unit Tests
4. Hindi Translation
5. Monitoring & Logging
6. Rate Limiting
7. Authentication Improvements
8. Database Improvements

---

# 1. SECURITY HARDENING

## 1.1 Fixed Config with Validation

**File: `backend/core/config.py`**

```python
from pydantic import BaseSettings, validator
from pathlib import Path

class Settings(BaseSettings):
    # MongoDB
    MONGO_URI: str
    DB_NAME: str
    
    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 120
    
    # Bootstrap
    ADMIN_BOOTSTRAP_KEY: str
    
    # Security
    ALLOWED_ORIGINS: list = [
        "http://localhost:5173",  # Vite dev
        "http://localhost:3000",  # Alt dev
        "https://yourdomain.com",  # Production
    ]
    
    # Limits
    MAX_REQUEST_SIZE: int = 1_000_000  # 1MB
    REQUEST_TIMEOUT: int = 30
    
    # Features
    ENABLE_CORS: bool = True
    ENABLE_RATE_LIMIT: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds
    
    @validator("JWT_SECRET_KEY")
    def jwt_secret_not_default(cls, v):
        if v == "change-me-in-production" or len(v) < 32:
            raise ValueError(
                "JWT_SECRET_KEY must be set to a strong value "
                "(32+ chars, not the default)"
            )
        return v
    
    @validator("ADMIN_BOOTSTRAP_KEY")
    def bootstrap_key_strong(cls, v):
        if len(v) < 32:
            raise ValueError(
                "ADMIN_BOOTSTRAP_KEY must be 32+ characters"
            )
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

**File: `backend/.env.example`**

```env
# Required - Must be changed for production
MONGO_URI=mongodb://localhost:27017
DB_NAME=grievance_db
JWT_SECRET_KEY=your-secret-key-min-32-chars-here-12345
ADMIN_BOOTSTRAP_KEY=your-bootstrap-key-min-32-chars-here

# Optional
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
ENABLE_RATE_LIMIT=true
RATE_LIMIT_REQUESTS=100
```

## 1.2 CORS Configuration

**File: `backend/core/middleware.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

def setup_cors(app: FastAPI):
    """Configure CORS with restricted origins."""
    if not settings.ENABLE_CORS:
        return
    
    origins = settings.ALLOWED_ORIGINS
    
    if not origins:
        # No CORS if no origins specified
        return
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,  # ✅ Specific origins only
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # ✅ Limited methods
        allow_headers=["Content-Type", "Authorization"],  # ✅ Limited headers
        max_age=3600,  # Preflight cache
        expose_headers=["X-Total-Count"],  # Expose pagination header
    )
```

## 1.3 Security Headers Middleware

**File: `backend/core/security.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.trustedhost import TrustedHostMiddleware

def setup_security_headers(app: FastAPI):
    """Add security headers middleware."""
    
    # Trust proxy headers (for deployed behind load balancer)
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "yourdomain.com", "*.yourdomain.com"]
    )
    
    @app.middleware("http")
    async def add_security_headers(request, call_next):
        response = await call_next(request)
        
        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "  # React needs unsafe-inline
            "style-src 'self' 'unsafe-inline'; "   # Tailwind needs unsafe-inline
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https:"
        )
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # XSS Protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # HSTS (enable only in production with https)
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        
        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response
    
    return app
```

## 1.4 Request Size Limiting

**File: `backend/core/middleware.py`** (add to file)

```python
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware

class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_body_size: int):
        super().__init__(app)
        self.max_body_size = max_body_size
    
    async def dispatch(self, request: Request, call_next):
        if request.method in ("POST", "PUT", "PATCH"):
            if "content-length" in request.headers:
                content_length = int(request.headers["content-length"])
                if content_length > self.max_body_size:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request body too large"}
                    )
        return await call_next(request)

def setup_request_limits(app: FastAPI, max_size: int):
    app.add_middleware(MaxBodySizeMiddleware, max_body_size=max_size)
```

---

# 2. DOCKER SETUP

## 2.1 Backend Dockerfile

**File: `backend/Dockerfile`**

```dockerfile
# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies (very minimal)
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local

# Set Python path
ENV PATH=/root/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/api/health')" || exit 1

# Expose port
EXPOSE 8000

# Run with gunicorn for production
CMD ["gunicorn", "main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
```

**File: `backend/requirements.txt`** (updated)

```
# Existing
fastapi
uvicorn
pymongo
langdetect
python-dotenv
pydantic
email-validator
torch
transformers
scikit-learn
joblib
numpy
python-jose
passlib

# New - Security & Production
gunicorn>=21.0.0
pydantic-settings>=2.0.0
python-multipart>=0.0.6

# New - Rate limiting
slowapi>=0.1.8

# New - Logging
python-json-logger>=2.0.7

# New - Monitoring
prometheus-client>=0.17.0

# New - Testing
pytest>=7.4.0
pytest-asyncio>=0.21.0
httpx>=0.24.0
```

## 2.2 Frontend Dockerfile

**File: `frontend/Dockerfile`**

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Build
RUN npm run build

# Runtime stage (nginx)
FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/

# Copy built app from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/index.html || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

**File: `frontend/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;
    
    # Max body size
    client_max_body_size 10M;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    
    # Root location
    root /usr/share/nginx/html;
    index index.html;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # API proxy (optional)
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 2.3 docker-compose.yml

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: grievance_mongodb
    environment:
      MONGO_INITDB_DATABASE: grievance_db
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"
    networks:
      - grievance_network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: grievance_backend
    environment:
      MONGO_URI: mongodb://mongodb:27017
      DB_NAME: grievance_db
      JWT_SECRET_KEY: ${JWT_SECRET_KEY:-your-secret-key-change-this}
      ADMIN_BOOTSTRAP_KEY: ${ADMIN_BOOTSTRAP_KEY:-your-bootstrap-key}
    depends_on:
      mongodb:
        condition: service_healthy
    ports:
      - "8000:8000"
    networks:
      - grievance_network
    volumes:
      - ./backend:/app  # Dev hot reload
    healthcheck:
      test: curl -f http://localhost:8000/api/health || exit 1
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: grievance_frontend
    depends_on:
      - backend
    ports:
      - "80:80"
    networks:
      - grievance_network
    environment:
      VITE_API_BASE_URL: http://backend:8000/api
    healthcheck:
      test: wget --quiet --tries=1 --spider http://localhost:80/index.html || exit 1
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  mongo_data:

networks:
  grievance_network:
    driver: bridge
```

**File: `docker-compose.prod.yml`**

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: grievance_mongodb_prod
    environment:
      MONGO_INITDB_DATABASE: grievance_db
    volumes:
      - mongo_data_prod:/data/db
    networks:
      - grievance_network_prod
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: grievance_backend_prod
    environment:
      MONGO_URI: ${MONGO_URI}
      DB_NAME: ${DB_NAME}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
      ADMIN_BOOTSTRAP_KEY: ${ADMIN_BOOTSTRAP_KEY}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-https://yourdomain.com}
    depends_on:
      - mongodb
    networks:
      - grievance_network_prod
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: grievance_frontend_prod
    environment:
      VITE_API_BASE_URL: https://api.yourdomain.com
    depends_on:
      - backend
    networks:
      - grievance_network_prod
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  mongo_data_prod:

networks:
  grievance_network_prod:
    driver: bridge
```

---

# 3. UNIT TESTS

## 3.1 Backend API Tests

**File: `backend/tests/conftest.py`**

```python
import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient
import mongomock

from main import app
from database.db import db

@pytest.fixture
def mock_db(monkeypatch):
    """Mock MongoDB with mongomock."""
    client = mongomock.MongoClient()
    mock_db = client["test_grievance"]
    monkeypatch.setattr("database.db.db", mock_db)
    return mock_db

@pytest.fixture
def client(mock_db):
    """FastAPI test client."""
    return TestClient(app)

@pytest.fixture
def sample_user(mock_db):
    """Create sample user for tests."""
    user = {
        "_id": "USR-TEST123456789",
        "name": "Test User",
        "email": "test@example.com",
        "phone": "+919876543210",
        "role": "citizen",
        "password_hash": "$2b$12$...",
    }
    mock_db.users.insert_one(user)
    return user

@pytest.fixture
def sample_admin(mock_db):
    """Create sample admin for tests."""
    admin = {
        "_id": "ADM-TEST123456789",
        "name": "Admin User",
        "email": "admin@example.com",
        "phone": "+919876543210",
        "role": "admin",
        "password_hash": "$2b$12$...",
    }
    mock_db.users.insert_one(admin)
    return admin

@pytest.fixture
def auth_token(client, sample_user):
    """Get JWT token for sample user."""
    # In real tests, you'd call login endpoint
    from services.auth_service import create_access_token
    return create_access_token(
        subject=sample_user["_id"],
        role=sample_user["role"],
        email=sample_user["email"],
        name=sample_user["name"],
    )

@pytest.fixture
def admin_token(client, sample_admin):
    """Get JWT token for sample admin."""
    from services.auth_service import create_access_token
    return create_access_token(
        subject=sample_admin["_id"],
        role=sample_admin["role"],
        email=sample_admin["email"],
        name=sample_admin["name"],
    )
```

**File: `backend/tests/test_auth.py`**

```python
import pytest

def test_register_success(client, mock_db):
    """Test successful user registration."""
    response = client.post(
        "/api/auth/register",
        json={
            "name": "New User",
            "email": "newuser@example.com",
            "phone": "+919876543210",
            "password": "SecurePassword123",
        }
    )
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert "access_token" in response.json()["data"]

def test_register_duplicate_email(client, sample_user):
    """Test registration with duplicate email."""
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Duplicate User",
            "email": sample_user["email"],  # Already exists
            "phone": "+919876543210",
            "password": "SecurePassword123",
        }
    )
    assert response.status_code == 409
    assert "already registered" in response.json()["detail"]

def test_login_success(client, sample_user, monkeypatch):
    """Test successful login."""
    # Mock password verification
    from services import auth_service
    monkeypatch.setattr(
        auth_service,
        "verify_password",
        lambda plain, hashed: plain == "correct_password"
    )
    
    response = client.post(
        "/api/auth/login",
        json={
            "email": sample_user["email"],
            "password": "correct_password",
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()["data"]

def test_login_invalid_credentials(client):
    """Test login with invalid credentials."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "wrong_password",
        }
    )
    assert response.status_code == 401
    assert "Invalid" in response.json()["detail"]

def test_get_current_user(client, auth_token, sample_user):
    """Test getting current user info."""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    assert response.json()["data"]["email"] == sample_user["email"]

def test_get_current_user_invalid_token(client):
    """Test with invalid token."""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
```

**File: `backend/tests/test_complaints.py`**

```python
import pytest

def test_create_complaint_success(client, auth_token, mock_db):
    """Test successful complaint creation."""
    response = client.post(
        "/api/complaints",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "phone": "+919876543210",
            "description": "No water supply for two days",
            "category": "Water",
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 201
    assert response.json()["success"] is True
    assert "complaint_id" in response.json()["data"]
    assert response.json()["data"]["department"] in [
        "Water", "Electricity", "Roads", "Sanitation", "General"
    ]

def test_create_complaint_invalid_input(client, auth_token):
    """Test complaint creation with invalid input."""
    response = client.post(
        "/api/complaints",
        json={
            "name": "X",  # Too short
            "email": "invalid-email",  # Invalid email
            "phone": "123",  # Too short
            "description": "Short",  # Too short
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 422  # Validation error

def test_create_complaint_requires_auth(client):
    """Test that complaint creation requires authentication."""
    response = client.post(
        "/api/complaints",
        json={
            "name": "Test",
            "email": "test@example.com",
            "phone": "+919876543210",
            "description": "Test description",
        }
    )
    assert response.status_code == 403  # Forbidden

def test_get_user_complaints(client, auth_token, sample_user):
    """Test getting user's own complaints."""
    # Create a complaint first
    client.post(
        "/api/complaints",
        json={
            "name": sample_user["name"],
            "email": sample_user["email"],
            "phone": "+919876543210",
            "description": "Test complaint",
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    # Fetch complaints
    response = client.get(
        "/api/complaints/my",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    assert len(response.json()["data"]) >= 1

def test_update_complaint_status_admin_only(client, auth_token, admin_token):
    """Test that only admin can update complaint status."""
    # Create a complaint
    create_response = client.post(
        "/api/complaints",
        json={
            "name": "Test",
            "email": "test@example.com",
            "phone": "+919876543210",
            "description": "Test",
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    complaint_id = create_response.json()["data"]["complaint_id"]
    
    # Try to update as non-admin (should fail)
    response = client.put(
        f"/api/complaints/{complaint_id}/status",
        json={"status": "RESOLVED"},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 403
    
    # Update as admin (should succeed)
    response = client.put(
        f"/api/complaints/{complaint_id}/status",
        json={"status": "RESOLVED"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
```

## 3.2 Run Tests

**File: `backend/pytest.ini`**

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
```

**Command to run:**
```bash
cd backend
pytest -v --cov=. --cov-report=html
```

---

# 4. HINDI TRANSLATION

## 4.1 Translation Service

**File: `backend/services/translation_service.py`**

```python
import logging
from typing import Optional
import requests
from functools import lru_cache
import json
from pathlib import Path

logger = logging.getLogger(__name__)

# Translation API options:
# 1. Google Translate API (requires API key)
# 2. LibreTranslate (open source, self-hosted)
# 3. Microsoft Translator (requires API key)
# 4. Local model (slow but free)

TRANSLATION_CACHE_FILE = Path(__file__).parent.parent / "cache" / "translations.json"

class TranslationService:
    """Handle Hindi to English translation."""
    
    def __init__(self, provider: str = "libre", cache_translations: bool = True):
        self.provider = provider
        self.cache_enabled = cache_translations
        self.cache = self._load_cache()
    
    def _load_cache(self) -> dict:
        """Load translation cache from file."""
        if not TRANSLATION_CACHE_FILE.exists():
            return {}
        
        try:
            with open(TRANSLATION_CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load cache: {e}")
            return {}
    
    def _save_cache(self):
        """Save translation cache to file."""
        if not self.cache_enabled:
            return
        
        try:
            TRANSLATION_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(TRANSLATION_CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"Failed to save cache: {e}")
    
    def translate(self, text: str, source_lang: str = "hi", target_lang: str = "en") -> str:
        """
        Translate text from source to target language.
        
        Args:
            text: Text to translate
            source_lang: Source language code (e.g., 'hi', 'en')
            target_lang: Target language code (e.g., 'en')
        
        Returns:
            Translated text, or original if translation fails
        """
        if source_lang == target_lang:
            return text
        
        # Check cache
        cache_key = f"{source_lang}_{target_lang}_{text}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Get translation
        try:
            if self.provider == "libre":
                translated = self._translate_libretranslate(text, source_lang, target_lang)
            elif self.provider == "google":
                translated = self._translate_google(text, source_lang, target_lang)
            else:
                logger.warning(f"Unknown provider: {self.provider}")
                return text
            
            # Cache result
            if self.cache_enabled:
                self.cache[cache_key] = translated
                self._save_cache()
            
            return translated
        
        except Exception as e:
            logger.error(f"Translation error: {e}")
            return text  # Return original text on failure
    
    def _translate_libretranslate(self, text: str, source: str, target: str) -> str:
        """Translate using LibreTranslate (open source)."""
        url = "https://libretranslate.de/translate"  # Or self-hosted instance
        
        payload = {
            "q": text,
            "source": source,
            "target": target,
        }
        
        try:
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            return response.json()["translatedText"]
        except requests.RequestException as e:
            logger.error(f"LibreTranslate API error: {e}")
            raise
    
    def _translate_google(self, text: str, source: str, target: str) -> str:
        """Translate using Google Translate API."""
        # Requires google-cloud-translate package
        try:
            from google.cloud import translate_v2
            import os
            
            # Set GOOGLE_APPLICATION_CREDENTIALS environment variable
            translate_client = translate_v2.Client()
            result = translate_client.translate_text(
                source_language=source,
                target_language=target,
                text=text
            )
            return result["translatedText"]
        except ImportError:
            raise ValueError("google-cloud-translate not installed")
    
    @lru_cache(maxsize=1000)
    def detect_hinglish(self, text: str) -> bool:
        """Detect if text is Hinglish (Hindi in Latin script)."""
        hinglish_patterns = [
            r'\b(paani|bijli|garbag|rasta|tak|sirf|kya|nahi|hain|hai|aa|ke)\b',
            r'[a-z]{2,}[aeiou]?[gkhmnprst][aeiou]',  # Common Hindi endings
        ]
        
        import re
        text_lower = text.lower()
        for pattern in hinglish_patterns:
            if re.search(pattern, text_lower):
                return True
        return False

# Global instance
_translation_service: Optional[TranslationService] = None

def get_translation_service(
    provider: str = "libre",
    cache_translations: bool = True
) -> TranslationService:
    """Get or create translation service instance."""
    global _translation_service
    
    if _translation_service is None:
        _translation_service = TranslationService(
            provider=provider,
            cache_translations=cache_translations
        )
    
    return _translation_service
```

## 4.2 Updated Preprocessing with Translation

**File: `ml/preprocess.py`** (updated)

```python
from langdetect import detect
from backend.services.translation_service import get_translation_service

def preprocess_pipeline(text: str, translate: bool = True):
    """
    Preprocess complaint text with optional translation.
    
    Args:
        text: Raw complaint text
        translate: Whether to translate non-English text
    
    Returns:
        (processed_text, language)
    """
    language = detect_language(text)
    
    # Translate if needed
    if translate and language != "en":
        try:
            translation_service = get_translation_service()
            text = translation_service.translate(text, source_lang=language, target_lang="en")
            logger.info(f"Translated {language} to English")
        except Exception as e:
            logger.warning(f"Translation failed, using original text: {e}")
            # Continue with original text
    
    cleaned_text = clean_text(text)
    
    return cleaned_text, language
```

---

# 5. MONITORING & LOGGING

## 5.1 Structured Logging

**File: `backend/core/logging.py`**

```python
import logging
import json
from datetime import datetime
import sys

class JSONFormatter(logging.Formatter):
    """Format logs as JSON for centralized logging."""
    
    def format(self, record):
        log_obj = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        
        if hasattr(record, "user_id"):
            log_obj["user_id"] = record.user_id
        
        return json.dumps(log_obj)

def setup_logging(level: str = "INFO"):
    """Setup structured logging for production."""
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # JSON formatter for structured logs
    json_formatter = JSONFormatter()
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(json_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (optional)
    try:
        from pythonjsonlogger import jsonlogger
        file_handler = logging.FileHandler("logs/app.json")
        file_handler.setFormatter(jsonlogger.JsonFormatter())
        root_logger.addHandler(file_handler)
    except ImportError:
        pass
    
    return root_logger

# Usage in main.py
logger = setup_logging()
```

## 5.2 Prometheus Metrics

**File: `backend/core/metrics.py`**

```python
from prometheus_client import Counter, Histogram, Gauge
import time

# Define metrics
request_count = Counter(
    'api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status']
)

request_duration = Histogram(
    'api_request_duration_seconds',
    'API request duration in seconds',
    ['method', 'endpoint']
)

ml_inference_duration = Histogram(
    'ml_inference_duration_seconds',
    'ML inference duration in seconds',
    ['model']
)

active_complaints = Gauge(
    'active_complaints_total',
    'Total number of active complaints'
)

low_confidence_predictions = Counter(
    'low_confidence_predictions_total',
    'Number of low confidence predictions'
)

def metric_middleware(app):
    """Add metrics collection middleware."""
    @app.middleware("http")
    async def collect_metrics(request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        duration = time.time() - start_time
        
        # Record metrics
        request_count.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()
        
        request_duration.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration)
        
        return response
    
    return app

# Usage in main.py
from prometheus_client import make_asgi_app
app.add_route("/metrics", make_asgi_app())
```

---

# 6. RATE LIMITING

## 6.1 Rate Limiting Implementation

**File: `backend/core/rate_limit.py`**

```python
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from functools import wraps

# Create limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],  # Global limit
    storage_uri="memory://",  # Use Redis in production: "redis://localhost"
)

def setup_rate_limiting(app: FastAPI):
    """Setup rate limiting for the app."""
    
    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Too many requests. Please try again later.",
                "retry_after": exc.detail
            }
        )
    
    return limiter

# Usage in routes:
# @router.post("/complaints")
# @limiter.limit("10/minute")
# def create_complaint(request: Request, ...):
#     ...
```

## 6.2 Rate Limit Configuration

**File: `backend/main.py`** (updated)

```python
from core.rate_limit import setup_rate_limiting, limiter

# Setup rate limiting
limiter = setup_rate_limiting(app)

# Apply rate limits to sensitive endpoints
@app.post("/api/auth/login")
@limiter.limit("5/minute")  # Strict limit for login
def login(...):
    ...

@app.post("/api/auth/register")
@limiter.limit("3/minute")  # Strict limit for registration
def register(...):
    ...

@app.post("/api/auth/bootstrap-admin")
@limiter.limit("1/minute")  # Very strict for admin bootstrap
def bootstrap_admin(...):
    ...

@app.post("/api/complaints")
@limiter.limit("30/minute")  # Reasonable limit for submissions
def create_complaint(...):
    ...
```

---

# 7. ERROR HANDLING & AUDIT LOGGING

## 7.1 Audit Logger

**File: `backend/services/audit_service.py`**

```python
import logging
from datetime import datetime
from database.db import db
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class AuditLog(BaseModel):
    timestamp: str
    user_id: str
    action: str
    resource_type: str
    resource_id: str
    changes: dict
    ip_address: str
    status: str
    error_message: Optional[str] = None

class AuditService:
    """Track all significant actions for compliance and debugging."""
    
    @staticmethod
    def log_action(
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        changes: dict = None,
        ip_address: str = "unknown",
        status: str = "success",
        error_message: str = None
    ):
        """Log an action to audit trail."""
        
        audit_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "action": action,  # create, update, delete, read
            "resource_type": resource_type,  # complaint, user, admin
            "resource_id": resource_id,
            "changes": changes or {},
            "ip_address": ip_address,
            "status": status,
            "error_message": error_message,
        }
        
        try:
            db.audit_logs.insert_one(audit_entry)
            logger.info(f"Audit: {action} on {resource_type}/{resource_id} by {user_id}")
        except Exception as e:
            logger.error(f"Failed to log audit entry: {e}")

# Usage in routes:
# @router.put("/complaints/{complaint_id}/status")
# async def update_status(...):
#     try:
#         # ... update code ...
#         AuditService.log_action(
#             user_id=admin_user["_id"],
#             action="update",
#             resource_type="complaint",
#             resource_id=complaint_id,
#             changes={"status": new_status},
#             ip_address=request.client.host
#         )
#     except Exception as e:
#         AuditService.log_action(
#             user_id=admin_user["_id"],
#             action="update",
#             resource_type="complaint",
#             resource_id=complaint_id,
#             status="error",
#             error_message=str(e)
#         )
```

---

# CI/CD SETUP

## GitHub Actions Workflow

**File: `.github/workflows/backend-ci.yml`**

```yaml
name: Backend CI

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'backend/**'
      - '.github/workflows/backend-ci.yml'
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6.0
        options: >-
          --health-cmd="mongosh --eval 'db.runCommand({ ping: 1 })'"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5
        ports:
          - 27017:27017
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      working-directory: backend
      run: |
        pip install -r requirements.txt
        pip install pytest pytest-asyncio httpx
    
    - name: Run tests
      working-directory: backend
      env:
        MONGO_URI: mongodb://localhost:27017
        DB_NAME: test_grievance_db
        JWT_SECRET_KEY: test-secret-key-min-32-chars
      run: pytest -v --cov=. --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml
    
    - name: Lint
      working-directory: backend
      run: |
        pip install pylint
        pylint api/ || true
  
  build:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Build Docker image
      uses: docker/build-push-action@v4
      with:
        context: ./backend
        push: false
        tags: grievance-backend:latest
```

---

END OF PRODUCTION IMPLEMENTATION GUIDE
