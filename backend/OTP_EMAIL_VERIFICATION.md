# OTP Email Verification with FastAPI + Resend

This backend now includes a complete OTP email verification flow that is ready for React frontend integration.

## Install

```bash
cd backend
pip install -r requirements.txt
```

## Run with Uvicorn

```bash
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Stable Windows Run Command

```bash
cd backend
python run_server.py
```

## Folder Structure

```text
backend/
|-- .env
|-- .env.example
|-- OTP_EMAIL_VERIFICATION.md
|-- config.py
|-- main.py
|-- requirements.txt
|-- run_server.py
|-- database/
|   |-- db.py
|-- models/
|   |-- auth_model.py
|   |-- complaint_model.py
|   |-- otp_model.py
|-- routes/
|   |-- admin.py
|   |-- auth.py
|   |-- complaint.py
|   |-- otp.py
|   |-- realtime.py
|-- services/
|   |-- ai_service.py
|   |-- auth_service.py
|   |-- gemini_service.py
|   |-- inference_service.py
|   |-- otp_service.py
|   |-- preprocess.py
|   |-- ws_manager.py
|-- utils/
|   |-- helpers.py
```

## Environment Variables

Required:

```env
RESEND_API_KEY=re_xxxxxxxxx
```

Recommended:

```env
RESEND_FROM_EMAIL=Acme <onboarding@resend.dev>
```

Local development fallback:

```env
OTP_DEV_MODE=true
OTP_INCLUDE_DEBUG_OTP=true
```

When dev mode is enabled and Resend is not configured, the API still generates/stores OTPs and returns `debug_otp` in the response for local testing.

## API Endpoints

### `POST /send-otp`

Request:

```json
{
  "email": "user@example.com"
}
```

Success response:

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "email": "user@example.com",
    "expires_in_seconds": 300,
    "cooldown_seconds": 60,
    "provider_message_id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794",
    "delivery_mode": "resend"
  }
}
```

Dev-mode success response:

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "email": "user@example.com",
    "expires_in_seconds": 300,
    "cooldown_seconds": 60,
    "provider_message_id": null,
    "delivery_mode": "dev-mode",
    "debug_otp": "123456"
  }
}
```

Cooldown response:

```json
{
  "success": false,
  "message": "OTP was sent recently. Please wait before requesting another one.",
  "data": {
    "retry_after_seconds": 42,
    "cooldown_seconds": 60
  }
}
```

### `POST /verify-otp`

Request:

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

Success response:

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "email": "user@example.com",
    "verified": true
  }
}
```

Invalid OTP response:

```json
{
  "success": false,
  "message": "Invalid OTP.",
  "data": {
    "attempts_left": 4
  }
}
```

Expired OTP response:

```json
{
  "success": false,
  "message": "OTP has expired. Please request a new OTP.",
  "data": {}
}
```

## Frontend Integration Notes

- Call `POST /send-otp` when the user submits their email.
- Disable the resend button for `cooldown_seconds`.
- Call `POST /verify-otp` with the entered 6-digit code.
- If verification succeeds, continue signup/login flow in React.

## Implementation Notes

- OTPs are persisted in MongoDB with TTL auto-expiry (no data loss on restart).
- OTPs expire in 5 minutes.
- OTP resends are blocked for 60 seconds.
- Each OTP allows a maximum of 5 verification attempts.
- OTPs are deleted after successful verification.
- The email send path uses the official Resend Python SDK.
