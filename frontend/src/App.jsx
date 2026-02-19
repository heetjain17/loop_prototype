import { useState, useEffect } from "react";
import {
  Sprout,
  LineChart,
  Microscope,
  Droplets,
  ThermometerSun,
  CloudRain,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  ShieldCheck,
  Pill,
  Camera,
  FileImage,
  Upload,
  ArrowRight,
  Leaf,
  Sun

} from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./components/LanguageSwitcher";
import SpeechButton from "./components/SpeechButton";
import WeatherAdvisory from "./components/WeatherAdvisory";

const API = "http://localhost:8000";

const CROP_STAGES = [
  "Germination", "Vegetative", "Tillering",
  "Jointing", "Tasseling", "Silking", "Flowering", "Maturity"
];

// ── Utilities ──────────────────────────────────────────────────────────────────
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// ── Card ───────────────────────────────────────────────────────────────────────
function Card({ children, className }) {
  return (
    <div className={cn("card", className)}>
      {children}
    </div>
  );
}

function Spinner() {
  const { t } = useTranslation();
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <span>{t('common.analyzing')}</span>
    </div>
  );
}

// ── Section: Growth Plan ───────────────────────────────────────────────────────
// ── Open-Meteo helpers ────────────────────────────────────────────────────────
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";
const OPEN_METEO_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";

async function fetchHistoricalGDD(lat, lon, sowingDate, baseTemp) {
  // Use 2 days ago as end_date to stay within Open-Meteo archive availability (5-day lag)
  const end = new Date();
  end.setDate(end.getDate() - 2);
  const endDate = end.toISOString().split("T")[0];
  // Guard: sowing must be before endDate
  if (sowingDate >= endDate) {
    return { accumulated_gdd: 0, avg_tmax: 0, avg_tmin: 0, days: 0 };
  }
  const url = `${OPEN_METEO_ARCHIVE}?latitude=${lat}&longitude=${lon}` +
    `&start_date=${sowingDate}&end_date=${endDate}` +
    `&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Historical weather fetch failed (${res.status}): ${body.reason || body.error || "unknown error"}`);
  }
  const data = await res.json();
  const tmaxArr = data.daily.temperature_2m_max;
  const tminArr = data.daily.temperature_2m_min;
  let accumulated = 0;
  for (let i = 0; i < tmaxArr.length; i++) {
    if (tmaxArr[i] != null && tminArr[i] != null) {
      const avg = (tmaxArr[i] + tminArr[i]) / 2;
      accumulated += Math.max(0, avg - baseTemp);
    }
  }
  const days = tmaxArr.length;
  const avgTmax = tmaxArr.reduce((a, b) => a + (b ?? 0), 0) / days;
  const avgTmin = tminArr.reduce((a, b) => a + (b ?? 0), 0) / days;
  return { accumulated_gdd: Math.round(accumulated * 10) / 10, avg_tmax: Math.round(avgTmax * 10) / 10, avg_tmin: Math.round(avgTmin * 10) / 10, days };
}

