from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from translations import ADVISORY_MESSAGES  # Import translations

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
    lang: str = "en",
) -> Dict[str, Any]:
    lang = lang if lang in ["en", "hi"] else "en"
    trans = ADVISORY_MESSAGES.get(lang, ADVISORY_MESSAGES["en"])

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
            rec_parts.append(trans.get("urgent_irrigation", "").format(soil_moisture=soil_moisture))
        else:
            rec_parts.append(trans.get("irrigation_needed", "").format(soil_moisture=soil_moisture))
    else:
        rec_parts.append(trans.get("irrigation_ok", "").format(soil_moisture=soil_moisture))

    if fert_pred:
        # Note: These stage-specific messages are also in the translation dict now?
        # Actually I put them in ADVISORY_MESSAGES with keys `fert_tillering`, etc.
        # But I need to map the crop_stage string to these keys.
        
        stage_key_map = {
            "Tillering": "fert_tillering",
            "Vegetative": "fert_vegetative",
            "Jointing": "fert_jointing",
            "Flowering": "fert_flowering",
        }
        
        key = stage_key_map.get(crop_stage, "fert_default")
        fert_text_content = trans.get(key, trans.get("fert_default"))
        
        # In my translation file I had full sentences for these.
        # Let's check: "fert_tillering": "Apply 25 kg urea/acre as top dressing."
        # And the prefix: "fert_required_prefix": "🌱 Fertilizer required: "
        
        rec_parts.append(f"{trans.get('fert_required_prefix')}{fert_text_content}")
    else:
        rec_parts.append(trans.get("fert_not_needed"))

    if temperature > 38:
        rec_parts.append(trans.get("heat_alert"))
    if humidity > 85 and temperature > 28:
        rec_parts.append(trans.get("humidity_alert"))

    return {
        "irrigation_required": irr_pred,
        "fertilizer_required": fert_pred,
        "irrigation_confidence": irr_prob,
        "fertilizer_confidence": fert_prob,
        "recommendation_text": " ".join(rec_parts),
    }