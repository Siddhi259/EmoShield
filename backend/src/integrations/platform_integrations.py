"""
backend/src/integrations/platform_integrations.py — EmoShield
WhatsApp, Instagram, and SMS integrations.
"""

import httpx
from datetime import datetime
from typing import List
from src.utils.encryption import decrypt, encrypt
from src.analyzers.threat_analyzer import full_analyze


# ── Instagram ─────────────────────────────────────────────────────────────────

def get_instagram_oauth_url() -> str:
    from src.utils.config import settings
    params = {
        "client_id":     settings.INSTAGRAM_CLIENT_ID,
        "redirect_uri":  settings.INSTAGRAM_REDIRECT_URI,
        "scope":         "user_profile,user_media",
        "response_type": "code",
    }
    q = "&".join(f"{k}={v}" for k, v in params.items())
    return f"https://api.instagram.com/oauth/authorize?{q}"


async def connect_instagram(code: str, user_id: str, db) -> dict:
    from src.utils.config import settings
    async with httpx.AsyncClient() as c:
        resp = await c.post(
            "https://api.instagram.com/oauth/access_token",
            data={"client_id": settings.INSTAGRAM_CLIENT_ID,
                  "client_secret": settings.INSTAGRAM_CLIENT_SECRET,
                  "grant_type": "authorization_code",
                  "redirect_uri": settings.INSTAGRAM_REDIRECT_URI,
                  "code": code}
        )
        if resp.status_code != 200:
            return {"success": False, "error": resp.text}
        token_data   = resp.json()
        short_token  = token_data.get("access_token", "")
        instagram_id = token_data.get("user_id", "")

        # Exchange for long-lived token
        ll = await c.get(
            "https://graph.instagram.com/access_token",
            params={"grant_type": "ig_exchange_token",
                    "client_secret": settings.INSTAGRAM_CLIENT_SECRET,
                    "access_token": short_token}
        )
        long_token = ll.json().get("access_token", short_token) if ll.status_code == 200 else short_token

        # Get username
        prof = await c.get(
            f"https://graph.instagram.com/me",
            params={"fields": "id,username", "access_token": long_token}
        )
        username = prof.json().get("username", "") if prof.status_code == 200 else ""

    await db.platform_tokens.update_one(
        {"user_id": user_id, "platform": "instagram"},
        {"$set": {"user_id": user_id, "platform": "instagram",
                  "access_token": encrypt(long_token),
                  "meta": {"instagram_id": str(instagram_id), "username": username},
                  "updated_at": datetime.utcnow()}},
        upsert=True,
    )
    from bson import ObjectId
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"instagram_connected": True}}
    )
    return {"success": True, "username": username}


async def scan_instagram(user_id: str, db) -> List[dict]:
    """Scan Instagram comments/captions for threats."""
    token_doc = await db.platform_tokens.find_one(
        {"user_id": user_id, "platform": "instagram"}
    )
    if not token_doc:
        return []

    token   = decrypt(token_doc["access_token"])
    ig_id   = token_doc.get("meta", {}).get("instagram_id", "me")
    results = []

    async with httpx.AsyncClient() as c:
        try:
            resp = await c.get(
                f"https://graph.instagram.com/{ig_id}/media",
                params={"fields": "id,caption,timestamp,comments{text,from}",
                        "access_token": token, "limit": 20}
            )
            if resp.status_code != 200:
                return []

            for item in resp.json().get("data", []):
                for comment in item.get("comments", {}).get("data", []):
                    text = comment.get("text", "")
                    if text and len(text) > 5:
                        an = full_analyze(text)
                        results.append({
                            "platform":        "instagram",
                            "message_id":      comment.get("id", ""),
                            "sender":          comment.get("from", {}).get("username", ""),
                            "message":         text[:300],
                            "risk_level":      an["risk_level"],
                            "risk_score":      an["total_score"],
                            "active_emotions": an["active_emotions"],
                            "explanation":     an["explanation"],
                            "recommendation":  an["recommendation"],
                        })
        except Exception as e:
            print(f"EmoShield Instagram error: {e}")

    return results


# ── WhatsApp Webhook ───────────────────────────────────────────────────────────

async def verify_whatsapp_webhook(mode: str, token: str, challenge: str):
    from src.utils.config import settings
    if mode == "subscribe" and token == settings.WHATSAPP_VERIFY_TOKEN:
        return challenge
    return None


async def process_whatsapp_webhook(payload: dict, user_id: str, db) -> List[dict]:
    """Process incoming WhatsApp message webhook."""
    results = []
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            messages = change.get("value", {}).get("messages", [])
            for msg in messages:
                if msg.get("type") != "text":
                    continue
                text   = msg.get("text", {}).get("body", "")
                sender = msg.get("from", "Unknown")
                if not text.strip():
                    continue
                an = full_analyze(text)
                r  = {
                    "platform":        "whatsapp",
                    "message_id":      msg.get("id", ""),
                    "sender":          sender,
                    "message":         text[:500],
                    "risk_level":      an["risk_level"],
                    "risk_score":      an["total_score"],
                    "active_emotions": an["active_emotions"],
                    "explanation":     an["explanation"],
                    "recommendation":  an["recommendation"],
                }
                results.append(r)
                await db.scans.insert_one({
                    **r, "user_id": user_id, "created_at": datetime.utcnow()
                })
    return results


# ── SMS ───────────────────────────────────────────────────────────────────────

async def scan_sms_list(messages: List[dict]) -> List[dict]:
    """Scan list of SMS messages for threats."""
    results = []
    for sms in messages:
        body = sms.get("body", "")
        if not body.strip():
            continue
        an = full_analyze(body)
        results.append({
            "platform":        "sms",
            "sender":          sms.get("from", "Unknown"),
            "message":         body[:500],
            "date":            sms.get("date", ""),
            "risk_level":      an["risk_level"],
            "risk_score":      an["total_score"],
            "active_emotions": an["active_emotions"],
            "explanation":     an["explanation"],
            "recommendation":  an["recommendation"],
        })
    return results