async function fetchOpenMeteoCurrent(lat, lon) {
  const url = `${OPEN_METEO_BASE}/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&hourly=soil_moisture_0_to_1cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,soil_temperature_6cm` +
    `&current=temperature_2m,relative_humidity_2m` +
    `&forecast_days=16&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not fetch forecast/soil data.");
  return res.json();
}

// Base temperatures per crop (°C)
const CROP_BASE_TEMPS = { wheat: 5, rice: 10, jowar: 10, maize: 10 };

function GrowthPlanner({ weatherData }) {
  const { t, i18n } = useTranslation();
  const [cropType, setCropType] = useState("wheat");
  const [sowingDate, setSowingDate] = useState("");
  const [result, setResult] = useState(null);
  const [openMeteoData, setOpenMeteoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchPhase, setFetchPhase] = useState("");
  const [error, setError] = useState("");

  const hasLocation = !!(weatherData?.lat && weatherData?.lon);

  async function submit(e) {
    e.preventDefault();
    setError(""); setResult(null); setOpenMeteoData(null); setLoading(true);
    try {
      const lat = weatherData.lat;
      const lon = weatherData.lon;
      const baseTemp = CROP_BASE_TEMPS[cropType] ?? 10;

      // Step 1: Historical GDD
      setFetchPhase("📊 Fetching historical temperatures since sowing…");
      const hist = await fetchHistoricalGDD(lat, lon, sowingDate, baseTemp);

      // Step 2: Live soil & 16-day forecast (parallel)
      setFetchPhase("🌱 Fetching live soil moisture & 16-day forecast…");
      const omData = await fetchOpenMeteoCurrent(lat, lon);
      setOpenMeteoData(omData);

      // Step 3: Backend recommendations
      setFetchPhase("🤖 Analysing crop stage & recommendations…");
      const lang = i18n.language.split("-")[0];
      const res = await fetch(`${API}/growth-plan?lang=${lang}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop_type: cropType,
          sowing_date: sowingDate,
          city: weatherData.cityName || weatherData.city || "Unknown",
          tmax: hist.avg_tmax,
          tmin: hist.avg_tmin,
          accumulated_gdd: hist.accumulated_gdd,
          lat, lon,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Backend error"); }
      const data = await res.json();
      setResult({ ...data, hist });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false); setFetchPhase("");
    }
  }

  const stageColors = {
    Germination: "#7DAF5C", Vegetative: "#4A9063", Tillering: "#3A7A52",
    Jointing: "#2D6B42", Tasseling: "#E8A045", Silking: "#D4842A",
    Flowering: "#C96B2F", Maturity: "#A0522D",
  };

  // Extract soil moisture (use index 6 = ~6am of today, nearest reading)
  const soilMoisture = openMeteoData ? {
    shallow: openMeteoData.hourly.soil_moisture_0_to_1cm?.[6] ?? null,
    mid: openMeteoData.hourly.soil_moisture_3_to_9cm?.[6] ?? null,
    deep: openMeteoData.hourly.soil_moisture_9_to_27cm?.[6] ?? null,
    soilTemp: openMeteoData.hourly.soil_temperature_6cm?.[6] ?? null,
  } : null;

  const forecast16 = openMeteoData?.daily ?? null;

  return (
    <section className="feature-section">
      <div className="section-header">
        <Sprout className="section-icon" strokeWidth={1.5} />
        <div>
          <h2>{t('sections.growth.title')}</h2>
          <p className="section-sub">Real GDD accumulation · Live soil data · 16-day forecast</p>
        </div>
      </div>

      {/* Location banner */}
      {hasLocation ? (
        <div className="weather-source-banner banner-auto">
          <span className="banner-icon">📍</span>
          <span className="banner-text">
            Location: <strong>{weatherData.cityName || weatherData.city}</strong>
            &nbsp;·&nbsp;🌡 {weatherData.temp}°C
            &nbsp;·&nbsp;💧 {weatherData.humidity}%
          </span>
        </div>
      ) : (
        <div className="weather-source-banner banner-hint">
          <span className="banner-icon">💡</span>
          <span className="banner-text">
            Visit the <strong>Weather tab</strong> and search your city or use 📍 Locate Me — location is required to fetch soil & GDD data automatically.
          </span>
        </div>
      )}

      {/* Minimal 2-field form */}
      <form onSubmit={submit} className="growth-mini-form">
        <label className="field">
          <span>{t('sections.growth.form.crop_type')}</span>
          <select value={cropType} onChange={e => setCropType(e.target.value)}>
            {["wheat", "rice", "jowar", "maize"].map(c => (
              <option key={c} value={c}>{t(`crops.${c}`)}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t('sections.growth.form.sowing_date')}</span>
          <div className="input-icon-wrap">
            <Calendar size={16} className="field-icon" />
            <input
              type="date"
              value={sowingDate}
              onChange={e => setSowingDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
        </label>

        <div className="field submit-col">
          <button type="submit" className="btn btn-primary" disabled={loading || !hasLocation}>
            {loading ? (
              <span className="loading-phase">{fetchPhase || "Loading…"}</span>
            ) : (
              <><Sprout size={16} style={{ marginRight: 8 }} />Analyse Crop</>
            )}
          </button>
          {!hasLocation && <p className="field-hint">⚠ Set location in Weather tab first</p>}
        </div>
      </form>

      {error && <div className="error-box"><AlertTriangle size={18} /> {error}</div>}

      {result && (
        <div className="result-grid">

          {/* Hero: Stage + Real GDD */}
          <Card className="result-hero">
            <div className="stage-badge-wrap">
              <div className="stage-pill" style={{ background: stageColors[result.current_stage] || "#5A8A45" }}>
                {t(`stages.${result.current_stage}`) || result.current_stage}
              </div>
              <span className="stage-label">Current Stage</span>
            </div>
            <div className="stat-row">
              <Stat label="Days Since Sowing" value={result.days_since_sowing} unit="days" />
              <Stat label="Real Accumulated GDD" value={result.hist.accumulated_gdd} unit="°C·days" highlight />
              <Stat label="Season Avg Tmax" value={result.hist.avg_tmax} unit="°C" />
              <Stat label="Season Avg Tmin" value={result.hist.avg_tmin} unit="°C" />
            </div>
            <p className="gdd-source-note">
              📈 GDD computed from <strong>{result.hist.days}</strong> days of actual historical temperatures via Open-Meteo
            </p>
          </Card>

          {/* Soil Moisture Card */}
          {soilMoisture && soilMoisture.shallow !== null && (
            <Card className="soil-card">
              <h3><Droplets size={18} className="inline-icon" /> Live Soil Moisture</h3>
              <div className="soil-gauges">
                <SoilGauge label="0–1 cm" value={soilMoisture.shallow} color="#43a89e" />
                <SoilGauge label="3–9 cm" value={soilMoisture.mid} color="#2d7a70" />
                <SoilGauge label="9–27 cm" value={soilMoisture.deep} color="#1a5c53" />
              </div>
              {soilMoisture.soilTemp !== null && (
                <p className="soil-temp">🌡 Soil Temp @ 6cm: <strong>{soilMoisture.soilTemp.toFixed(1)}°C</strong></p>
              )}
              <p className="data-source-note">Live data · Open-Meteo</p>
            </Card>
          )}

          {/* 16-day Forecast Strip */}
          {forecast16 && (
            <Card className="forecast-card">
              <h3><Sun size={18} className="inline-icon" /> 16-Day Temperature Outlook</h3>
              <div className="forecast-strip">
                {forecast16.time?.slice(0, 16).map((date, i) => (
                  <div key={date} className="forecast-day">
                    <span className="fc-date">{new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <span className="fc-max">{Math.round(forecast16.temperature_2m_max?.[i])}°</span>
                    <div className="fc-bar-wrap">
                      <div className="fc-bar" style={{
                        height: `${Math.min(100, ((forecast16.temperature_2m_max?.[i] ?? 20) / 45) * 100)}%`,
                        background: (forecast16.temperature_2m_max?.[i] ?? 20) > 38 ? '#ef4444' : '#4ade80'
                      }} />
                    </div>
                    <span className="fc-min">{Math.round(forecast16.temperature_2m_min?.[i])}°</span>
                    {(forecast16.precipitation_sum?.[i] ?? 0) > 1 && (
                      <span className="fc-rain">💧</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="data-source-note">Open-Meteo · 16-day forecast</p>
            </Card>
          )}

          {/* Irrigation + Fertilizer */}
          <Card className="action-card">
            <h3><Droplets size={18} className="inline-icon" /> {t('sections.growth.results.irrigation')}</h3>
            <p className="action-value">{t('sections.growth.results.next_window', { days: result.next_irrigation_in_days })}</p>
          </Card>

          <Card className="action-card">
            <h3><Sprout size={18} className="inline-icon" /> {t('sections.growth.results.fertilizer')}</h3>
            <p className="action-value">{result.fertilizer_recommendation}</p>
          </Card>

          {/* Risk Alert */}
          <Card className="alert-card">
            <h3><Zap size={18} className="inline-icon" /> {t('sections.growth.results.risk_alert')}</h3>
            <p>{result.risk_alert}</p>
          </Card>

          {/* Speech */}
          <div className="speech-container" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <SpeechButton
              text={`Stage: ${t("stages." + result.current_stage) || result.current_stage}. Accumulated GDD: ${result.hist.accumulated_gdd} degree days. ${t('sections.growth.results.irrigation')}: ${t('sections.growth.results.next_window', { days: result.next_irrigation_in_days })}. ${result.fertilizer_recommendation}. ${result.risk_alert}`}
              lang={i18n.language.split("-")[0]}
            />
          </div>

          {/* Stage Timeline */}
          <Card className="timeline-card">
            <h3>{t('sections.growth.results.season_timeline', { crop: result.crop_type })}</h3>
            <div className="timeline">
              {result.all_stages.map((s, i) => {
                const active = s.name === result.current_stage;
                const past = result.days_since_sowing > s.end_day;
                return (
                  <div key={i} className={cn("timeline-step", active && "active", past && "past")}>
                    <div className="tl-dot" style={{ background: active ? stageColors[s.name] : undefined }} />
                    <div className="tl-info">
                      <strong>{t(`stages.${s.name}`) || s.name}</strong>
                      <span>{t('sections.growth.results.timeline_days', { start: s.start_day, end: s.end_day })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}

function SoilGauge({ label, value, color }) {
  // value is volumetric water content (m³/m³), typically 0.0 – 0.5
  const pct = Math.min(100, Math.round((value / 0.5) * 100));
  const status = pct < 20 ? "Dry" : pct < 50 ? "Low" : pct < 75 ? "Adequate" : "Saturated";
  return (
    <div className="soil-gauge">
      <div className="sg-label">{label}</div>
      <div className="sg-track">
        <div className="sg-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="sg-value">{(value * 100).toFixed(1)}% <span className="sg-status">{status}</span></div>
    </div>
  );
}

function Stat({ label, value, unit, highlight }) {
  return (
    <div className={`stat${highlight ? ' stat-highlight' : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-unit">{unit}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}




// ── Section: Daily Advisory ───────────────────────────────────────────────────
function DailyAdvisory({ weatherData }) {
  const { t, i18n } = useTranslation();
  const [useAutoWeather, setUseAutoWeather] = useState(true);
  const [form, setForm] = useState({
    soil_moisture: "",
    temperature: "",
    humidity: "",
    rainfall_last_3_days: "",
    crop_stage: "Tillering",
    days_since_last_irrigation: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill weather & soil fields when data is available
  useEffect(() => {
    if (useAutoWeather && weatherData) {
      // Basic weather
      setForm(f => ({
        ...f,
        temperature: String(weatherData.temp),
        humidity: String(weatherData.humidity),
        rainfall_last_3_days: String(weatherData.rainfall_last_3_days),
      }));

      // Fetch soil moisture if coords exist
      if (weatherData.lat && weatherData.lon) {
        fetchOpenMeteoCurrent(weatherData.lat, weatherData.lon)
          .then(data => {
            // Use 0-1cm moisture at index 6 (~6am) as representative
            const sm = data.hourly.soil_moisture_0_to_1cm?.[6];
            if (sm != null) {
              // Convert volumetric fraction (0.0-0.5) to percentage (0-50+)
              // Placeholder "45" implies 45%, so we multiply by 100
              setForm(f => ({ ...f, soil_moisture: (sm * 100).toFixed(1) }));
            }
          })
          .catch(err => console.error("Failed to auto-fetch soil moisture for Advisory:", err));
      }
    }
  }, [weatherData, useAutoWeather]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const hasWeather = !!weatherData;
  const isAuto = hasWeather && useAutoWeather;

  // Fields that can be auto-filled
  const autoFields = new Set(["temperature", "humidity", "rainfall_last_3_days", "soil_moisture"]);

  async function submit(e) {
    e.preventDefault();
    setError(""); setResult(null); setLoading(true);
    try {
      const lang = i18n.language.split("-")[0];
      const res = await fetch(`${API}/daily-advisory?lang=${lang}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soil_moisture: parseFloat(form.soil_moisture),
          temperature: parseFloat(form.temperature),
          humidity: parseFloat(form.humidity),
          rainfall_last_3_days: parseFloat(form.rainfall_last_3_days),
          crop_stage: form.crop_stage,
          days_since_last_irrigation: parseInt(form.days_since_last_irrigation),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Request failed");
      }
      setResult(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="feature-section">
      <div className="section-header">
        <LineChart className="section-icon" strokeWidth={1.5} />
        <div>
          <h2>{t('sections.advisory.title')}</h2>
          <p className="section-sub">{t('sections.advisory.subtitle')}</p>
        </div>
      </div>

      {/* Weather source banner */}
      {hasWeather ? (
        <div className={`weather-source-banner ${isAuto ? 'banner-auto' : 'banner-manual'}`}>
          <span className="banner-icon">{isAuto ? '🌤️' : '✏️'}</span>
          <span className="banner-text">
            {isAuto
              ? `Using live weather from ${weatherData.city} — ${weatherData.temp}°C, ${weatherData.humidity}% humidity`
              : 'Manual data entry mode'}
          </span>
          <button
            type="button"
            className="banner-toggle"
            onClick={() => setUseAutoWeather(v => !v)}
          >
            {isAuto ? 'Enter Manually' : '⚡ Use Live Weather'}
          </button>
        </div>
      ) : (
        <div className="weather-source-banner banner-hint">
          <span className="banner-icon">💡</span>
          <span className="banner-text">Visit the <strong>Weather tab</strong> to auto-fill weather conditions from live data.</span>
        </div>
      )}

      <form onSubmit={submit} className="input-grid">
        {[
          ["soil_moisture", t('sections.advisory.form.soil_moisture'), "28", Droplets],
          ["temperature", t('sections.advisory.form.temperature'), "34", ThermometerSun],
          ["humidity", t('sections.advisory.form.humidity'), "60", CloudRain],
          ["rainfall_last_3_days", t('sections.advisory.form.rainfall_last_3_days'), "12", CloudRain],
          ["days_since_last_irrigation", t('sections.advisory.form.days_since_irrigation'), "4", Calendar],
        ].map(([key, label, placeholder, IconComp]) => {
          const fieldIsAuto = isAuto && autoFields.has(key);
          return (
            <label className={`field ${fieldIsAuto ? 'field-auto' : ''}`} key={key}>
              <span>
                {label}
                {fieldIsAuto && <span className="auto-chip">AUTO</span>}
              </span>
              <div className="input-icon-wrap">
                {IconComp && <IconComp size={16} className="field-icon" />}
                <input
                  type="number"
                  placeholder={fieldIsAuto ? '' : placeholder}
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  readOnly={fieldIsAuto}
                  className={fieldIsAuto ? 'input-readonly' : ''}
                  required
                />
              </div>
            </label>
          );
        })}

        <label className="field">
          <span>{t('sections.advisory.form.current_crop_stage')}</span>
          <select value={form.crop_stage} onChange={e => set("crop_stage", e.target.value)}>
            {CROP_STAGES.map(s => <option key={s} value={s}>{t(`stages.${s}`) || s}</option>)}
          </select>
        </label>

        <div className="field submit-col">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('common.analyzing') : t('sections.advisory.form.submit')}
            {!loading && <ArrowRight size={16} style={{ marginLeft: 8 }} />}
          </button>
        </div>
      </form>

      {error && <div className="error-box"><AlertTriangle size={18} /> {error}</div>}

      {result && (
        <div className="advisory-result">
          <div className="advisory-indicators">
            <div className={cn("indicator", result.irrigation_required ? "indicator-yes" : "indicator-no")}>
              <span className="ind-icon-wrap">
                {result.irrigation_required ? <Droplets size={32} /> : <CheckCircle2 size={32} />}
              </span>
              <span className="ind-label">{t('sections.advisory.results.irrigation')}</span>
              <span className="ind-status">{result.irrigation_required ? t('sections.advisory.results.required') : t('sections.advisory.results.not_needed')}</span>
              <span className="ind-conf">{t('common.confidence', { percent: Math.round(result.irrigation_confidence * 100) })}</span>
            </div>
            <div className={cn("indicator", result.fertilizer_required ? "indicator-yes" : "indicator-no")}>
              <span className="ind-icon-wrap">
                {result.fertilizer_required ? <Sprout size={32} /> : <CheckCircle2 size={32} />}
              </span>
              <span className="ind-label">{t('sections.advisory.results.fertilizer')}</span>
              <span className="ind-status">{result.fertilizer_required ? t('sections.advisory.results.required') : t('sections.advisory.results.not_needed')}</span>
              <span className="ind-conf">{t('common.confidence', { percent: Math.round(result.fertilizer_confidence * 100) })}</span>
            </div>
          </div>
          <Card className="rec-text-card">
            <h3><Info size={18} className="inline-icon" /> {t('sections.advisory.results.full_recommendation')}</h3>
            <p className="rec-text">{result.recommendation_text}</p>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <SpeechButton text={result.recommendation_text} lang={i18n.language.split("-")[0]} />
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}

// ── Section: Disease Detection ─────────────────────────────────────────────────
function DiseaseDetector() {
  const { t, i18n } = useTranslation();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  }

  async function analyze() {
    if (!file) return;
    setError(""); setLoading(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const lang = i18n.language.split("-")[0];
      const res = await fetch(`${API}/detect-disease?lang=${lang}`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Upload failed");
      }
      setResult(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const severityColor = {
    None: "#4A9063",
    "Low–Moderate": "#E8A045",
    Moderate: "#D4842A",
    "Moderate–High": "#C96B2F",
    High: "#A0311A",
  };

  return (
    <section className="feature-section">
      <div className="section-header">
        <Microscope className="section-icon" strokeWidth={1.5} />
        <div>
          <h2>{t('sections.disease.title')}</h2>
          <p className="section-sub">{t('sections.disease.subtitle')}</p>
        </div>
      </div>

      <div className="upload-zone">
        <label className="upload-label">
          <input type="file" accept="image/*" onChange={onFileChange} hidden />
          {preview ? (
            <img src={preview} alt="Crop preview" className="preview-img" />
          ) : (
            <div className="upload-placeholder">
              <Camera size={48} className="upload-icon" strokeWidth={1} />
              <span>{t('sections.disease.upload.placeholder')}</span>
              <span className="upload-hint">{t('sections.disease.upload.hint')}</span>
            </div>
          )}
        </label>

        {file && (
          <div className="upload-meta">
            <FileImage size={14} />
            <span>{file.name}</span>
            <span>{t('sections.disease.upload.file_size', { size: (file.size / 1024).toFixed(1) })}</span>
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={analyze}
          disabled={!file || loading}
        >
          {loading ? t('sections.disease.upload.btn_analyzing') : t('sections.disease.upload.btn_analyze')}
          {!loading && <Upload size={16} style={{ marginLeft: 8 }} />}
        </button>
      </div>

      {loading && <Spinner />}
      {error && <div className="error-box"><AlertTriangle size={18} /> {error}</div>}

      {result && (
        <Card className="disease-result">
          <div className="disease-header">
            <div
              className="disease-severity-badge"
              style={{ background: severityColor[result.severity] || "#888" }}
            >
              {result.severity === "None" ?
                <span className="flex-center-row"><CheckCircle2 size={14} style={{ marginRight: 4 }} /> {t('sections.disease.results.healthy')}</span> :
                <span className="flex-center-row"><AlertTriangle size={14} style={{ marginRight: 4 }} /> {t('sections.disease.results.severity', { level: result.severity })}</span>
              }
            </div>
            <span className="confidence-tag">{t('common.confidence', { percent: Math.round(result.confidence * 100) })}</span>
            <div style={{ marginLeft: '1rem' }}>
              <SpeechButton
                text={`${result.disease_detected}. ${t('sections.disease.results.severity', { level: result.severity })}. ${t('sections.disease.results.treatment')}: ${result.recommendation}. ${t('sections.disease.results.prevention')}: ${result.prevention}`}
                lang={i18n.language.split("-")[0]}
              />
            </div>
          </div>
          <h3 className="disease-name">{result.disease_detected}</h3>
          <div className="disease-sections">
            <div className="disease-block">
              <h4><Pill size={14} className="inline-icon-sm" /> {t('sections.disease.results.treatment')}</h4>
              <p>{result.recommendation}</p>
            </div>
            <div className="disease-block">
              <h4><ShieldCheck size={14} className="inline-icon-sm" /> {t('sections.disease.results.prevention')}</h4>
              <p>{result.prevention}</p>
            </div>
          </div>
          <p className="analysis-method">{t('sections.disease.results.analysis_method', { method: result.analysis_method })}</p>
        </Card>
      )}

    </section>
  );
}

// ── App Shell ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: "growth", label: "tabs.growth", icon: Sprout },
  { id: "advisory", label: "tabs.advisory", icon: LineChart },
  { id: "disease", label: "tabs.disease", icon: Microscope },
  { id: "weather", label: "tabs.weather", icon: CloudRain },
];

export default function App() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("growth");
  const [weatherData, setWeatherData] = useState(null);

  // Lifted weather display state — persists across tab switches
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [weatherLocation, setWeatherLocation] = useState("");

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <Leaf className="brand-icon" strokeWidth={2} />
            <div>
              <h1>{t('app_title')}</h1>
              <span className="brand-tagline">{t('app_tagline')}</span>
            </div>
          </div>
          <div className="header-right">
            <LanguageSwitcher />
            <div className="header-badge">
              <span className="dot-live" />
              {t('ai_active')}
            </div>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="tab-nav">
        {TABS.map(tabItem => (
          <button
            key={tabItem.id}
            className={cn("tab-btn", tab === tabItem.id && "active")}
            onClick={() => setTab(tabItem.id)}
          >
            <tabItem.icon size={18} />
            <span>{t(tabItem.label)}</span>
          </button>
        ))}
      </nav>

      {/* Main */}
      <main className="main-content">
        {tab === "growth" && <GrowthPlanner weatherData={weatherData} />}
        {tab === "advisory" && <DailyAdvisory weatherData={weatherData} />}
        {tab === "disease" && <DiseaseDetector />}
        {tab === "weather" && <WeatherAdvisory
          onWeatherFetched={setWeatherData}
          weather={weather}
          setWeather={setWeather}
          forecast={forecast}
          setForecast={setForecast}
          location={weatherLocation}
          setLocation={setWeatherLocation}
        />}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>{t('footer')}</p>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --earth-900: #1C1208;
          --earth-800: #2E1E0A;
          --earth-700: #4A3215;
          --earth-600: #6B4B22;
          --terracotta: #C96B2F;
          --terracotta-light: #E8A045;
          --green-900: #1A3020;
          --green-700: #2D6B42;
          --green-500: #4A9063;
          --green-300: #7DAF5C;
          --cream: #F7F0E3;
          --cream-dark: #EDE3CE;
          --parchment: #FAF5EC;
          --text-primary: #1C1208;
          --text-secondary: #5A4A30;
          --text-muted: #8A7A60;
          --border: #D4C5A0;
          --shadow: 0 4px 20px rgba(28, 18, 8, 0.12);
          --shadow-lg: 0 8px 40px rgba(28, 18, 8, 0.18);
        }

        body {
          font-family: 'DM Sans', system-ui, sans-serif;
          background: var(--parchment);
          color: var(--text-primary);
          min-height: 100vh;
        }

        .app {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        /* Header */
        .app-header {
          background: linear-gradient(135deg, var(--earth-800) 0%, var(--green-900) 100%);
          border-bottom: 3px solid var(--terracotta);
          padding: 0 1.5rem;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header-inner {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 0;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .language-switcher {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .lang-icon { color: var(--text-secondary); opacity: 0.7; }
        .lang-buttons { 
          display: flex; 
          align-items: center; 
          gap: 0.25rem; 
          font-size: 0.8rem;
          font-weight: 600;
        }
        .lang-btn {
          border: none;
          background: none;
          color: var(--text-secondary);
          opacity: 0.5;
          cursor: pointer;
          padding: 2px 4px;
          transition: all 0.2s;
        }
        .lang-btn:hover { opacity: 0.8; }
        .lang-btn.active { opacity: 1; color: var(--terracotta); border-bottom: 2px solid var(--terracotta); }
        .divider { color: var(--border); opacity: 0.5; }
        
        .brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .brand-icon {
          color: var(--cream);
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        .brand h1 {
          font-family: 'Playfair Display', serif;
          font-size: 1.6rem;
          color: var(--cream);
          letter-spacing: 0.02em;
          line-height: 1;
        }
        .brand-tagline {
          font-size: 0.7rem;
          color: var(--terracotta-light);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 600;
        }
        .header-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(122, 175, 92, 0.2);
          border: 1px solid rgba(122, 175, 92, 0.4);
          border-radius: 100px;
          padding: 0.3rem 0.75rem;
          font-size: 0.75rem;
          color: var(--green-300);
          font-weight: 600;
        }
        .dot-live {
          width: 7px; height: 7px;
          background: #6BFF6B;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
          box-shadow: 0 0 6px #6BFF6B;
        }
        @keyframes pulse {
          0%,100% { opacity:1; } 50% { opacity:0.4; }
        }

        /* Nav */
        .tab-nav {
          background: var(--cream-dark);
          border-bottom: 2px solid var(--border);
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          padding: 0 1rem;
          overflow-x: auto;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.85rem 1.2rem;
          border: none;
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .tab-btn:hover { color: var(--terracotta); }
        .tab-btn.active {
          color: var(--terracotta);
          border-bottom-color: var(--terracotta);
          font-weight: 600;
          background: rgba(201, 107, 47, 0.05);
        }

        /* Main */
        .main-content {
          flex: 1;
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
          padding: 2rem 1rem;
        }

        /* Section */
        .feature-section { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }

        .section-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.75rem;
        }
        .section-icon {
          width: 36px; height: 36px;
          color: var(--earth-700);
          filter: drop-shadow(0 2px 6px rgba(0,0,0,0.1));
        }
        .section-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.6rem;
          color: var(--earth-800);
        }
        .section-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 0.15rem;
          font-weight: 500;
          letter-spacing: 0.03em;
        }

        /* Form */
        .input-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
          background: white;
          padding: 1.5rem;
          border-radius: 16px;
          border: 1.5px solid var(--border);
          box-shadow: var(--shadow);
        }
        .submit-col { 
          display: flex; 
          align-items: center; 
          justify-content: center;
          grid-column: 1 / -1;
          margin-top: 1rem;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .field span {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .input-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .field-icon {
          position: absolute;
          left: 10px;
          color: var(--text-muted);
          pointer-events: none;
        }
        .field input, .field select {
          width: 100%;
          padding: 0.6rem 0.8rem;
          border: 1.5px solid var(--border);
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          background: var(--parchment);
          color: var(--text-primary);
          transition: border-color 0.15s;
          outline: none;
        }
        /* Add padding if icon exists handled by manually adding class or just generic */
        .input-icon-wrap input { padding-left: 34px; }
        
        .field input:focus, .field select:focus {
          border-color: var(--terracotta);
          background: white;
        }

        /* Button */
        .btn {
          display: flex; align-items: center; justify-content: center;
          padding: 0.65rem 1.4rem;
          border: none;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-primary {
          background: linear-gradient(135deg, var(--terracotta) 0%, #A0522D 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(201, 107, 47, 0.35);
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(201, 107, 47, 0.45); }
        .btn-primary:active { transform: translateY(0); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* Card */
        .card {
          background: white;
          border-radius: 16px;
          border: 1.5px solid var(--border);
          padding: 1.25rem;
          box-shadow: var(--shadow);
        }

        /* Results grid */
        .result-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          animation: fadeIn 0.3s ease;
        }
        .result-hero {
          grid-column: 1 / -1;
          background: linear-gradient(135deg, var(--earth-800) 0%, var(--green-900) 100%);
          color: white;
          border-color: var(--terracotta);
        }
        .stage-badge-wrap {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.2rem;
        }
        .stage-pill {
          padding: 0.4rem 1.2rem;
          border-radius: 100px;
          color: white;
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: 0.04em;
        }
        .stage-label {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.7);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .stat-row { display: flex; gap: 2rem; flex-wrap: wrap; }
        .stat { display: flex; flex-direction: column; }
        .stat-value { font-family: 'Playfair Display', serif; font-size: 2rem; line-height: 1; color: white; }
        .stat-unit { font-size: 0.7rem; color: var(--terracotta-light); text-transform: uppercase; font-weight: 600; margin-top: 0.1rem; }
        .stat-label { font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-top: 0.2rem; }

        .action-card h3 { 
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.9rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.5rem; 
        }
        .inline-icon { color: var(--terracotta); }
        .action-value { font-size: 0.9rem; color: var(--text-primary); line-height: 1.5; }
        .action-value strong { color: var(--terracotta); }

        .alert-card {
          grid-column: 1 / -1;
          background: #FFF8F0;
          border-color: var(--terracotta-light);
        }
        .alert-card h3 { 
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.9rem; font-weight: 700; color: var(--terracotta); margin-bottom: 0.4rem; 
        }
        .alert-card p { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; }

        /* Timeline */
        .timeline-card { grid-column: 1 / -1; }
        .timeline-card h3 {
          font-family: 'Playfair Display', serif;
          font-size: 1rem;
          margin-bottom: 1rem;
          color: var(--earth-800);
        }
        .timeline {
          display: flex;
          gap: 0;
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }
        .timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          min-width: 90px;
          position: relative;
        }
        .timeline-step:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 7px;
          left: 50%;
          width: 100%;
          height: 2px;
          background: var(--border);
          z-index: 0;
        }
        .timeline-step.past::after { background: var(--green-300); }
        .tl-dot {
          width: 16px; height: 16px;
          border-radius: 50%;
          background: var(--border);
          border: 2px solid white;
          box-shadow: 0 0 0 2px var(--border);
          z-index: 1;
          transition: all 0.2s;
        }
        .timeline-step.past .tl-dot { background: var(--green-300); box-shadow: 0 0 0 2px var(--green-300); }
        .timeline-step.active .tl-dot {
          width: 20px; height: 20px;
          box-shadow: 0 0 0 3px var(--terracotta), 0 0 0 6px rgba(201,107,47,0.2);
          animation: stagePulse 2s infinite;
        }
        @keyframes stagePulse {
          0%,100% { box-shadow: 0 0 0 3px var(--terracotta), 0 0 0 6px rgba(201,107,47,0.2); }
          50% { box-shadow: 0 0 0 3px var(--terracotta), 0 0 0 10px rgba(201,107,47,0.1); }
        }
        .tl-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 0.5rem;
          text-align: center;
        }
        .tl-info strong { font-size: 0.7rem; font-weight: 700; color: var(--text-primary); }
        .tl-info span { font-size: 0.62rem; color: var(--text-muted); margin-top: 0.1rem; }
        .timeline-step.active .tl-info strong { color: var(--terracotta); }

        /* Advisory */
        .advisory-result { margin-top: 1rem; animation: fadeIn 0.3s ease; }
        .advisory-indicators {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem 1rem;
          border-radius: 16px;
          border: 2px solid;
          background: white;
          text-align: center;
        }
        .indicator-yes { border-color: var(--terracotta); background: #FFF8F0; }
        .indicator-no { border-color: var(--green-300); background: #F0FAF0; }
        
        .ind-icon-wrap { margin-bottom: 0.5rem; color: inherit; }
        .indicator-yes .ind-icon-wrap { color: var(--terracotta); }
        .indicator-no .ind-icon-wrap { color: var(--green-500); }

        .ind-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: var(--text-muted); }
        .ind-status {
          font-family: 'Playfair Display', serif;
          font-size: 1rem;
          font-weight: 700;
          margin: 0.25rem 0;
        }
        .indicator-yes .ind-status { color: var(--terracotta); }
        .indicator-no .ind-status { color: var(--green-700); }
        .ind-conf { font-size: 0.72rem; color: var(--text-muted); }
        
        .rec-text-card h3 { 
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.9rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--earth-800); 
        }
        .rec-text { font-size: 0.875rem; line-height: 1.75; color: var(--text-secondary); }

        /* Upload */
        .upload-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .upload-label {
          cursor: pointer;
          width: 100%;
          max-width: 400px;
          border: 2.5px dashed var(--border);
          border-radius: 16px;
          overflow: hidden;
          transition: border-color 0.2s;
          min-height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .upload-label:hover { border-color: var(--terracotta); }
        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 2rem;
          color: var(--text-muted);
          text-align: center;
        }
        .upload-icon { color: var(--text-secondary); }
        .upload-hint { font-size: 0.72rem; }
        .preview-img {
          width: 100%;
          max-height: 280px;
          object-fit: cover;
          display: block;
        }
        .upload-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        /* Disease result */
        .disease-result { animation: fadeIn 0.3s ease; }
        .disease-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .disease-severity-badge {
          padding: 0.35rem 0.9rem;
          border-radius: 100px;
          color: white;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .flex-center-row { display: flex; align-items: center; }
        
        .confidence-tag {
          font-size: 0.78rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .disease-name {
          font-family: 'Playfair Display', serif;
          font-size: 1.3rem;
          color: var(--earth-800);
          margin-bottom: 1rem;
        }
        .disease-sections { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem; }
        
        .disease-block h4 {
          display: flex; align-items: center; gap: 0.4rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.4rem;
        }
        .inline-icon-sm { color: var(--terracotta); }
        
        .disease-block p { font-size: 0.85rem; line-height: 1.6; color: var(--text-primary); }
        .analysis-method { font-size: 0.7rem; color: var(--text-muted); font-style: italic; }

        /* Misc */
        .error-box {
          display: flex; align-items: center; gap: 0.5rem;
          background: #FFF0F0;
          border: 1.5px solid #F5AAAA;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: #C0392B;
          margin-bottom: 1rem;
        }
        .spinner-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 2rem;
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        .spinner {
          width: 32px; height: 32px;
          border: 3px solid var(--border);
          border-top-color: var(--terracotta);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .app-footer {
          text-align: center;
          padding: 1.5rem;
          font-size: 0.72rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border);
          background: var(--cream-dark);
          margin-top: auto;
        }

        /* Weather Source Banner */
        .weather-source-banner {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.65rem 1rem;
          border-radius: 10px;
          margin-bottom: 1rem;
          font-size: 0.82rem;
          font-weight: 500;
          flex-wrap: wrap;
        }
        .banner-auto {
          background: linear-gradient(135deg, rgba(45, 107, 66, 0.12) 0%, rgba(77, 144, 99, 0.08) 100%);
          border: 1.5px solid rgba(77, 144, 99, 0.4);
          color: var(--green-700);
        }
        .banner-manual {
          background: rgba(201, 107, 47, 0.07);
          border: 1.5px solid rgba(201, 107, 47, 0.3);
          color: var(--terracotta);
        }
        .banner-hint {
          background: var(--cream-dark);
          border: 1.5px dashed var(--border);
          color: var(--text-muted);
        }
        .banner-icon { font-size: 1rem; flex-shrink: 0; }
        .banner-text { flex: 1; line-height: 1.4; }
        .banner-toggle {
          flex-shrink: 0;
          padding: 0.3rem 0.75rem;
          border-radius: 6px;
          border: 1.5px solid currentColor;
          background: transparent;
          color: inherit;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .banner-toggle:hover { opacity: 0.75; }

        /* Auto chip on field labels */
        .auto-chip {
          display: inline-flex;
          align-items: center;
          margin-left: 0.4rem;
          padding: 1px 6px;
          background: var(--green-700);
          color: white;
          border-radius: 4px;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          vertical-align: middle;
        }

        /* Auto-filled field container */
        .field-auto .input-icon-wrap input,
        .field-auto select {
          background: rgba(45, 107, 66, 0.06);
          border-color: rgba(45, 107, 66, 0.35);
        }

        /* Read-only input */
        .input-readonly {
          cursor: default;
          color: var(--green-700) !important;
          font-weight: 600;
        }
        .input-readonly:focus { border-color: rgba(45, 107, 66, 0.35) !important; background: rgba(45, 107, 66, 0.06) !important; }

        @media (max-width: 600px) {
          .result-grid { grid-template-columns: 1fr; }
          .result-hero { grid-column: 1; }
          .alert-card { grid-column: 1; }
          .timeline-card { grid-column: 1; }
          .advisory-indicators { grid-template-columns: 1fr; }
          .disease-sections { grid-template-columns: 1fr; }
          .tab-btn { padding: 0.75rem 0.8rem; font-size: 0.78rem; }
          /* Allow input grid to be naturally responsive or force 1 col if very small */
        }

        /* ── Growth Plan v2 ─────────────────────────────────── */
        .growth-mini-form {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 1rem;
          align-items: end;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 640px) { .growth-mini-form { grid-template-columns: 1fr; } }
        .field-hint { font-size: 0.75rem; color: var(--terracotta); margin: 0.25rem 0 0; }
        .loading-phase { font-size: 0.78rem; font-weight: 500; opacity: 0.85; }
        .gdd-source-note {
          font-size: 0.75rem; color: var(--text-muted);
          margin: 0.75rem 0 0; border-top: 1px solid var(--border); padding-top: 0.5rem;
        }
        .data-source-note { font-size: 0.7rem; color: var(--text-muted); text-align: right; margin: 0.5rem 0 0; opacity: 0.7; }
        .stat-highlight .stat-value { color: #e8a045; text-shadow: 0 0 12px rgba(232,160,69,0.35); }
        .soil-card { grid-column: span 1; }
        .soil-gauges { display: flex; flex-direction: column; gap: 0.7rem; margin-top: 0.75rem; }
        .soil-gauge { display: flex; align-items: center; gap: 0.65rem; }
        .sg-label { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); width: 4.5rem; flex-shrink: 0; }
        .sg-track { flex: 1; height: 8px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden; }
        .sg-fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
        .sg-value { font-size: 0.72rem; font-weight: 700; min-width: 7rem; }
        .sg-status { font-weight: 400; opacity: 0.7; margin-left: 0.2rem; }
        .soil-temp { font-size: 0.8rem; color: var(--text-muted); margin: 0.75rem 0 0; }
        .forecast-card { grid-column: 1 / -1; }
        .forecast-strip {
          display: flex; gap: 0; overflow-x: auto;
          margin-top: 0.75rem; padding-bottom: 0.5rem; scrollbar-width: thin;
        }
        .forecast-day {
          display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
          flex: 1; min-width: 3.2rem; padding: 0.4rem 0.2rem;
          border-right: 1px solid rgba(255,255,255,0.05);
        }
        .forecast-day:last-child { border-right: none; }
        .fc-date { font-size: 0.62rem; color: var(--text-muted); font-weight: 600; text-align: center; }
        .fc-max { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); }
        .fc-min { font-size: 0.72rem; color: var(--text-muted); }
        .fc-rain { font-size: 0.65rem; }
        .fc-bar-wrap {
          width: 6px; height: 40px; background: rgba(255,255,255,0.06);
          border-radius: 3px; display: flex; align-items: flex-end; overflow: hidden;
        }
        .fc-bar { width: 100%; border-radius: 3px; transition: height 0.4s ease; min-height: 3px; }
        @media (max-width: 600px) { .forecast-card { grid-column: 1; } }
      `}</style>
    </div>
  );
}