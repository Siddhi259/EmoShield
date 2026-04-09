"""
backend/main.py — EmoShield
FastAPI application — all API routes in one file.

Run:
  uvicorn main:app --reload --port 8000
  Docs: http://localhost:8000/docs
"""

import os, sys
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(__file__))

from src.utils.config   import settings
from src.models.database import connect_db, disconnect_db, get_db
from src.auth.jwt_handler import (
    create_access_token, create_refresh_token,
    verify_token, get_current_user,
)
from src.auth.google_auth  import get_google_auth_url, handle_google_callback
from src.auth.otp_service  import send_otp, verify_otp
from src.analyzers.threat_analyzer import full_analyze
from src.analyzers.face_analyzer   import analyze_face, combine_channels
from src.integrations.gmail_integration     import fetch_and_scan, perform_action
from src.integrations.platform_integrations import (
    get_instagram_oauth_url, connect_instagram, scan_instagram,
    verify_whatsapp_webhook, process_whatsapp_webhook, scan_sms_list,
)


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await disconnect_db()


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="EmoShield API",
    description=(
        "🛡 EmoShield — Centralized Emotion-Aware Multi-Platform Cyber Threat Detection\n\n"
        "Detects phishing and social engineering attacks across Gmail, WhatsApp, "
        "Instagram, and SMS using NLP + Face Emotion AI."
    ),
    version="1.0.0",
    docs_url="/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request schemas ───────────────────────────────────────────────────────────
class ScanRequest(BaseModel):
    message:    str
    platform:   str           = "manual"
    face_image: Optional[str] = None
    sender:     Optional[str] = None
    subject:    Optional[str] = None
    message_id: Optional[str] = None

class BatchRequest(BaseModel):
    messages: List[dict]

class PhoneRequest(BaseModel):
    phone: str

class OTPRequest(BaseModel):
    phone: str
    code:  str

class GmailActionRequest(BaseModel):
    message_id: str
    action:     str

class SMSRequest(BaseModel):
    messages: List[dict]

class SettingsRequest(BaseModel):
    auto_scan:       Optional[bool] = None
    block_high_risk: Optional[bool] = None
    notify_medium:   Optional[bool] = None


# ══════════════════════════════════════════════════════════════════════════════
# INFO
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {"name": "EmoShield API", "version": "1.0.0", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy", "app": "EmoShield", "time": datetime.utcnow().isoformat()}


# ══════════════════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/auth/google/url")
def google_url():
    """Get Google OAuth URL for frontend redirect."""
    return {"url": get_google_auth_url()}

@app.get("/api/v1/auth/google/callback")
async def google_callback(code: str):
    """Handle Google OAuth callback — create/login user, return JWT."""
    db     = get_db()
    result = await handle_google_callback(code, db)
    url    = (
        f"{settings.FRONTEND_URL}/auth/callback"
        f"?access_token={result['access_token']}"
        f"&refresh_token={result['refresh_token']}"
        f"&is_new={result['is_new_user']}"
    )
    return RedirectResponse(url=url)

@app.post("/api/v1/auth/refresh")
async def refresh_token_route(request: Request):
    body    = await request.json()
    ref_tok = body.get("refresh_token", "")
    payload = verify_token(ref_tok, "refresh")
    new_tok = create_access_token({"sub": payload["sub"], "email": payload.get("email","")})
    return {"access_token": new_tok}

@app.post("/api/v1/auth/otp/send")
async def send_otp_route(req: PhoneRequest, user=Depends(get_current_user)):
    """Send OTP SMS to phone number."""
    db = get_db()
    return await send_otp(req.phone, user["_id"], db)

@app.post("/api/v1/auth/otp/verify")
async def verify_otp_route(req: OTPRequest, user=Depends(get_current_user)):
    """Verify OTP and mark phone as verified."""
    db = get_db()
    await verify_otp(req.phone, req.code, db)
    from bson import ObjectId
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"phone": req.phone, "phone_verified": True}}
    )
    return {"message": "Phone verified!", "phone_verified": True}


# ══════════════════════════════════════════════════════════════════════════════
# USER
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/users/me")
async def get_me(user=Depends(get_current_user)):
    """Get current user profile."""
    return {k: v for k, v in user.items() if k != "login_attempts"}

