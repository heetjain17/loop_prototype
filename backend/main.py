from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

from models.growth_model import get_growth_plan
from models.advisory_model import train_advisory_models, get_daily_advisory
from models.disease_model import detect_disease

app = FastAPI(
    title="KrishiAI - Crop Monitoring & Advisory Platform",
    description="AI-powered crop monitoring, growth planning, and disease detection for Indian farmers.",
    version="1.0.0",
)

origins = os.getenv("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Train models at startup
print("🌱 Training advisory models on synthetic agronomic data...")
irr_model, fert_model = train_advisory_models()
print("✅ Advisory models ready.")


# ─── Request Schemas ───────────────────────────────────────────────────────────

class GrowthPlanRequest(BaseModel):
    crop_type: str
    sowing_date: str  # YYYY-MM-DD
    city: str
    tmax: float
    tmin: float
    accumulated_gdd: Optional[float] = None  # if provided by frontend, skip estimation
    lat: Optional[float] = None
    lon: Optional[float] = None


class DailyAdvisoryRequest(BaseModel):
    soil_moisture: float
    temperature: float
    humidity: float
    rainfall_last_3_days: float
    crop_stage: str
    days_since_last_irrigation: int


# ─── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status": "running",
        "platform": "KrishiAI Crop Monitoring Platform",
        "endpoints": ["/growth-plan", "/daily-advisory", "/detect-disease"],
    }


@app.post("/growth-plan")
def growth_plan(req: GrowthPlanRequest, lang: str = "en"):
    supported_crops = ["wheat", "rice", "jowar", "maize"]
    if req.crop_type.lower() not in supported_crops:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported crop. Supported: {supported_crops}",
        )
    if req.tmax <= req.tmin:
        raise HTTPException(status_code=400, detail="tmax must be greater than tmin.")

    try:
        result = get_growth_plan(
            crop_type=req.crop_type,
            sowing_date=req.sowing_date,
            city=req.city,
            tmax=req.tmax,
            tmin=req.tmin,
            accumulated_gdd=req.accumulated_gdd,
            lang=lang,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format or value. Please use YYYY-MM-DD. Error: {str(e)}",
        )
    return result


@app.post("/daily-advisory")
def daily_advisory(req: DailyAdvisoryRequest, lang: str = "en"):
    if not (0 <= req.soil_moisture <= 100):
        raise HTTPException(status_code=400, detail="soil_moisture must be 0–100.")
    if not (0 <= req.humidity <= 100):
        raise HTTPException(status_code=400, detail="humidity must be 0–100.")

    result = get_daily_advisory(
        irr_model=irr_model,
        fert_model=fert_model,
        soil_moisture=req.soil_moisture,
        temperature=req.temperature,
        humidity=req.humidity,
        rainfall_last_3_days=req.rainfall_last_3_days,
        crop_stage=req.crop_stage,
        days_since_last_irrigation=req.days_since_last_irrigation,
        lang=lang,
    )
    return result


@app.post("/detect-disease")
async def detect_disease_endpoint(image: UploadFile = File(...), lang: str = "en"):
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {image.content_type}. Upload JPEG or PNG.",
        )

    contents = await image.read()
    file_size = len(contents)

    result = detect_disease(filename=image.filename or "", file_size=file_size, lang=lang)
    return result


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)