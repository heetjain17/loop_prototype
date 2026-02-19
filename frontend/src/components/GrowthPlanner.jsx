import { useState } from "react";
import {
  Sprout,
  Droplets,
  ThermometerSun,
  Calendar,
  AlertTriangle,
  Zap,
  Sun,
  MapPin,
  Lightbulb,
  TrendingUp,
  BarChart3,
  Cpu,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, Stat, SoilGauge, InfoBanner } from "./ui";
import SpeechButton from "./SpeechButton";

// ── API helpers ───────────────────────────────────────────────────
const API = "http://localhost:8000";
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";
const OPEN_METEO_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";
const CROP_BASE_TEMPS = { wheat: 5, rice: 10, jowar: 10, maize: 10 };

async function fetchHistoricalGDD(lat, lon, sowingDate, baseTemp) {
  const end = new Date();
  end.setDate(end.getDate() - 2);
  const endDate = end.toISOString().split("T")[0];
  if (sowingDate >= endDate) {
    return { accumulated_gdd: 0, avg_tmax: 0, avg_tmin: 0, days: 0 };
  }
  const url =
    `${OPEN_METEO_ARCHIVE}?latitude=${lat}&longitude=${lon}` +
    `&start_date=${sowingDate}&end_date=${endDate}` +
    `&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `Historical weather fetch failed (${res.status}): ${body.reason || body.error || "unknown error"}`
    );
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
  return {
    accumulated_gdd: Math.round(accumulated * 10) / 10,
    avg_tmax: Math.round(avgTmax * 10) / 10,
    avg_tmin: Math.round(avgTmin * 10) / 10,
    days,
  };
}

async function fetchOpenMeteoCurrent(lat, lon) {
  const url =
    `${OPEN_METEO_BASE}/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&hourly=soil_moisture_0_to_1cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,soil_temperature_6cm` +
    `&current=temperature_2m,relative_humidity_2m` +
    `&forecast_days=16&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not fetch forecast/soil data.");
  return res.json();
}

