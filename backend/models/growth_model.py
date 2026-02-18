from datetime import date, datetime
from typing import Dict, Any
from translations import FERTILIZER_WINDOWS, RISK_ALERTS  # Import translations

CROP_STAGES = {
    "wheat": [
        {"name": "Germination", "start": 0, "end": 7, "base_gdd": 70},
        {"name": "Tillering", "start": 15, "end": 40, "base_gdd": 300},
        {"name": "Jointing", "start": 45, "end": 65, "base_gdd": 500},
        {"name": "Flowering", "start": 70, "end": 85, "base_gdd": 700},
        {"name": "Maturity", "start": 100, "end": 120, "base_gdd": 950},
    ],
    "rice": [
        {"name": "Germination", "start": 0, "end": 10, "base_gdd": 100},
        {"name": "Vegetative", "start": 10, "end": 45, "base_gdd": 450},
        {"name": "Tillering", "start": 45, "end": 70, "base_gdd": 650},
        {"name": "Flowering", "start": 70, "end": 90, "base_gdd": 850},
        {"name": "Maturity", "start": 90, "end": 130, "base_gdd": 1100},
    ],
    "jowar": [
        {"name": "Germination", "start": 0, "end": 8, "base_gdd": 80},
        {"name": "Vegetative", "start": 8, "end": 35, "base_gdd": 350},
        {"name": "Jointing", "start": 35, "end": 55, "base_gdd": 550},
        {"name": "Flowering", "start": 55, "end": 75, "base_gdd": 750},
        {"name": "Maturity", "start": 75, "end": 110, "base_gdd": 1000},
    ],
    "maize": [
        {"name": "Germination", "start": 0, "end": 7, "base_gdd": 60},
        {"name": "Vegetative", "start": 7, "end": 35, "base_gdd": 320},
        {"name": "Tasseling", "start": 35, "end": 60, "base_gdd": 560},
        {"name": "Silking", "start": 60, "end": 80, "base_gdd": 760},
        {"name": "Maturity", "start": 80, "end": 120, "base_gdd": 1000},
    ],
}

BASE_TEMPS = {
    "wheat": 5,
    "rice": 10,
    "jowar": 10,
    "maize": 10,
}

IRRIGATION_SCHEDULE = {
    "Germination": 5,
    "Tillering": 7,
    "Vegetative": 7,
    "Jointing": 6,
    "Tasseling": 5,
    "Silking": 5,
    "Flowering": 5,
    "Maturity": 10,
}

def calculate_gdd(tmax: float, tmin: float, base_temp: float) -> float:
    avg_temp = (tmax + tmin) / 2
    return max(0, avg_temp - base_temp)


def get_growth_plan(
    crop_type: str,
    sowing_date: str,
    district: str,
    tmax: float,
    tmin: float,
    lang: str = "en",
) -> Dict[str, Any]:
    crop_type = crop_type.lower()
    stages = CROP_STAGES.get(crop_type, CROP_STAGES["wheat"])
    base_temp = BASE_TEMPS.get(crop_type, 5)

    lang = lang if lang in ["en", "hi"] else "en"
    trans_fert = FERTILIZER_WINDOWS.get(lang, FERTILIZER_WINDOWS["en"])
    trans_risk = RISK_ALERTS.get(lang, RISK_ALERTS["en"])

    sow_dt = datetime.strptime(sowing_date, "%Y-%m-%d").date()
    today = date.today()
    days_since_sowing = (today - sow_dt).days

    daily_gdd = calculate_gdd(tmax, tmin, base_temp)
    accumulated_gdd = max(0, daily_gdd * days_since_sowing)

    # Determine current stage
    current_stage = stages[-1]["name"]
    for stage in stages:
        if stage["start"] <= days_since_sowing <= stage["end"]:
            current_stage = stage["name"]
            break
        elif days_since_sowing < stage["start"]:
            current_stage = stages[0]["name"]
            break

    # GDD-based acceleration/delay
    expected_gdd_at_day = daily_gdd * days_since_sowing if days_since_sowing > 0 else 0
    avg_daily_gdd = accumulated_gdd / max(days_since_sowing, 1)
    expected_avg = 15.0  # avg expected GDD/day for reference
    gdd_ratio = avg_daily_gdd / expected_avg if expected_avg > 0 else 1.0

    # Irrigation
    stage_irrigation_interval = IRRIGATION_SCHEDULE.get(current_stage, 7)
    # Adjust for temperature
    if tmax > 35:
        stage_irrigation_interval = max(3, stage_irrigation_interval - 2)
    elif tmax < 20:
        stage_irrigation_interval = stage_irrigation_interval + 2
    days_last_irrigation = days_since_sowing % stage_irrigation_interval
    next_irrigation = stage_irrigation_interval - days_last_irrigation

    # Fertilizer
    # Check if we have specific translation for the stage, otherwise fallback to default
    fert_rec = trans_fert.get(current_stage, trans_fert.get("default", "No fertilizer required"))

    # Risk alert
    risk_alert = None
    if tmax > 38:
        risk_alert = trans_risk.get("heat_stress")
    elif tmin < base_temp + 2:
        risk_alert = trans_risk.get("temp_threshold", "").format(stage=current_stage)
    elif gdd_ratio > 1.3:
        risk_alert = trans_risk.get("warmer_season")
    else:
        risk_alert = trans_risk.get("normal")

    return {
        "crop_type": crop_type.capitalize(),
        "district": district,
        "current_stage": current_stage,
        "days_since_sowing": max(0, days_since_sowing),
        "accumulated_gdd": round(accumulated_gdd, 1),
        "daily_gdd": round(daily_gdd, 1),
        "next_irrigation_in_days": max(1, next_irrigation),
        "fertilizer_recommendation": fert_rec,
        "risk_alert": risk_alert,
        "all_stages": [
            {"name": s["name"], "start_day": s["start"], "end_day": s["end"]}
            for s in stages
        ],
    }