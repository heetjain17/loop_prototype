import { useTranslation } from "react-i18next";

export function Card({ children, className }) {
  return (
    <div className={`card${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}

export function Spinner() {
  const { t } = useTranslation();
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <span>{t("common.analyzing")}</span>
    </div>
  );
}

export function Stat({ label, value, unit, highlight, description }) {
  return (
    <div className={`stat${highlight ? " stat-highlight" : ""}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-unit">{unit}</span>
      <span className="stat-label">{label}</span>
      {description && (
        <span className="significance-note" style={{ marginTop: "0.35rem", padding: "0.3rem 0.5rem", fontSize: "0.68rem" }}>
          {description}
        </span>
      )}
    </div>
  );
}

export function SoilGauge({ label, value, color }) {
  const pct = Math.min(100, Math.round((value / 0.5) * 100));
  const status =
    pct < 20 ? "Dry" : pct < 50 ? "Low" : pct < 75 ? "Adequate" : "Saturated";
  const statusHint =
    pct < 20
      ? "Consider irrigating soon"
      : pct < 50
      ? "Monitor closely"
      : pct < 75
      ? "No action needed"
      : "Drainage may help";

  return (
    <div className="soil-gauge">
      <div className="sg-label">{label}</div>
      <div className="sg-track">
        <div className="sg-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="sg-value">
        {(value * 100).toFixed(1)}%{" "}
        <span className="sg-status">
          {status} — {statusHint}
        </span>
      </div>
    </div>
  );
}

export function InfoBanner({
  variant = "hint",
  icon: Icon,
  children,
  action,
  onAction,
}) {
  const variantClass =
    variant === "auto"
      ? "banner-auto"
      : variant === "manual"
      ? "banner-manual"
      : "banner-hint";

  return (
    <div className={`weather-source-banner ${variantClass}`}>
      {Icon && (
        <span className="banner-icon">
          <Icon size={18} />
        </span>
      )}
      <span className="banner-text">{children}</span>
      {action && (
        <button type="button" className="banner-toggle" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}
