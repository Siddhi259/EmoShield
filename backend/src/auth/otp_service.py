"""
backend/src/auth/otp_service.py — EmoShield
SMS OTP generation and verification via Twilio.
- 6-digit code
- 10 minute expiry
- Max 3 attempts
- Rate limited: max 3 OTPs per 10 minutes per phone
"""

from datetime import datetime, timedelta
from fastapi import HTTPException

MAX_ATTEMPTS   = 3
MAX_PER_WINDOW = 3


async def send_otp(phone: str, user_id: str, db) -> dict:
    """Generate and send OTP to phone number via SMS."""
    from src.utils.config import settings
    from src.utils.encryption import generate_otp, hash_phone

    phone_hash = hash_phone(phone)

    # Rate limit check
    recent = await db.otp_codes.count_documents({
        "phone_hash": phone_hash,
        "created_at": {"$gte": datetime.utcnow() - timedelta(minutes=10)},
    })
    if recent >= MAX_PER_WINDOW:
        raise HTTPException(
            status_code=429,
            detail="Too many OTP requests. Wait 10 minutes."
        )

    code       = generate_otp(6)
    expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    await db.otp_codes.insert_one({
        "phone_hash": phone_hash,
        "user_id":    user_id,
        "code":       code,
        "attempts":   0,
        "expires_at": expires_at,
        "used":       False,
        "created_at": datetime.utcnow(),
    })

    # Send SMS
    if settings.TWILIO_ACCOUNT_SID:
        from twilio.rest import Client
        try:
            Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN).messages.create(
                body=(f"Your EmoShield verification code: {code}\n"
                      f"Valid {settings.OTP_EXPIRE_MINUTES} mins. Do not share."),
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"SMS send failed: {e}")
    else:
        # Dev mode — print OTP
        print(f"\n📱 [EmoShield DEV] OTP for {phone}: {code}\n")

    return {
        "message":    "OTP sent successfully",
        "expires_in": settings.OTP_EXPIRE_MINUTES * 60,
        "hint":       f"{phone[:3]}****{phone[-2:]}",
    }


async def verify_otp(phone: str, code: str, db) -> bool:
    """Verify OTP. Returns True on success, raises on failure."""
    from src.utils.encryption import hash_phone

    phone_hash = hash_phone(phone)
    otp_doc = await db.otp_codes.find_one(
        {
            "phone_hash": phone_hash,
            "used":       False,
            "expires_at": {"$gt": datetime.utcnow()},
        },
        sort=[("created_at", -1)],
    )

    if not otp_doc:
        raise HTTPException(status_code=400, detail="OTP expired or not found. Request a new one.")

    if otp_doc["attempts"] >= MAX_ATTEMPTS:
        raise HTTPException(status_code=400, detail="Too many wrong attempts. Request a new OTP.")

    await db.otp_codes.update_one(
        {"_id": otp_doc["_id"]},
        {"$inc": {"attempts": 1}}
    )

    if otp_doc["code"] != code:
        remaining = MAX_ATTEMPTS - otp_doc["attempts"] - 1
        raise HTTPException(
            status_code=400,
            detail=f"Wrong OTP. {remaining} attempts left."
        )

    await db.otp_codes.update_one(
        {"_id": otp_doc["_id"]},
        {"$set": {"used": True}}
    )
    return True
