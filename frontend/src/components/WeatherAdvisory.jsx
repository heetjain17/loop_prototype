import { useState, useEffect } from "react";
import {
    CloudRain,
    Sun,
    Wind,
    Droplets,
    MapPin,
    Search,
    AlertTriangle,
    ThermometerSun,
    Umbrella,
    CloudLightning,
    CloudSnow,
    CloudFog,
    Cloud
} from "lucide-react";
import { useTranslation } from "react-i18next";
import "./WeatherAdvisory.css";

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

const WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

export default function WeatherAdvisory() {
    const { t } = useTranslation();

    const [location, setLocation] = useState("");
    const [weather, setWeather] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [coords, setCoords] = useState(null);

    // Auto-detect location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCoords({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                },
                (err) => {
                    console.error("Location permission denied or error:", err);
                    // Fallback or just stop loading
                    setLoading(false);
                    // Could set a default location here if desired
                }
            );
        }
    }, []);

    // Fetch whenever coords change
    useEffect(() => {
        if (coords) {
            fetchWeatherData(coords.lat, coords.lon);
        }
    }, [coords]);

    const fetchWeatherData = async (lat, lon, query = null) => {
        if (!API_KEY || API_KEY === "YOUR_OPENWEATHER_API_KEY_HERE") {
            setError("Missing API Key. Please add OpenWeatherMap API Key in code.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            let weatherUrl, forecastUrl;

            if (query) {
                weatherUrl = `${WEATHER_BASE_URL}/weather?q=${query}&units=metric&appid=${API_KEY}`;
                forecastUrl = `${WEATHER_BASE_URL}/forecast?q=${query}&units=metric&appid=${API_KEY}`;
            } else {
                weatherUrl = `${WEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
                forecastUrl = `${WEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
            }

            const [wRes, fRes] = await Promise.all([
                fetch(weatherUrl),
                fetch(forecastUrl)
            ]);

            if (!wRes.ok) {
                const err = await wRes.json().catch(() => ({}));
                throw new Error(`Weather API Error: ${wRes.status} ${err.message || wRes.statusText}`);
            }
            if (!fRes.ok) {
                const err = await fRes.json().catch(() => ({}));
                throw new Error(`Forecast API Error: ${fRes.status} ${err.message || fRes.statusText}`);
            }

            const wData = await wRes.json();
            const fData = await fRes.json();

            setWeather(wData);
            // Process forecast to get daily summary (API returns 3-hour intervals)
            // We'll take one reading per day (e.g., at noon)
            const dailyForecast = fData.list.filter(reading => reading.dt_txt.includes("12:00:00"));
            setForecast(dailyForecast.slice(0, 5)); // Next 5 days
            setLocation(`${wData.name}, ${wData.sys.country}`); // Update displayed location

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (location.trim()) {
            fetchWeatherData(null, null, location);
        }
    };

    const handleLocateMe = () => {
        if (navigator.geolocation) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCoords({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                },
                (err) => {
                    setError("Location access denied.");
                    setLoading(false);
                }
            );
        } else {
            setError("Geolocation not supported by this browser.");
        }
    };

    // ── Advisory Logic ───────────────────────────────────────────────────────────
    const getAdvisories = (current, forecastList) => {
        const advisories = [];
        if (!current || !forecastList) return advisories;

        // 1. Rain Forecast
        const rainExpected = forecastList.some(day => day.weather[0].main === "Rain");
        const rainSoon = forecastList.slice(0, 2).some(day => day.weather[0].main === "Rain");

        if (rainSoon) {
            advisories.push({
                type: "warning",
                text: "Rain expected in next 48 hours. Delay spraying pesticides/fertilizers.",
                icon: Umbrella
            });
        } else if (!rainExpected) {
            advisories.push({
                type: "success",
                text: "No rain forecast. Suitable for irrigation and spraying.",
                icon: Sun
            });
        }

        // 2. Wind
        if (current.wind.speed > 5) { // roughly > 18 km/h
            advisories.push({
                type: "warning",
                text: `High wind speed combine (${current.wind.speed} m/s). Avoid spraying to prevent drift.`,
                icon: Wind
            });
        }

        // 3. Humidity/Fungal Risk
        if (current.main.humidity > 80) {
            advisories.push({
                type: "alert",
                text: "High humidity (>80%). Increased risk of fungal diseases. Monitor crops closely.",
                icon: Droplets
            });
        }

        // 4. Temperature Stress
        if (current.main.temp > 35) {
            advisories.push({
                type: "warning",
                text: "Heat stress likelihood. Ensure adequate irrigation.",
                icon: ThermometerSun
            });
        }

        return advisories;
    };

    const getWeatherIcon = (weatherId) => {
        // Simple mapping based on OpenWeatherMap condition codes
        // https://openweathermap.org/weather-conditions
        if (weatherId >= 200 && weatherId < 300) return <CloudLightning size={48} className="text-yellow-600" />;
        if (weatherId >= 300 && weatherId < 500) return <CloudRain size={48} className="text-blue-400" />;
        if (weatherId >= 500 && weatherId < 600) return <CloudRain size={48} className="text-blue-600" />;
        if (weatherId >= 600 && weatherId < 700) return <CloudSnow size={48} className="text-blue-200" />;
        if (weatherId >= 700 && weatherId < 800) return <CloudFog size={48} className="text-gray-400" />;
        if (weatherId === 800) return <Sun size={48} className="text-orange-500" />;
        if (weatherId > 800) return <Cloud size={48} className="text-gray-500" />;
        return <Sun size={48} />;
    };

    const getDayName = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    };

    const advisories = getAdvisories(weather, forecast);

    return (
        <section className="weather-section">
            <div className="section-header">
                <Sun className="section-icon" strokeWidth={1.5} />
                <div>
                    <h2>{t('sections.weather.title')}</h2>
                    <p className="section-sub">{t('sections.weather.subtitle')}</p>
                </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="weather-header-card">
                <div className="location-bar">
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t('sections.weather.search_placeholder')}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />
                    <button type="button" onClick={handleLocateMe} className="locate-btn" title={t('sections.weather.locate_me')}>
                        <MapPin size={20} />
                    </button>
                    <button type="submit" className="locate-btn" style={{ background: 'var(--terracotta)' }}>
                        <Search size={20} />
                    </button>
                </div>

                {error && (
                    <div className="error-box">
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}

                {loading ? (
                    <div className="loading-skeleton"></div>
                ) : weather ? (
                    <>
                        <div className="current-weather">
                            <div>
                                <div className="temp-large">{Math.round(weather.main.temp)}°</div>
                                <div className="weather-desc">{weather.weather[0].description}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{weather.name}</div>
                            </div>
                            <div>
                                {getWeatherIcon(weather.weather[0].id)}
                            </div>
                        </div>

                        <div className="weather-stats">
                            <div className="stat-box">
                                <Droplets className="stat-icon mx-auto" size={20} />
                                <span className="stat-label">{t('sections.weather.humidity')}</span>
                                <span className="stat-val">{weather.main.humidity}%</span>
                            </div>
                            <div className="stat-box">
                                <Wind className="stat-icon mx-auto" size={20} />
                                <span className="stat-label">{t('sections.weather.wind')}</span>
                                <span className="stat-val">{weather.wind.speed} m/s</span>
                            </div>
                            <div className="stat-box">
                                <CloudRain className="stat-icon mx-auto" size={20} />
                                <span className="stat-label">{t('sections.weather.rain')}</span>
                                <span className="stat-val">{weather.rain ? (weather.rain['1h'] || 0) + 'mm' : '0%'}</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        Enter location or enable GPS to see weather.
                    </div>
                )}
            </form>

            {weather && (
                <>
                    {/* Advisory Section */}
                    <div className="advisory-card">
                        <div className="advisory-title">
                            <AlertTriangle size={20} className="text-green-700" />
                            {t('sections.weather.advisory')}
                        </div>
                        {advisories.length > 0 ? (
                            <ul className="advisory-list">
                                {advisories.map((adv, idx) => (
                                    <li key={idx} className="advisory-item">
                                        {/* Icon mapping could be improved, just using bullet for now */}
                                        <span style={{ color: adv.type === 'warning' ? '#C05621' : '#2F855A' }}>•</span>
                                        {adv.text}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-600">Conditions are stable. Proceed with standard farming activities.</p>
                        )}
                    </div>

                    {/* 5-Day Forecast */}
                    <h3 style={{ marginBottom: '1rem', color: 'var(--earth-800)', fontFamily: 'Playfair Display, serif' }}>{t('sections.weather.forecast')}</h3>
                    <div className="forecast-scroll">
                        {forecast && forecast.map((day, idx) => (
                            <div key={idx} className="forecast-card">
                                <span className="fc-day">{getDayName(day.dt_txt)}</span>
                                <div className="fc-icon">
                                    {getWeatherIcon(day.weather[0].id)}
                                </div>
                                <div className="fc-temp">{Math.round(day.main.temp)}°</div>
                                <div className="fc-desc">{day.weather[0].main}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