@app.put("/api/v1/users/settings")
async def update_settings(req: SettingsRequest, user=Depends(get_current_user)):
    """Update scan settings."""
    db      = get_db()
    updates = {k: v for k, v in req.dict().items() if v is not None}
    if updates:
        from bson import ObjectId
        await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": updates})
    return {"message": "Settings updated", "updates": updates}

@app.delete("/api/v1/users/me")
async def delete_account(user=Depends(get_current_user)):
    """Delete account and all data (GDPR)."""
    db  = get_db()
    uid = user["_id"]
    from bson import ObjectId
    oid = ObjectId(uid)
    await db.users.delete_one({"_id": oid})
    await db.scans.delete_many({"user_id": uid})
    await db.platform_tokens.delete_many({"user_id": uid})
    await db.otp_codes.delete_many({"user_id": uid})
    return {"message": "Account and all data deleted"}


# ══════════════════════════════════════════════════════════════════════════════
# SCAN
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/scan")
async def scan_single(req: ScanRequest, user=Depends(get_current_user)):
    """Analyze one message. Include face_image for dual-channel analysis."""
    db          = get_db()
    text_result = full_analyze(req.message)
    dual        = None

    if req.face_image:
        face_result = analyze_face(req.face_image)
        if face_result.get("face_detected"):
            dual = combine_channels(text_result, face_result)

    final_risk = dual["final_risk_level"] if dual else text_result["risk_level"]

    scan_doc = {
        "user_id":         user["_id"],
        "platform":        req.platform,
        "sender":          req.sender,
        "subject":         req.subject,
        "message":         req.message[:2000],
        "message_id":      req.message_id,
        "risk_level":      final_risk,
        "risk_score":      text_result["total_score"],
        "active_emotions": text_result["active_emotions"],
        "breakdown":       text_result["breakdown"],
        "explanation":     text_result["explanation"],
        "recommendation":  text_result["recommendation"],
        "face_detected":   bool(dual),
        "face_emotion":    dual["face_emotion"] if dual else None,
        "combined_score":  dual["final_score"]  if dual else 0,
        "correlation":     dual["correlation"]  if dual else None,
        "created_at":      datetime.utcnow(),
    }
    await db.scans.insert_one(scan_doc)

    result = {**text_result, "platform": req.platform, "sender": req.sender}
    if dual:
        result["dual_channel"]      = dual
        result["face_emotion"]      = dual["face_emotion"]
        result["final_risk_level"]  = dual["final_risk_level"]
        result["combined_score"]    = dual["final_score"]

    return result


@app.post("/api/v1/scan/batch")
async def scan_batch(req: BatchRequest, user=Depends(get_current_user)):
    """Analyze multiple messages at once."""
    results = []
    counts  = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for item in req.messages[:50]:
        msg = item.get("message", "")
        if msg.strip():
            an = full_analyze(msg)
            results.append({
                **an,
                "platform": item.get("platform", "manual"),
                "sender":   item.get("sender"),
                "message":  msg[:200],
            })
            counts[an["risk_level"]] = counts.get(an["risk_level"], 0) + 1
    return {"total": len(results), "summary": counts, "results": results}


@app.get("/api/v1/scan/history")
async def get_history(
    limit:     int           = 50,
    platform:  Optional[str] = None,
    risk_level:Optional[str] = None,
    user=Depends(get_current_user),
):
    """Get scan history with optional filters."""
    db    = get_db()
    query = {"user_id": user["_id"]}
    if platform:   query["platform"]   = platform
    if risk_level: query["risk_level"] = risk_level

    cursor = db.scans.find(query).sort("created_at", -1).limit(min(limit, 200))
    scans  = []
    async for s in cursor:
        s["_id"] = str(s["_id"])
        scans.append(s)

    return {"total": len(scans), "scans": scans}