// ── Crop stages ───────────────────────────────────────────────────
const stageColors = {
  Germination: "#7DAF5C",
  Vegetative: "#4A9063",
  Tillering: "#3A7A52",
  Jointing: "#2D6B42",
  Tasseling: "#E8A045",
  Silking: "#D4842A",
  Flowering: "#C96B2F",
  Maturity: "#A0522D",
};

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// ── Component ─────────────────────────────────────────────────────
export default function GrowthPlanner({ weatherData }) {
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
    setError("");
    setResult(null);
    setOpenMeteoData(null);
    setLoading(true);
    try {
      const lat = weatherData.lat;
      const lon = weatherData.lon;
      const baseTemp = CROP_BASE_TEMPS[cropType] ?? 10;

      setFetchPhase(t('sections.growth.hints.fetch_hist'));
      const hist = await fetchHistoricalGDD(lat, lon, sowingDate, baseTemp);

      setFetchPhase(t('sections.growth.hints.fetch_soil'));
      const omData = await fetchOpenMeteoCurrent(lat, lon);
      setOpenMeteoData(omData);

      setFetchPhase(t('sections.growth.hints.fetch_analyse'));
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
          lat,
          lon,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Backend error");
      }
      const data = await res.json();
      setResult({ ...data, hist });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setFetchPhase("");
    }
  }

  // Extract soil moisture
  const soilMoisture = openMeteoData
    ? {
        shallow: openMeteoData.hourly.soil_moisture_0_to_1cm?.[6] ?? null,
        mid: openMeteoData.hourly.soil_moisture_3_to_9cm?.[6] ?? null,
        deep: openMeteoData.hourly.soil_moisture_9_to_27cm?.[6] ?? null,
        soilTemp: openMeteoData.hourly.soil_temperature_6cm?.[6] ?? null,
      }
    : null;

  const forecast16 = openMeteoData?.daily ?? null;

  // GDD significance helper
  const getGddSignificance = (gdd) => {
    if (gdd < 200) return t('sections.growth.hints.gdd_early');
    if (gdd < 500) return t('sections.growth.hints.gdd_active');
    if (gdd < 900) return t('sections.growth.hints.gdd_mid');
    return t('sections.growth.hints.gdd_late');
  };

  return (
    <section className="feature-section">
      <div className="section-header">
        <Sprout className="section-icon" strokeWidth={1.5} />
        <div>
          <h2>{t("sections.growth.title")}</h2>
          <p className="section-sub">
            {t('sections.growth.subtitle')}
          </p>
        </div>
      </div>

      {/* Location banner */}
      {hasLocation ? (
        <InfoBanner variant="auto" icon={MapPin}>
        <div className="flex gap-1 align-center">
           {t('sections.growth.hints.location')}: <strong>{weatherData.cityName || weatherData.city}</strong>
          &nbsp;·&nbsp;
          <ThermometerSun size={14} style={{ verticalAlign: "middle" }} />{" "}
          {weatherData.temp}°C &nbsp;·&nbsp;
          <Droplets size={14} style={{ verticalAlign: "middle" }} />{" "}
          {weatherData.humidity}%
        </div>
        </InfoBanner>
      ) : (
        <InfoBanner variant="hint" icon={Lightbulb}>
          {t('sections.growth.hints.no_location')}
        </InfoBanner>
      )}

      {/* Minimal 2-field form */}
      <form onSubmit={submit} className="growth-mini-form">
        <label className="field">
          <span>{t("sections.growth.form.crop_type")}</span>
          <select value={cropType} onChange={(e) => setCropType(e.target.value)}>
            {["wheat", "rice", "jowar", "maize"].map((c) => (
              <option key={c} value={c}>
                {t(`crops.${c}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t("sections.growth.form.sowing_date")}</span>
          <div className="input-icon-wrap">
            <Calendar size={16} className="field-icon" />
            <input
              type="date"
              value={sowingDate}
              onChange={(e) => setSowingDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
        </label>

        <div className="field submit-col">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !hasLocation}
          >
            {loading ? (
              <span className="loading-phase">
                {fetchPhase || t('common.analyzing')}
              </span>
            ) : (
              <>
                <Sprout size={16} style={{ marginRight: 8 }} />
                {t('sections.growth.form.submit')}
              </>
            )}
          </button>
          {!hasLocation && (
            <p className="field-hint" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>{t('sections.growth.hints.set_location')}</span>
            </p>
          )}
        </div>
      </form>

      {error && (
        <div className="error-box flex gap-1 align-center">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {result && (
        <div className="result-grid">
          {/* Hero: Stage + Real GDD */}
          <Card className="result-hero">
            <div className="stage-badge-wrap">
              <div
                className="stage-pill"
                style={{ background: stageColors[result.current_stage] || "#5A8A45" }}
              >
                {t(`stages.${result.current_stage}`) || result.current_stage}
              </div>
              <span className="stage-label">{t('sections.growth.results.current_stage')}</span>
            </div>
            <div className="stat-row">
              <Stat
                label={t('sections.growth.results.days_since_sowing')}
                value={result.days_since_sowing}
                unit="days"
              />
              <Stat
                label={t('sections.growth.results.accumulated_gdd')}
                value={result.hist.accumulated_gdd}
                unit="°C·days"
                highlight
                description={getGddSignificance(result.hist.accumulated_gdd)}
              />
              <Stat
                label={t('sections.growth.hints.avg_high')}
                value={result.hist.avg_tmax}
                unit="°C"
              />
              <Stat
                label={t('sections.growth.hints.avg_low')}
                value={result.hist.avg_tmin}
                unit="°C"
              />
            </div>
            <p className="gdd-source-note">
              <TrendingUp size={14} />
              {t('sections.growth.hints.gdd_source', { days: result.hist.days })}
            </p>
          </Card>

          {/* Soil Moisture Card */}
          {soilMoisture && soilMoisture.shallow !== null && (
            <Card className="soil-card">
              <h3>
                <Droplets size={18} className="inline-icon" /> {t('sections.growth.hints.live_soil')}
              </h3>
              <div className="significance-note">
                <Lightbulb size={14} className="sig-icon" />
                <span>
                  {t('sections.growth.hints.soil_explain')}
                </span>
              </div>
              <div className="soil-gauges">
                <SoilGauge label="0–1 cm" value={soilMoisture.shallow} color="#43a89e" />
                <SoilGauge label="3–9 cm" value={soilMoisture.mid} color="#2d7a70" />
                <SoilGauge label="9–27 cm" value={soilMoisture.deep} color="#1a5c53" />
              </div>
              {soilMoisture.soilTemp !== null && (
                <p className="soil-temp">
                  <ThermometerSun size={14} />
                  {t('sections.growth.hints.soil_temp')}:{" "}
                  <strong>{soilMoisture.soilTemp.toFixed(1)}°C</strong>
                </p>
              )}
              <p className="data-source-note">{t('sections.growth.hints.data_source_live')}</p>
            </Card>
          )}

          {/* 16-day Forecast Strip */}
          {forecast16 && (
            <Card className="forecast-card">
              <h3>
                <Sun size={18} className="inline-icon" /> {t('sections.growth.hints.forecast_title')}
              </h3>
              <div className="forecast-strip">
                {forecast16.time?.slice(0, 16).map((date, i) => (
                  <div key={date} className="forecast-day">
                    <span className="fc-date">
                      {new Date(date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="fc-max">
                      {Math.round(forecast16.temperature_2m_max?.[i])}°
                    </span>
                    <div className="fc-bar-wrap">
                      <div
                        className="fc-bar"
                        style={{
                          height: `${Math.min(
                            100,
                            ((forecast16.temperature_2m_max?.[i] ?? 20) / 45) *
                              100
                          )}%`,
                          background:
                            (forecast16.temperature_2m_max?.[i] ?? 20) > 38
                              ? "#ef4444"
                              : "#4ade80",
                        }}
                      />
                    </div>
                    <span className="fc-min">
                      {Math.round(forecast16.temperature_2m_min?.[i])}°
                    </span>
                    {(forecast16.precipitation_sum?.[i] ?? 0) > 1 && (
                      <span className="fc-rain">
                        <Droplets size={12} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="data-source-note">{t('sections.growth.hints.data_source_forecast')}</p>
            </Card>
          )}

          {/* Irrigation + Fertilizer */}
          <Card className="action-card">
            <h3>
              <Droplets size={18} className="inline-icon" />{" "}
              {t("sections.growth.results.irrigation")}
            </h3>
            <p className="action-value">
              {t("sections.growth.results.next_window", {
                days: result.next_irrigation_in_days,
              })}
            </p>
            <div className="significance-note">
              <Lightbulb size={14} className="sig-icon" />
              <span>
                {t('sections.growth.hints.irrigation_explain')}
              </span>
            </div>
          </Card>

          <Card className="action-card">
            <h3>
              <Sprout size={18} className="inline-icon" />{" "}
              {t("sections.growth.results.fertilizer")}
            </h3>
            <p className="action-value">{result.fertilizer_recommendation}</p>
          </Card>

          {/* Risk Alert */}
          <Card className="alert-card">
            <h3>
              <Zap size={18} className="inline-icon" />{" "}
              {t("sections.growth.results.risk_alert")}
            </h3>
            <p>{result.risk_alert}</p>
          </Card>

          {/* Speech */}
          <div
            className="speech-container"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "1rem",
              gridColumn: "1 / -1",
            }}
          >
            <SpeechButton
              text={`Stage: ${t("stages." + result.current_stage) || result.current_stage}. Accumulated GDD: ${result.hist.accumulated_gdd} degree days. ${t("sections.growth.results.irrigation")}: ${t("sections.growth.results.next_window", { days: result.next_irrigation_in_days })}. ${result.fertilizer_recommendation}. ${result.risk_alert}`}
              lang={i18n.language.split("-")[0]}
            />
          </div>

          {/* Stage Timeline */}
          <Card className="timeline-card">
            <h3>
              {t("sections.growth.results.season_timeline", {
                crop: result.crop_type,
              })}
            </h3>
            <div className="timeline">
              {result.all_stages.map((s, i) => {
                const active = s.name === result.current_stage;
                const past = result.days_since_sowing > s.end_day;
                return (
                  <div
                    key={i}
                    className={cn(
                      "timeline-step",
                      active && "active",
                      past && "past"
                    )}
                  >
                    <div
                      className="tl-dot"
                      style={{
                        background: active
                          ? stageColors[s.name]
                          : undefined,
                      }}
                    />
                    <div className="tl-info">
                      <strong>
                        {t(`stages.${s.name}`) || s.name}
                      </strong>
                      <span>
                        {t("sections.growth.results.timeline_days", {
                          start: s.start_day,
                          end: s.end_day,
                        })}
                      </span>
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
