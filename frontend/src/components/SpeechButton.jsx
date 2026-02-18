import React, { useState, useEffect } from "react";
import { Volume2, StopCircle } from "lucide-react";

export default function SpeechButton({ text, lang = "en" }) {
    const [speaking, setSpeaking] = useState(false);
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        if ("speechSynthesis" in window) {
            setSupported(true);
        }
    }, []);

    const handleSpeak = () => {
        if (speaking) {
            window.speechSynthesis.cancel();
            setSpeaking(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === "hi" ? "hi-IN" : "en-US";

        // Attempt to find a suitable voice
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang === utterance.lang);
        if (voice) utterance.voice = voice;

        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);

        window.speechSynthesis.speak(utterance);
        setSpeaking(true);
    };

    if (!supported) return null;

    const label = lang === 'hi' ? (speaking ? 'रोकें' : 'सुनें') : (speaking ? 'Stop' : 'Listen');

    return (
        <button
            onClick={handleSpeak}
            className={`speech-btn ${speaking ? "speaking" : ""}`}
            title={speaking ? "Stop Text-to-Speech" : "Read Aloud"}
            type="button"
        >
            {speaking ? <StopCircle size={18} /> : <Volume2 size={18} />}
            <span>{label}</span>
        </button>
    );
}
