from typing import Dict, Any
import random

DISEASE_DB = {
    "rust": {
        "disease_detected": "Leaf Rust (Puccinia triticina)",
        "confidence": 0.87,
        "severity": "Moderate–High",
        "recommendation": "Apply Propiconazole 25% EC at 200 ml/acre within 48 hours. Repeat after 14 days if symptoms persist. Avoid overhead irrigation.",
        "prevention": "Use rust-resistant varieties. Ensure proper field hygiene post-harvest.",
    },
    "yellow": {
        "disease_detected": "Nitrogen Deficiency / Yellow Mosaic",
        "confidence": 0.81,
        "severity": "Moderate",
        "recommendation": "Apply 25–30 kg urea/acre immediately. Follow up with foliar spray of 2% urea solution after 7 days.",
        "prevention": "Conduct soil testing before sowing. Maintain optimal pH (6.0–7.5).",
    },
    "blight": {
        "disease_detected": "Early Blight (Alternaria solani)",
        "confidence": 0.79,
        "severity": "Moderate",
        "recommendation": "Apply Mancozeb 75% WP at 600 g/acre. Improve drainage to reduce leaf wetness duration.",
        "prevention": "Crop rotation every 2–3 years. Remove infected plant debris.",
    },
    "spot": {
        "disease_detected": "Leaf Spot (Helminthosporium spp.)",
        "confidence": 0.75,
        "severity": "Low–Moderate",
        "recommendation": "Apply Carbendazim 50% WP at 250 g/acre. Spray during cooler hours (early morning).",
        "prevention": "Avoid excess nitrogen. Maintain proper plant spacing for airflow.",
    },
    "wilt": {
        "disease_detected": "Fusarium Wilt",
        "confidence": 0.82,
        "severity": "High",
        "recommendation": "No curative chemical treatment available. Remove and destroy infected plants immediately. Apply Trichoderma viride at 5 kg/acre to remaining crop.",
        "prevention": "Use certified disease-free seeds. Soil solarization before planting.",
    },
}

HEALTHY_RESPONSE = {
    "disease_detected": "No Disease Detected",
    "confidence": 0.92,
    "severity": "None",
    "recommendation": "Crop appears healthy. Continue regular monitoring every 5–7 days. Maintain current irrigation and fertilization schedule.",
    "prevention": "Keep field weed-free. Monitor for early signs of pest activity.",
}


def detect_disease(filename: str, file_size: int = 0) -> Dict[str, Any]:
    filename_lower = filename.lower()

    for keyword, data in DISEASE_DB.items():
        if keyword in filename_lower:
            return {**data, "analysis_method": "MVP Pattern Analysis (filename-based)"}

    # Simulate slight randomness for demo realism
    if file_size > 0 and file_size % 7 == 0:
        disease_key = random.choice(list(DISEASE_DB.keys()))
        data = DISEASE_DB[disease_key]
        return {
            **data,
            "confidence": round(data["confidence"] - 0.15, 2),
            "analysis_method": "MVP Pattern Analysis (image-based placeholder)",
        }

    return {**HEALTHY_RESPONSE, "analysis_method": "MVP Pattern Analysis (image-based placeholder)"}