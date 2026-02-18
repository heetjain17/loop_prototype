import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    // Get current language, default to 'en'
    const currentLang = i18n.resolvedLanguage || 'en';

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="language-switcher">
            <Globe size={18} className="lang-icon" />
            <div className="lang-buttons">
                <button
                    className={`lang-btn ${currentLang === 'en' ? 'active' : ''}`}
                    onClick={() => changeLanguage('en')}
                    aria-label="Switch to English"
                >
                    EN
                </button>
                <span className="divider">/</span>
                <button
                    className={`lang-btn ${currentLang === 'hi' ? 'active' : ''}`}
                    onClick={() => changeLanguage('hi')}
                    aria-label="Switch to Hindi"
                >
                    HI
                </button>
            </div>
        </div>
    );
}
