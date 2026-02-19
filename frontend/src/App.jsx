import { useState } from "react";
import {
  Sprout,
  LineChart,
  Microscope,
  CloudRain,
  Leaf,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./components/LanguageSwitcher";
import WeatherAdvisory from "./components/WeatherAdvisory";
import GrowthPlanner from "./components/GrowthPlanner";
import DailyAdvisory from "./components/DailyAdvisory";
import DiseaseDetector from "./components/DiseaseDetector";
import "./app.styles.css";

// ── Utilities ─────────────────────────────────────────────────────
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// ── Tab definitions ───────────────────────────────────────────────
const TABS = [
  { id: "growth", label: "tabs.growth", icon: Sprout },
  { id: "advisory", label: "tabs.advisory", icon: LineChart },
  { id: "disease", label: "tabs.disease", icon: Microscope },
  { id: "weather", label: "tabs.weather", icon: CloudRain },
];

// ── App Shell ─────────────────────────────────────────────────────
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
              <h1>{t("app_title")}</h1>
              <span className="brand-tagline">{t("app_tagline")}</span>
            </div>
          </div>
          <div className="header-right">
            <LanguageSwitcher />
            <div className="header-badge">
              <span className="dot-live" />
              {t("ai_active")}
            </div>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="tab-nav">
        {TABS.map((tabItem) => (
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

      {/* Main — all panels always mounted, hiddenattribute for inactive */}
      <main className="main-content h-full">
        <div className="tab-panel" hidden={tab !== "growth"}>
          <GrowthPlanner weatherData={weatherData} />
        </div>
        <div className="tab-panel" hidden={tab !== "advisory"}>
          <DailyAdvisory weatherData={weatherData} />
        </div>
        <div className="tab-panel" hidden={tab !== "disease"}>
          <DiseaseDetector />
        </div>
        <div className="tab-panel" hidden={tab !== "weather"}>
          <WeatherAdvisory
            onWeatherFetched={setWeatherData}
            weather={weather}
            setWeather={setWeather}
            forecast={forecast}
            setForecast={setForecast}
            location={weatherLocation}
            setLocation={setWeatherLocation}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>{t("footer")}</p>
      </footer>
    </div>
  );
}