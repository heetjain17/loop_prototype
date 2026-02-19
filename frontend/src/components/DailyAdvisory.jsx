import { useState, useEffect } from "react";
import {
  LineChart,
  Droplets,
  ThermometerSun,
  CloudRain,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sprout,
  ArrowRight,
  Lightbulb,
  MapPin,
  Pencil,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, InfoBanner } from "./ui";
import SpeechButton from "./SpeechButton";

const API = "http://localhost:8000";
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";

const CROP_STAGES = [
  "Germination", "Vegetative", "Tillering",
  "Jointing", "Tasseling", "Silking", "Flowering", "Maturity",
];

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

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function DailyAdvisory({ weatherData }) {
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

  // Auto-fill weather & soil fields
  useEffect(() => {
    if (useAutoWeather && weatherData) {
      setForm((f) => ({
        ...f,
        temperature: String(weatherData.temp),
        humidity: String(weatherData.humidity),
        rainfall_last_3_days: String(weatherData.rainfall_last_3_days),
      }));

      if (weatherData.lat && weatherData.lon) {
        fetchOpenMeteoCurrent(weatherData.lat, weatherData.lon)
          .then((data) => {
            const sm = data.hourly.soil_moisture_0_to_1cm?.[6];
            if (sm != null) {
              setForm((f) => ({
                ...f,
                soil_moisture: (sm * 100).toFixed(1),
              }));
            }
          })
          .catch((err) =>
            console.error("Failed to auto-fetch soil moisture:", err)
          );
      }
    }
  }, [weatherData, useAutoWeather]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const hasWeather = !!weatherData;
  const isAuto = hasWeather && useAutoWeather;
  const autoFields = new Set([
    "temperature",
    "humidity",
    "rainfall_last_3_days",
    "soil_moisture",
  ]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
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

  // Confidence meaning helper
  const getConfidenceMeaning = (conf) => {
    if (conf >= 0.85) return t('sections.advisory.hints.conf_high');
    if (conf >= 0.6) return t('sections.advisory.hints.conf_mod');
    return t('sections.advisory.hints.conf_low');
  };

  return (
    <section className="feature-section">
      <div className="section-header">
        <LineChart className="section-icon" strokeWidth={1.5} />
        <div>
          <h2>{t("sections.advisory.title")}</h2>
          <p className="section-sub">{t("sections.advisory.subtitle")}</p>
        </div>
      </div>

      {/* Weather source banner */}
      {hasWeather ? (
        <InfoBanner
          variant={isAuto ? "auto" : "manual"}
          icon={isAuto ? CloudRain : Pencil}
          action={isAuto ? t('sections.advisory.hints.enter_manual') : t('sections.advisory.hints.use_live')}
          onAction={() => setUseAutoWeather((v) => !v)}
        >
          {isAuto
            ? t('sections.advisory.hints.using_live', { city: weatherData.city, temp: weatherData.temp, humidity: weatherData.humidity })
            : t('sections.advisory.hints.manual_mode')}
        </InfoBanner>
      ) : (
        <InfoBanner variant="hint" icon={Lightbulb}>
          {t('sections.advisory.hints.no_weather')}
        </InfoBanner>
      )}

      <form onSubmit={submit} className="input-grid">
        {[
          ["soil_moisture", t("sections.advisory.form.soil_moisture"), "28", Droplets],
          ["temperature", t("sections.advisory.form.temperature"), "34", ThermometerSun],
          ["humidity", t("sections.advisory.form.humidity"), "60", CloudRain],
          ["rainfall_last_3_days", t("sections.advisory.form.rainfall_last_3_days"), "12", CloudRain],
          ["days_since_last_irrigation", t("sections.advisory.form.days_since_irrigation"), "4", Calendar],
        ].map(([key, label, placeholder, IconComp]) => {
          const fieldIsAuto = isAuto && autoFields.has(key);
          return (
            <label className={`field ${fieldIsAuto ? "field-auto" : ""}`} key={key}>
              <span>
                {label}
                {fieldIsAuto && <span className="auto-chip">{t('sections.advisory.hints.auto')}</span>}
              </span>
              <div className="input-icon-wrap">
                {IconComp && <IconComp size={16} className="field-icon" />}
                <input
                  type="number"
                  placeholder={fieldIsAuto ? "" : placeholder}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  readOnly={fieldIsAuto}
                  className={fieldIsAuto ? "input-readonly" : ""}
                  required
                />
              </div>
            </label>
          );
        })}

        <label className="field">
          <span>{t("sections.advisory.form.current_crop_stage")}</span>
          <select
            value={form.crop_stage}
            onChange={(e) => set("crop_stage", e.target.value)}
          >
            {CROP_STAGES.map((s) => (
              <option key={s} value={s}>
                {t(`stages.${s}`) || s}
              </option>
            ))}
          </select>
        </label>

        <div className="field submit-col">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading
              ? t("common.analyzing")
              : t("sections.advisory.form.submit")}
            {!loading && <ArrowRight size={16} style={{ marginLeft: 8 }} />}
          </button>
        </div>
      </form>

      {error && (
        <div className="error-box">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {result && (
        <div className="advisory-result">
          <div className="advisory-indicators">
            <div
              className={cn(
                "indicator",
                result.irrigation_required ? "indicator-yes" : "indicator-no"
              )}
            >
              <span className="ind-icon-wrap">
                {result.irrigation_required ? (
                  <Droplets size={32} />
                ) : (
                  <CheckCircle2 size={32} />
                )}
              </span>
              <span className="ind-label">
                {t("sections.advisory.results.irrigation")}
              </span>
              <span className="ind-status">
                {result.irrigation_required
                  ? t("sections.advisory.results.required")
                  : t("sections.advisory.results.not_needed")}
              </span>
              <span className="ind-conf">
                {t("common.confidence", {
                  percent: Math.round(result.irrigation_confidence * 100),
                })}
              </span>
              <div className="significance-note" style={{ marginTop: "0.5rem" }}>
                <Info size={14} className="sig-icon" />
                <span>{getConfidenceMeaning(result.irrigation_confidence)}</span>
              </div>
            </div>
            <div
              className={cn(
                "indicator",
                result.fertilizer_required ? "indicator-yes" : "indicator-no"
              )}
            >
              <span className="ind-icon-wrap">
                {result.fertilizer_required ? (
                  <Sprout size={32} />
                ) : (
                  <CheckCircle2 size={32} />
                )}
              </span>
              <span className="ind-label">
                {t("sections.advisory.results.fertilizer")}
              </span>
              <span className="ind-status">
                {result.fertilizer_required
                  ? t("sections.advisory.results.required")
                  : t("sections.advisory.results.not_needed")}
              </span>
              <span className="ind-conf">
                {t("common.confidence", {
                  percent: Math.round(result.fertilizer_confidence * 100),
                })}
              </span>
              <div className="significance-note" style={{ marginTop: "0.5rem" }}>
                <Info size={14} className="sig-icon" />
                <span>{getConfidenceMeaning(result.fertilizer_confidence)}</span>
              </div>
            </div>
          </div>
          <Card className="rec-text-card">
            <h3>
              <Info size={18} className="inline-icon" />{" "}
              {t("sections.advisory.results.full_recommendation")}
            </h3>
            <p className="rec-text">{result.recommendation_text}</p>
            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <SpeechButton
                text={result.recommendation_text}
                lang={i18n.language.split("-")[0]}
              />
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
