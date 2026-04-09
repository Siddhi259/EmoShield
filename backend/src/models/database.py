"""
backend/src/models/database.py — EmoShield
MongoDB connection + document schemas.
"""

import motor.motor_asyncio
from pymongo import ASCENDING, DESCENDING
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr


client = None
db     = None


async def connect_db():
    global client, db
    from src.utils.config import settings
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
    db     = client["emoshield"]

    # Indexes for performance
    await db.users.create_index([("email", ASCENDING)], unique=True)
    await db.scans.create_index([("user_id", ASCENDING)])
    await db.scans.create_index([("created_at", DESCENDING)])
    await db.otp_codes.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)

    print("✅ EmoShield — Connected to MongoDB")
    return db


async def disconnect_db():
    if client:
        client.close()


def get_db():
    return db


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserSchema(BaseModel):
    """User document."""
    id:                  Optional[str]      = Field(default=None, alias="_id")
    email:               EmailStr
    name:                str
    picture:             Optional[str]      = None
    phone:               Optional[str]      = None
    phone_verified:      bool               = False
    google_id:           Optional[str]      = None
    gmail_connected:     bool               = False
    instagram_connected: bool               = False
    whatsapp_connected:  bool               = False
    sms_monitoring:      bool               = False
    auto_scan:           bool               = True
    block_high_risk:     bool               = False
    notify_medium:       bool               = True
    is_active:           bool               = True
    is_verified:         bool               = False
    created_at:          datetime           = Field(default_factory=datetime.utcnow)
    last_login:          Optional[datetime] = None

    class Config:
        populate_by_name     = True
        arbitrary_types_allowed = True


class ScanSchema(BaseModel):
    """Scan result document."""
    id:               Optional[str]  = Field(default=None, alias="_id")
    user_id:          str
    platform:         str
    sender:           Optional[str]  = None
    subject:          Optional[str]  = None
    message:          str
    message_id:       Optional[str]  = None
    risk_level:       str
    risk_score:       int
    active_emotions:  List[str]      = []
    breakdown:        dict           = {}
    explanation:      str            = ""
    recommendation:   str            = ""
    face_detected:    bool           = False
    face_emotion:     Optional[str]  = None
    face_confidence:  float          = 0.0
    combined_score:   float          = 0.0
    correlation:      Optional[str]  = None
    action_taken:     Optional[str]  = None
    created_at:       datetime       = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name     = True
        arbitrary_types_allowed = True
