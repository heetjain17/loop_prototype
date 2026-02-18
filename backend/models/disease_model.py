from typing import Dict, Any
import random
from translations import DISEASE_DB_TRANS  # Import translations

DISEASE_DB = {
    "rust": {
        "confidence": 0.87,
        "severity": "Moderate–High",
    },
    "yellow": {
        "confidence": 0.81,
        "severity": "Moderate",
    },
    "blight": {
        "confidence": 0.79,
        "severity": "Moderate",
    },
    "spot": {
        "confidence": 0.75,
        "severity": "Low–Moderate",
    },
    "wilt": {
        "confidence": 0.82,
        "severity": "High",
    },
}

def detect_disease(filename: str, file_size: int = 0, lang: str = "en") -> Dict[str, Any]:
    filename_lower = filename.lower()
    lang = lang if lang in ["en", "hi"] else "en"
    trans_db = DISEASE_DB_TRANS.get(lang, DISEASE_DB_TRANS["en"])

    for keyword, base_data in DISEASE_DB.items():
        if keyword in filename_lower:
            trans_data = trans_db.get(keyword, trans_db["none"])
            return {
                **base_data,
                "disease_detected": trans_data["disease_detected"],
                "recommendation": trans_data["recommendation"],
                "prevention": trans_data["prevention"],
                "analysis_method": "MVP Pattern Analysis (filename-based)"
            }

    # Simulate slight randomness for demo realism
    if file_size > 0 and file_size % 7 == 0:
        disease_key = random.choice(list(DISEASE_DB.keys()))
        base_data = DISEASE_DB[disease_key]
        trans_data = trans_db.get(disease_key)
        return {
            **base_data,
            "disease_detected": trans_data["disease_detected"],
            "recommendation": trans_data["recommendation"],
            "prevention": trans_data["prevention"],
            "confidence": round(base_data["confidence"] - 0.15, 2),
            "analysis_method": "MVP Pattern Analysis (image-based placeholder)",
        }

    healthy = trans_db["none"]
    return {
        "disease_detected": healthy["disease_detected"],
        "confidence": 0.92,
        "severity": "None",
        "recommendation": healthy["recommendation"],
        "prevention": healthy["prevention"],
        "analysis_method": "MVP Pattern Analysis (image-based placeholder)"
    }