"""
backend/src/analyzers/threat_analyzer.py — EmoShield
Core NLP threat detection engine.
Detects: Fear · Urgency · Authority · Greed · Trust
Supports: English · Hindi · Marathi
"""

import re


# ── Emotion keyword dictionary ────────────────────────────────────────────────
KEYWORDS = {
    "fear": {
        "weight": 3,
        "en": ["blocked","suspended","arrested","illegal","terminated","locked",
               "criminal","penalty","breach","danger","threat","fraud","compromised",
               "violation","lawsuit","deleted","banned","deactivated"],
        "hi": ["ब्लॉक","निलंबित","गिरफ्तार","अवैध","खतरा","बंद","दंड","कानूनी"],
        "mr": ["ब्लॉक","निलंबित","अटक","बेकायदेशीर","धोका","बंद","दंड"],
    },
    "urgency": {
        "weight": 2,
        "en": ["immediately","urgent","now","act now","hurry","last chance","deadline",
               "expires","within 24","today only","asap","quickly","instant","right away"],
        "hi": ["तुरंत","अभी","जल्दी","आज ही","24 घंटे","तत्काल"],
        "mr": ["तात्काळ","आत्ता","लवकर","आजच","त्वरित"],
    },
    "authority": {
        "weight": 2,
        "en": ["bank","government","admin","official","irs","police","fbi","legal",
               "court","department","ministry","rbi","sbi","income tax","aadhaar",
               "epfo","trai","sebi","authority"],
        "hi": ["बैंक","सरकार","पुलिस","अधिकारी","RBI","SBI","आयकर","न्यायालय"],
        "mr": ["बँक","सरकार","पोलीस","अधिकारी","RBI","SBI","न्यायालय"],
    },
    "greed": {
        "weight": 1,
        "en": ["prize","reward","free","won","winner","cash","gift","bonus","offer",
               "discount","lottery","jackpot","earn","profit","million","crore","lakh",
               "guaranteed","investment"],
        "hi": ["इनाम","मुफ्त","जीत","पुरस्कार","लॉटरी","करोड़","लाख","कैशबैक"],
        "mr": ["बक्षीस","मोफत","जिंकले","पुरस्कार","लॉटरी","कोटी","लाख"],
    },
    "trust": {
        "weight": 1,
        "en": ["verify","confirm","account","password","login","click","link",
               "credentials","otp","kyc","update","secure","personal","details"],
        "hi": ["सत्यापित","पुष्टि","खाता","पासवर्ड","OTP","KYC"],
        "mr": ["सत्यापित","पुष्टी","खाते","पासवर्ड","OTP","KYC"],
    },
}

STOPWORDS = {
    "a","an","the","and","or","but","if","in","on","at","to","for","of","with",
    "by","from","is","are","was","were","be","been","have","has","had","do","does",
    "did","will","would","could","should","may","might","i","you","he","she","it",
    "we","they","me","my","your","this","that","not","no","so","very","also","just",
}
SUFFIXES = ["ingly","edly","ness","ment","tion","sion","ing","ied","ies","ed","er","ly","al","s"]


def _preprocess(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", text.lower())).strip()


def _stem(word: str) -> str:
    if len(word) <= 4: return word
    for s in SUFFIXES:
        if word.endswith(s) and len(word) - len(s) >= 3:
            return word[:-len(s)]
    return word


def detect_emotions(message: str) -> dict:
    """Detect emotional manipulation patterns in a message."""
    clean   = _preprocess(message)
    tokens  = [t for t in clean.split() if t not in STOPWORDS]
    stemmed = " ".join(_stem(t) for t in tokens)
    plain   = " ".join(tokens)
    results = {}

    for emo, data in KEYWORDS.items():
        matched = []

        # English keywords
        for kw in data["en"]:
            sk = _stem(kw)
            if (kw in plain or sk in stemmed) and kw not in matched:
                matched.append(kw)

        # Hindi keywords
        for kw in data.get("hi", []):
            if kw in message and kw not in matched:
                matched.append(kw)

        # Marathi keywords
        for kw in data.get("mr", []):
            if kw in message and kw not in matched:
                matched.append(kw)

        results[emo] = {
            "detected": len(matched) > 0,
            "matched":  matched,
            "count":    len(matched),
            "weight":   data["weight"],
        }

    return results


def calculate_score(emotions: dict) -> dict:
    """Apply weighted scoring formula."""
    breakdown = {}
    total     = 0
    active    = []

    for emo, info in emotions.items():
        pts = info["count"] * info["weight"]
        breakdown[emo] = pts
        total += pts
        if info["detected"]:
            active.append(emo)

    return {"total_score": total, "breakdown": breakdown, "active_emotions": active}


def classify(score_data: dict) -> dict:
    """Map score to risk level and generate recommendation."""
    total  = score_data["total_score"]
    active = score_data["active_emotions"]

    if total >= 7:
        level = "HIGH"
        rec   = "DO NOT click any links or share personal information. Report this message immediately."
    elif total >= 4:
        level = "MEDIUM"
        rec   = "Be cautious. Verify the sender through official channels before taking any action."
    else:
        level = "LOW"
        rec   = "Message appears safe. Stay alert for unexpected requests."

    expl = (
        f"Detected manipulation via: {', '.join(e.capitalize() for e in active)}."
        if active else "No significant manipulation patterns found."
    )

    return {
        "risk_level":      level,
        "recommendation":  rec,
        "explanation":     expl,
        "total_score":     total,
        "breakdown":       score_data["breakdown"],
        "active_emotions": active,
    }


def calculate_intensity(message: str, emotions: dict) -> dict:
    """Score how aggressively manipulation is used."""
    words         = message.split()
    total_w       = max(len(words), 1)
    caps_words    = [w for w in words if w.isupper() and len(w) > 2]
    caps_score    = min((len(caps_words) / total_w) * 100, 30)
    exclaim_score = min(message.count("!") * 5, 20)
    total_kws     = sum(v.get("count", 0) for v in emotions.values() if isinstance(v, dict))
    density_score = min(total_kws * 3, 25)
    num_score     = min(len(re.findall(r'\b\d+\b', message)), 5)
    total         = round(min(caps_score + exclaim_score + density_score + num_score, 100), 1)

    if total >= 70:   level = "EXTREME"
    elif total >= 45: level = "HIGH"
    elif total >= 20: level = "MEDIUM"
    else:             level = "LOW"

    return {"intensity_score": total, "intensity_level": level}


def full_analyze(message: str) -> dict:
    """Run complete EmoShield analysis pipeline."""
    emotions   = detect_emotions(message)
    score_data = calculate_score(emotions)
    result     = classify(score_data)
    intensity  = calculate_intensity(message, emotions)

    result["emotions_detail"]  = emotions
    result["intensity_level"]  = intensity["intensity_level"]
    result["intensity_score"]  = intensity["intensity_score"]
    return result
