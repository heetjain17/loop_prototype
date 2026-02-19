import { useState } from "react";
import {
  Microscope,
  AlertTriangle,
  CheckCircle2,
  Pill,
  ShieldCheck,
  Camera,
  FileImage,
  Upload,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, Spinner } from "./ui";
import SpeechButton from "./SpeechButton";

const API = "http://localhost:8000";

const severityColor = {
  None: "#4A9063",
  "Low–Moderate": "#E8A045",
  Moderate: "#D4842A",
  "Moderate–High": "#C96B2F",
  High: "#A0311A",
};

// Severity explanations are now handled via translations

export default function DiseaseDetector() {
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
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  }

  async function analyze() {
    if (!file) return;
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const lang = i18n.language.split("-")[0];
      const res = await fetch(`${API}/detect-disease?lang=${lang}`, {
        method: "POST",
        body: fd,
      });
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

  return (
    <section className="feature-section">
      <div className="section-header">
        <Microscope className="section-icon" strokeWidth={1.5} />
        <div>
          <h2>{t("sections.disease.title")}</h2>
          <p className="section-sub">{t("sections.disease.subtitle")}</p>
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
              <span>{t("sections.disease.upload.placeholder")}</span>
              <span className="upload-hint">
                {t("sections.disease.upload.hint")}
              </span>
            </div>
          )}
        </label>

        {file && (
          <div className="upload-meta">
            <FileImage size={14} />
            <span>{file.name}</span>
            <span>
              {t("sections.disease.upload.file_size", {
                size: (file.size / 1024).toFixed(1),
              })}
            </span>
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={analyze}
          disabled={!file || loading}
        >
          {loading
            ? t("sections.disease.upload.btn_analyzing")
            : t("sections.disease.upload.btn_analyze")}
          {!loading && <Upload size={16} style={{ marginLeft: 8 }} />}
        </button>
      </div>

      {loading && <Spinner />}
      {error && (
        <div className="error-box">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {result && (
        <Card className="disease-result">
          <div className="disease-header">
            <div
              className="disease-severity-badge"
              style={{
                background: severityColor[result.severity] || "#888",
              }}
            >
              {result.severity === "None" ? (
                <span className="flex-center-row">
                  <CheckCircle2 size={14} style={{ marginRight: 4 }} />{" "}
                  {t("sections.disease.results.healthy")}
                </span>
              ) : (
                <span className="flex-center-row">
                  <AlertTriangle size={14} style={{ marginRight: 4 }} />{" "}
                  {t("sections.disease.results.severity", {
                    level: result.severity,
                  })}
                </span>
              )}
            </div>
            <span className="confidence-tag">
              {t("common.confidence", {
                percent: Math.round(result.confidence * 100),
              })}
            </span>
            <div style={{ marginLeft: "1rem" }}>
              <SpeechButton
                text={`${result.disease_detected}. ${t("sections.disease.results.severity", { level: result.severity })}. ${t("sections.disease.results.treatment")}: ${result.recommendation}. ${t("sections.disease.results.prevention")}: ${result.prevention}`}
                lang={i18n.language.split("-")[0]}
              />
            </div>
          </div>

          <h3 className="disease-name">{result.disease_detected}</h3>

          {/* Severity explanation */}
          <div className="significance-note" style={{ marginBottom: "1rem" }}>
            <Info size={14} className="sig-icon" />
            <span>
              {t(`sections.disease.hints.severity_${result.severity === 'None' ? 'none' : result.severity === 'Low–Moderate' ? 'low' : result.severity === 'Moderate' ? 'moderate' : result.severity === 'Moderate–High' ? 'mod_high' : 'high'}`,
                t('sections.disease.hints.severity_fallback'))}
            </span>
          </div>

          <div className="disease-sections">
            <div className="disease-block">
              <h4>
                <Pill size={14} className="inline-icon-sm" />{" "}
                {t("sections.disease.results.treatment")}
              </h4>
              <p>{result.recommendation}</p>
            </div>
            <div className="disease-block">
              <h4>
                <ShieldCheck size={14} className="inline-icon-sm" />{" "}
                {t("sections.disease.results.prevention")}
              </h4>
              <p>{result.prevention}</p>
            </div>
          </div>
          <p className="analysis-method">
            {t("sections.disease.results.analysis_method", {
              method: result.analysis_method,
            })}
          </p>
        </Card>
      )}
    </section>
  );
}
