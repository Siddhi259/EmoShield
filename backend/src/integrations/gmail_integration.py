"""
backend/src/integrations/gmail_integration.py — EmoShield
Gmail API — fetch, analyze, and act on emails.
"""

import base64
from datetime import datetime
from typing import List, Optional

from src.utils.encryption import decrypt, encrypt
from src.analyzers.threat_analyzer import full_analyze


async def _build_service(user_id: str, db):
    """Build authenticated Gmail service for a user."""
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials
    from src.utils.config import settings

    token = await db.platform_tokens.find_one(
        {"user_id": user_id, "platform": "gmail"}
    )
    if not token:
        return None

    creds = Credentials(
        token=decrypt(token["access_token"]),
        refresh_token=decrypt(token.get("refresh_token", "")),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
    )

    if creds.expired and creds.refresh_token:
        from google.auth.transport.requests import Request
        creds.refresh(Request())
        await db.platform_tokens.update_one(
            {"user_id": user_id, "platform": "gmail"},
            {"$set": {"access_token": encrypt(creds.token), "updated_at": datetime.utcnow()}}
        )

    return build("gmail", "v1", credentials=creds)


def _extract_body(payload: dict) -> str:
    """Pull plain text from email payload."""
    mime = payload.get("mimeType", "")
    if mime == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    elif "multipart" in mime:
        for part in payload.get("parts", []):
            if part.get("mimeType") == "text/plain":
                data = part.get("body", {}).get("data", "")
                if data:
                    return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    return ""


async def fetch_and_scan(user_id: str, db, max_results: int = 20,
                          unread_only: bool = True) -> List[dict]:
    """Fetch Gmail messages and run EmoShield analysis on each."""
    service = await _build_service(user_id, db)
    if not service:
        return []

    try:
        labels = ["INBOX", "UNREAD"] if unread_only else ["INBOX"]
        result = service.users().messages().list(
            userId="me", labelIds=labels,
            maxResults=min(max_results, 50)
        ).execute()
        refs   = result.get("messages", [])
        output = []

        for ref in refs:
            try:
                msg = service.users().messages().get(
                    userId="me", id=ref["id"], format="full"
                ).execute()
                headers = {h["name"]: h["value"]
                           for h in msg.get("payload", {}).get("headers", [])}
                subject = headers.get("Subject", "")[:200]
                sender  = headers.get("From", "")[:200]
                body    = _extract_body(msg.get("payload", {}))[:3000]
                text    = f"{subject}\n\n{body}".strip()
                an      = full_analyze(text)
                output.append({
                    "platform":        "gmail",
                    "message_id":      ref["id"],
                    "subject":         subject,
                    "sender":          sender,
                    "snippet":         body[:200],
                    "risk_level":      an["risk_level"],
                    "risk_score":      an["total_score"],
                    "active_emotions": an["active_emotions"],
                    "explanation":     an["explanation"],
                    "recommendation":  an["recommendation"],
                    "intensity":       an["intensity_level"],
                })
            except Exception:
                continue

        return output
    except Exception as e:
        print(f"EmoShield Gmail error: {e}")
        return []


async def perform_action(user_id: str, message_id: str,
                          action: str, db) -> bool:
    """
    Act on a Gmail message.
    action: 'spam' | 'trash' | 'label_high' | 'label_medium'
    """
    service = await _build_service(user_id, db)
    if not service:
        return False
    try:
        if action == "spam":
            service.users().messages().modify(
                userId="me", id=message_id,
                body={"addLabelIds": ["SPAM"], "removeLabelIds": ["INBOX"]}
            ).execute()
        elif action == "trash":
            service.users().messages().trash(userId="me", id=message_id).execute()
        elif action in ("label_high", "label_medium"):
            name = "EmoShield-HIGH" if action == "label_high" else "EmoShield-MEDIUM"
            lid  = await _get_or_create_label(service, name)
            if lid:
                service.users().messages().modify(
                    userId="me", id=message_id,
                    body={"addLabelIds": [lid]}
                ).execute()
        return True
    except Exception as e:
        print(f"EmoShield Gmail action error: {e}")
        return False


async def _get_or_create_label(service, name: str) -> Optional[str]:
    """Get or create Gmail label, returns label ID."""
    try:
        for lbl in service.users().labels().list(userId="me").execute().get("labels", []):
            if lbl["name"] == name:
                return lbl["id"]
        color = "#CC0000" if "HIGH" in name else "#E67300"
        created = service.users().labels().create(
            userId="me",
            body={"name": name, "labelListVisibility": "labelShow",
                  "messageListVisibility": "show",
                  "color": {"backgroundColor": color, "textColor": "#FFFFFF"}}
        ).execute()
        return created["id"]
    except Exception:
        return None
