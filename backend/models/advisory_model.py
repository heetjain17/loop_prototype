import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from typing import Dict, Any, Tuple

CROP_STAGES = [
    "Germination", "Vegetative", "Tillering",
    "Jointing", "Tasseling", "Silking", "Flowering", "Maturity"
]

stage_encoder = LabelEncoder()
stage_encoder.fit(CROP_STAGES)


def generate_synthetic_data(n_samples: int = 2000) -> pd.DataFrame:
    np.random.seed(42)
    rows = []
    for _ in range(n_samples):
        soil_moisture = np.random.uniform(10, 80)
        temperature = np.random.uniform(15, 45)
        humidity = np.random.uniform(30, 95)
        rainfall = np.random.uniform(0, 50)
        stage_idx = np.random.randint(0, len(CROP_STAGES))
        crop_stage_encoded = stage_idx
        days_since_irrigation = np.random.randint(0, 15)

        # Rule-based labeling
        irrigation_required = int(
            soil_moisture < 30
            or (temperature > 35 and soil_moisture < 45)
            or (days_since_irrigation > 7 and rainfall < 5)
        )
        fertilizer_required = int(
            (CROP_STAGES[stage_idx] in ["Tillering", "Vegetative", "Jointing"])
            and (days_since_irrigation % 3 == 0)
            and (rainfall < 10)
        )

        rows.append([
            soil_moisture, temperature, humidity, rainfall,
            crop_stage_encoded, days_since_irrigation,
            irrigation_required, fertilizer_required
        ])

    return pd.DataFrame(rows, columns=[
        "soil_moisture", "temperature", "humidity", "rainfall_last_3_days",
        "crop_stage_encoded", "days_since_last_irrigation",
        "irrigation_required", "fertilizer_required"
    ])


def train_advisory_models() -> Tuple[RandomForestClassifier, RandomForestClassifier]:
    df = generate_synthetic_data()
    features = [
        "soil_moisture", "temperature", "humidity",
        "rainfall_last_3_days", "crop_stage_encoded", "days_since_last_irrigation"
    ]
    X = df[features].values

    irr_model = RandomForestClassifier(n_estimators=100, random_state=42)
    irr_model.fit(X, df["irrigation_required"].values)

    fert_model = RandomForestClassifier(n_estimators=100, random_state=42)
    fert_model.fit(X, df["fertilizer_required"].values)

    return irr_model, fert_model


def get_daily_advisory(
    irr_model: RandomForestClassifier,
    fert_model: RandomForestClassifier,
    soil_moisture: float,
    temperature: float,
    humidity: float,
    rainfall_last_3_days: float,
    crop_stage: str,
    days_since_last_irrigation: int,
) -> Dict[str, Any]:

    # Encode stage safely
    if crop_stage in CROP_STAGES:
        stage_enc = stage_encoder.transform([crop_stage])[0]
    else:
        stage_enc = 0

    X = np.array([[
        soil_moisture, temperature, humidity,
        rainfall_last_3_days, stage_enc, days_since_last_irrigation
    ]])

    irr_pred = bool(irr_model.predict(X)[0])
    fert_pred = bool(fert_model.predict(X)[0])
    irr_prob = round(float(irr_model.predict_proba(X)[0][1]), 2)
    fert_prob = round(float(fert_model.predict_proba(X)[0][1]), 2)

    # Build recommendation text
    rec_parts = []
    if irr_pred:
        if soil_moisture < 20:
            rec_parts.append(f"⚠️ URGENT: Soil moisture critically low ({soil_moisture}%). Irrigate within 12 hours.")
        else:
            rec_parts.append(f"💧 Irrigation recommended within 24 hours. Current soil moisture: {soil_moisture}%.")
    else:
        rec_parts.append(f"✅ Soil moisture adequate ({soil_moisture}%). No irrigation needed today.")

    if fert_pred:
        stage_advice = {
            "Tillering": "Apply 25 kg urea/acre as top dressing.",
            "Vegetative": "Apply NPK (20-20-0) at 50 kg/acre.",
            "Jointing": "Apply 20 kg potassium chloride/acre.",
            "Flowering": "Foliar spray of 2% KNO₃ recommended.",
        }
        fert_text = stage_advice.get(crop_stage, "Apply balanced NPK as per soil test recommendation.")
        rec_parts.append(f"🌱 Fertilizer required: {fert_text}")
    else:
        rec_parts.append("🌿 No additional fertilization needed today.")

    if temperature > 38:
        rec_parts.append("🌡️ Heat stress alert: Consider irrigation during early morning hours.")
    if humidity > 85 and temperature > 28:
        rec_parts.append("🍄 High humidity + temperature: Monitor for fungal diseases.")

    return {
        "irrigation_required": irr_pred,
        "fertilizer_required": fert_pred,
        "irrigation_confidence": irr_prob,
        "fertilizer_confidence": fert_prob,
        "recommendation_text": " ".join(rec_parts),
    }