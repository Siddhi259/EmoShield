"""
backend/src/auth/google_auth.py — EmoShield
Google OAuth2 — handles login with Gmail and Gmail API access.
"""

import httpx
from datetime import datetime
from fastapi import HTTPException

GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO  = "https://www.googleapis.com/oauth2/v2/userinfo"

SCOPES = [
    "openid", "email", "profile",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.readonly",
]


def get_google_auth_url() -> str:
    """Generate Google OAuth URL for the frontend to redirect to."""
    from src.utils.config import settings
    params = {
        "client_id":     settings.GOOGLE_CLIENT_ID,
        "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         " ".join(SCOPES),
        "access_type":   "offline",
        "prompt":        "consent",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GOOGLE_AUTH_URL}?{query}"


async def exchange_code(code: str) -> dict:
    """Exchange OAuth code for access + refresh tokens."""
    from src.utils.config import settings
    async with httpx.AsyncClient() as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "client_id":     settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "code":          code,
            "redirect_uri":  settings.GOOGLE_REDIRECT_URI,
            "grant_type":    "authorization_code",
        })
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Google auth failed")
    return resp.json()


async def get_user_info(access_token: str) -> dict:
    """Get user profile from Google."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GOOGLE_USERINFO,
            headers={"Authorization": f"Bearer {access_token}"}
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to get user info")
    return resp.json()


async def handle_google_callback(code: str, db) -> dict:
    """
    Full callback handler:
    1. Exchange code for tokens
    2. Get user profile
    3. Create or update user in DB
    4. Store Gmail tokens (encrypted)
    5. Return EmoShield JWT tokens
    """
    from src.utils.encryption import encrypt
    from src.auth.jwt_handler import create_access_token, create_refresh_token

    token_data  = await exchange_code(code)
    g_access    = token_data.get("access_token", "")
    g_refresh   = token_data.get("refresh_token", "")

    user_info   = await get_user_info(g_access)
    email       = user_info.get("email", "")
    name        = user_info.get("name", email)
    picture     = user_info.get("picture", "")
    google_id   = user_info.get("id", "")

    existing    = await db.users.find_one({"email": email})
    is_new      = existing is None
    now         = datetime.utcnow()

    if is_new:
        result  = await db.users.insert_one({
            "email":           email,
            "name":            name,
            "picture":         picture,
            "google_id":       google_id,
            "gmail_connected": True,
            "is_active":       True,
            "is_verified":     True,
            "phone_verified":  False,
            "auto_scan":       True,
            "block_high_risk": False,
            "notify_medium":   True,
            "created_at":      now,
            "last_login":      now,
        })
        user_id = str(result.inserted_id)
    else:
        user_id = str(existing["_id"])
        from bson import ObjectId
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"last_login": now, "picture": picture, "gmail_connected": True}}
        )

    # Store Gmail tokens encrypted
    if g_refresh:
        await db.platform_tokens.update_one(
            {"user_id": user_id, "platform": "gmail"},
            {"$set": {
                "user_id":       user_id,
                "platform":      "gmail",
                "access_token":  encrypt(g_access),
                "refresh_token": encrypt(g_refresh),
                "updated_at":    now,
            }},
            upsert=True,
        )

    # Create EmoShield JWT tokens
    payload    = {"sub": user_id, "email": email}
    app_access = create_access_token(payload)
    app_refresh = create_refresh_token(payload)

    from bson import ObjectId
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    user["_id"] = str(user["_id"])

    return {
        "user":          user,
        "access_token":  app_access,
        "refresh_token": app_refresh,
        "is_new_user":   is_new,
    }
