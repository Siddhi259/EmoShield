"""
backend/src/analyzers/face_analyzer.py — EmoShield
Face emotion detection from base64 webcam image.
Tries DeepFace → FER → OpenCV fallback.
"""

import base64
import io
import numpy as np

FACE_WEIGHTS = {
    "fear": 0.95, "angry": 0.75, "disgust": 0.65,
    "surprise": 0.55, "sad": 0.40, "contempt": 0.30,
    "neutral": 0.10, "happy": 0.05,
}


def analyze_face(image_b64: str) -> dict:
    """Analyze face emotion from base64 image string."""
    result = {
        "dominant_emotion": "neutral",
        "emotion_scores":   {},
        "confidence":       0.0,
        "face_detected":    False,
        "error":            None,
    }

    # Decode image
    try:
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]
        img_bytes = base64.b64decode(image_b64)
        from PIL import Image
        img   = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        arr   = np.array(img)
    except Exception as e:
        result["error"] = f"Image decode error: {e}"
        return result

    # Try DeepFace
    try:
        from deepface import DeepFace
        analysis = DeepFace.analyze(
            img_path=arr, actions=["emotion"],
            enforce_detection=False, silent=True,
        )
        if isinstance(analysis, list): analysis = analysis[0]
        emotions   = analysis.get("emotion", {})
        dominant   = analysis.get("dominant_emotion", "neutral")
        result.update({
            "dominant_emotion": dominant,
            "emotion_scores":   {k: round(v, 1) for k, v in emotions.items()},
            "confidence":       round(emotions.get(dominant, 0.0), 1),
            "face_detected":    True,
        })
        return result
    except ImportError:
        pass
    except Exception as e:
        result["error"] = str(e)

    # Try FER
    try:
        from fer import FER
        import cv2
        bgr   = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
        faces = FER(mtcnn=False).detect_emotions(bgr)
        if faces:
            emo_dict = faces[0].get("emotions", {})
            dominant = max(emo_dict, key=emo_dict.get) if emo_dict else "neutral"
            result.update({
                "dominant_emotion": dominant,
                "emotion_scores":   {k: round(v*100, 1) for k, v in emo_dict.items()},
                "confidence":       round(emo_dict.get(dominant, 0) * 100, 1),
                "face_detected":    True,
            })
        return result
    except ImportError:
        pass
    except Exception:
        pass

    # OpenCV basic face detection
    try:
        import cv2
        gray    = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces   = cascade.detectMultiScale(gray, 1.1, 4)
        result.update({
            "face_detected":    len(faces) > 0,
            "dominant_emotion": "neutral",
            "confidence":       50.0 if len(faces) > 0 else 0.0,
        })
    except Exception:
        pass

    return result


def combine_channels(text_result: dict, face_result: dict) -> dict:
    """
    Combine text analysis + face emotion into final dual-channel score.
    Formula: 65% text weight + 35% face weight
    """
    text_risk  = text_result.get("risk_level", "LOW")
    text_score = text_result.get("total_score", 0)
    face_emo   = face_result.get("dominant_emotion", "neutral")
    face_conf  = face_result.get("confidence", 0.0)
    face_det   = face_result.get("face_detected", False)

    text_pct   = min((text_score / 20.0) * 100, 100)
    face_wt    = FACE_WEIGHTS.get(face_emo, 0.1)
    face_score = face_wt * face_conf

    text_high  = text_risk == "HIGH"
    face_high  = face_emo in ("fear", "angry", "surprise", "disgust")

    if text_high and face_high:
        corr, boost = "CONFIRMED", 1.25
        desc = "Both text and face confirm this is an attack. High confidence threat."
    elif text_high and not face_high:
        corr, boost = "TEXT_ONLY", 0.90
        desc = "Text flags HIGH risk. Face appears calm — you may already recognise this scam."
    elif not text_high and face_high:
        corr, boost = "FACE_OVERRIDE", 1.10
        desc = "Text score is low but face shows stress — subtle manipulation may be present."
    else:
        corr, boost = "BOTH_SAFE", 0.85
        desc = "Both channels indicate safe message."

    combined = (text_pct * 0.65 + face_score * 0.35 if face_det else text_pct)
    combined = round(min(combined * boost, 100), 1)

    if corr == "CONFIRMED":            final = "HIGH"
    elif corr == "BOTH_SAFE":          final = "LOW"
    elif combined >= 55:               final = "HIGH"
    elif combined >= 30:               final = "MEDIUM"
    else:                              final = "LOW"

    return {
        "final_risk_level": final,
        "final_score":      combined,
        "correlation":      corr,
        "correlation_desc": desc,
        "text_risk":        text_risk,
        "text_score_pct":   round(text_pct, 1),
        "face_score":       round(face_score, 1),
        "face_emotion":     face_emo,
        "face_confidence":  face_conf,
        "face_detected":    face_det,
        "channels_agree":   text_high == face_high,
    }