@app.get("/api/v1/stats")
async def get_stats(user=Depends(get_current_user)):
    """Get aggregate stats for current user."""
    db  = get_db()
    uid = user["_id"]

    total  = await db.scans.count_documents({"user_id": uid})
    high   = await db.scans.count_documents({"user_id": uid, "risk_level": "HIGH"})
    medium = await db.scans.count_documents({"user_id": uid, "risk_level": "MEDIUM"})
    low    = await db.scans.count_documents({"user_id": uid, "risk_level": "LOW"})

    platforms = {}
    for p in ["gmail","whatsapp","instagram","sms","manual"]:
        platforms[p] = await db.scans.count_documents({"user_id": uid, "platform": p})

    emo_counts = {}
    async for s in db.scans.find({"user_id": uid}, {"active_emotions": 1}):
        for e in s.get("active_emotions", []):
            emo_counts[e] = emo_counts.get(e, 0) + 1

    top_emotions = sorted(emo_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    total_score  = 0
    async for s in db.scans.find({"user_id": uid}, {"risk_score": 1}):
        total_score += s.get("risk_score", 0)

    return {
        "total":        total,
        "by_risk":      {"HIGH": high, "MEDIUM": medium, "LOW": low},
        "by_platform":  platforms,
        "top_emotions": top_emotions,
        "avg_score":    round(total_score / total, 2) if total > 0 else 0,
    }


# ══════════════════════════════════════════════════════════════════════════════
# GMAIL
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/gmail/scan")
async def gmail_scan(
    max_results: int  = 20,
    unread_only: bool = True,
    user=Depends(get_current_user),
):
    """Fetch and scan Gmail inbox."""
    db     = get_db()
    emails = await fetch_and_scan(user["_id"], db, max_results, unread_only)
    for e in emails:
        if e["risk_level"] in ("HIGH", "MEDIUM"):
            await db.scans.insert_one({
                "user_id": user["_id"], **e, "created_at": datetime.utcnow()
            })
    counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for e in emails:
        counts[e["risk_level"]] = counts.get(e["risk_level"], 0) + 1
    return {"total": len(emails), "summary": counts, "emails": emails}


@app.post("/api/v1/gmail/action")
async def gmail_action_route(req: GmailActionRequest, user=Depends(get_current_user)):
    """Perform action on Gmail message (spam/trash/label)."""
    db = get_db()
    ok = await perform_action(user["_id"], req.message_id, req.action, db)
    if not ok:
        raise HTTPException(status_code=400, detail="Gmail action failed")
    return {"message": f"Action '{req.action}' done", "message_id": req.message_id}


# ══════════════════════════════════════════════════════════════════════════════
# INSTAGRAM
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/instagram/auth-url")
def instagram_auth_url():
    return {"url": get_instagram_oauth_url()}

@app.get("/api/v1/instagram/callback")
async def instagram_callback(code: str, user=Depends(get_current_user)):
    db = get_db()
    return await connect_instagram(code, user["_id"], db)

@app.get("/api/v1/instagram/scan")
async def instagram_scan_route(user=Depends(get_current_user)):
    db  = get_db()
    res = await scan_instagram(user["_id"], db)
    return {"total": len(res), "results": res}


# ══════════════════════════════════════════════════════════════════════════════
# WHATSAPP
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/whatsapp/webhook")
async def wa_verify(
    hub_mode: str = None,
    hub_verify_token: str = None,
    hub_challenge: str = None,
):
    challenge = await verify_whatsapp_webhook(hub_mode, hub_verify_token, hub_challenge)
    if challenge:
        return Response(content=challenge)
    raise HTTPException(status_code=403, detail="Verification failed")

@app.post("/api/v1/whatsapp/webhook")
async def wa_receive(request: Request, user=Depends(get_current_user)):
    db      = get_db()
    payload = await request.json()
    results = await process_whatsapp_webhook(payload, user["_id"], db)
    return {"processed": len(results), "results": results}


# ══════════════════════════════════════════════════════════════════════════════
# SMS
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/sms/scan")
async def sms_scan_route(req: SMSRequest, user=Depends(get_current_user)):
    """Scan uploaded SMS messages for threats."""
    db      = get_db()
    results = await scan_sms_list(req.messages)
    for r in results:
        if r["risk_level"] == "HIGH":
            await db.scans.insert_one({"user_id": user["_id"], **r, "created_at": datetime.utcnow()})
    counts = {"HIGH":0,"MEDIUM":0,"LOW":0}
    for r in results:
        counts[r["risk_level"]] = counts.get(r["risk_level"], 0) + 1
    return {"total": len(results), "summary": counts, "results": results}
