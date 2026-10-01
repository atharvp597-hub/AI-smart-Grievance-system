from pydantic import BaseModel, EmailStr, Field, validator


class SendOtpRequest(BaseModel):
    """Request body for sending an OTP email."""

    email: EmailStr

    @validator("email")
    def normalize_email(cls, value: str) -> str:
        return value.lower().strip()


class VerifyOtpRequest(BaseModel):
    """Request body for verifying an OTP."""

    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP")

    @validator("email")
    def normalize_email(cls, value: str) -> str:
        return value.lower().strip()

    @validator("otp")
    def validate_otp_digits(cls, value: str) -> str:
        otp = value.strip()
        if not otp.isdigit() or len(otp) != 6:
            raise ValueError("OTP must be exactly 6 digits")
        return otp
