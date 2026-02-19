
# Translation dictionaries for backend responses

# ─── Growth Model Translations ────────────────────────────────────────────────

IRRIGATION_SCHEDULE_MESSAGES = {
    "en": "Irrigation recommended every {days} days.",
    "hi": "हर {days} दिनों में सिंचाई की सिफारिश की जाती है।"
}

FERTILIZER_WINDOWS = {
    "en": {
        "Germination": "No fertilizer required at this stage",
        "Tillering": "Apply 25kg urea/acre within 5 days",
        "Vegetative": "Apply NPK 20-20-0 at 50kg/acre this week",
        "Jointing": "Apply 20kg potassium chloride/acre",
        "Tasseling": "Top-dress with 15kg urea/acre",
        "Silking": "Apply micronutrient boron spray",
        "Flowering": "Apply potash 30kg/acre to improve grain filling",
        "Maturity": "No fertilizer required at this stage",
        "default": "No fertilizer required at this stage"
    },
    "hi": {
        "Germination": "इस चरण में किसी उर्वरक की आवश्यकता नहीं है",
        "Tillering": "5 दिनों के भीतर 25 किलोग्राम यूरिया/एकड़ डालें",
        "Vegetative": "इस सप्ताह 50 किलोग्राम/एकड़ की दर से एनपीके 20-20-0 डालें",
        "Jointing": "20 किलोग्राम पोटेशियम क्लोराइड/एकड़ डालें",
        "Tasseling": "15 किलोग्राम यूरिया/एकड़ के साथ टॉप-ड्रेसिंग करें",
        "Silking": "सूक्ष्म पोषक तत्व बोरॉन का छिड़काव करें",
        "Flowering": "अनाज भरने में सुधार के लिए पोटाश 30 किलोग्राम/एकड़ डालें",
        "Maturity": "इस चरण में किसी उर्वरक की आवश्यकता नहीं है",
        "default": "इस चरण में किसी उर्वरक की आवश्यकता नहीं है"
    }
}

RISK_ALERTS = {
    "en": {
        "heat_stress": "High heat stress risk. Consider afternoon irrigation to cool crop canopy.",
        "temp_threshold": "Temperature near base threshold. Slight delay in {stage} stage expected.",
        "warmer_season": "Warmer-than-average season. Crop may reach maturity 7–10 days earlier than scheduled.",
        "normal": "Crop progressing normally. No immediate climate risk detected."
    },
    "hi": {
        "heat_stress": "उच्च गर्मी तनाव का जोखिम। फसल की कैनोपी को ठंडा करने के लिए दोपहर में सिंचाई पर विचार करें।",
        "temp_threshold": "तापमान आधार सीमा के निकट। {stage} चरण में थोड़ी देरी की उम्मीद है।",
        "warmer_season": "औसत से अधिक गर्म मौसम। फसल निर्धारित समय से 7-10 दिन पहले पक सकती है।",
        "normal": "फसल सामान्य रूप से बढ़ रही है। कोई तत्काल जलवायु जोखिम नहीं पाया गया।"
    }
}

# ─── Advisory Model Translations ──────────────────────────────────────────────

ADVISORY_MESSAGES = {
    "en": {
        "urgent_irrigation": "URGENT: Soil moisture critically low ({soil_moisture}%). Irrigate within 12 hours.",
        "irrigation_needed": "Irrigation recommended within 24 hours. Current soil moisture: {soil_moisture}%.",
        "irrigation_ok": "Soil moisture adequate ({soil_moisture}%). No irrigation needed today.",
        "fert_tillering": "Apply 25 kg urea/acre as top dressing.",
        "fert_vegetative": "Apply NPK (20-20-0) at 50 kg/acre.",
        "fert_jointing": "Apply 20 kg potassium chloride/acre.",
        "fert_flowering": "Foliar spray of 2% KNO₃ recommended.",
        "fert_default": "Apply balanced NPK as per soil test recommendation.",
        "fert_required_prefix": "Fertilizer required: ",
        "fert_not_needed": "No additional fertilization needed today.",
        "heat_alert": "Heat stress alert: Consider irrigation during early morning hours.",
        "humidity_alert": "High humidity + temperature: Monitor for fungal diseases."
    },
    "hi": {
        "urgent_irrigation": "जरूरी: मिट्टी की नमी गंभीर रूप से कम ({soil_moisture}%)। 12 घंटे के भीतर सिंचाई करें।",
        "irrigation_needed": "24 घंटे के भीतर सिंचाई की सिफारिश। वर्तमान मिट्टी की नमी: {soil_moisture}%।",
        "irrigation_ok": "मिट्टी की नमी पर्याप्त ({soil_moisture}%)। आज सिंचाई की आवश्यकता नहीं है।",
        "fert_tillering": "टॉप ड्रेसिंग के रूप में 25 किलोग्राम यूरिया/एकड़ डालें।",
        "fert_vegetative": "50 किलोग्राम/एकड़ की दर से एनपीके (20-20-0) डालें।",
        "fert_jointing": "20 किलोग्राम पोटेशियम क्लोराइड/एकड़ डालें।",
        "fert_flowering": "2% KNO₃ के पर्णीय छिड़काव की सिफारिश की जाती है।",
        "fert_default": "मृदा परीक्षण सिफारिश के अनुसार संतुलित एनपीके डालें।",
        "fert_required_prefix": "उर्वरक आवश्यक: ",
        "fert_not_needed": "आज किसी अतिरिक्त उर्वरक की आवश्यकता नहीं है।",
        "heat_alert": "गर्मी तनाव चेतावनी: सुबह जल्दी सिंचाई पर विचार करें।",
        "humidity_alert": "उच्च आर्द्रता + तापमान: फंगल रोगों के लिए निगरानी करें।"
    }
}

# ─── Disease Model Translations ───────────────────────────────────────────────

DISEASE_DB_TRANS = {
    "en": {
        "rust": {
            "disease_detected": "Leaf Rust (Puccinia triticina)",
            "recommendation": "Apply Propiconazole 25% EC at 200 ml/acre within 48 hours. Repeat after 14 days if symptoms persist. Avoid overhead irrigation.",
            "prevention": "Use rust-resistant varieties. Ensure proper field hygiene post-harvest."
        },
        "yellow": {
            "disease_detected": "Nitrogen Deficiency / Yellow Mosaic",
            "recommendation": "Apply 25–30 kg urea/acre immediately. Follow up with foliar spray of 2% urea solution after 7 days.",
            "prevention": "Conduct soil testing before sowing. Maintain optimal pH (6.0–7.5)."
        },
        "blight": {
            "disease_detected": "Early Blight (Alternaria solani)",
            "recommendation": "Apply Mancozeb 75% WP at 600 g/acre. improve drainage to reduce leaf wetness duration.",
            "prevention": "Crop rotation every 2–3 years. Remove infected plant debris."
        },
        "spot": {
            "disease_detected": "Leaf Spot (Helminthosporium spp.)",
            "recommendation": "Apply Carbendazim 50% WP at 250 g/acre. Spray during cooler hours (early morning).",
            "prevention": "Avoid excess nitrogen. Maintain proper plant spacing for airflow."
        },
        "wilt": {
            "disease_detected": "Fusarium Wilt",
            "recommendation": "No curative chemical treatment available. Remove and destroy infected plants immediately. Apply Trichoderma viride at 5 kg/acre to remaining crop.",
            "prevention": "Use certified disease-free seeds. Soil solarization before planting."
        },
        "none": {
            "disease_detected": "No Disease Detected",
            "recommendation": "Crop appears healthy. Continue regular monitoring every 5–7 days. Maintain current irrigation and fertilization schedule.",
            "prevention": "Keep field weed-free. Monitor for early signs of pest activity."
        }
    },
    "hi": {
        "rust": {
            "disease_detected": "पत्ती रतुआ (लीफ रस्ट)",
            "recommendation": "48 घंटे के भीतर 200 मिली/एकड़ की दर से प्रोपिकोनाज़ोल 25% ईसी डालें। यदि लक्षण बने रहें तो 14 दिनों के बाद दोहराएं। ऊपर से सिंचाई से बचें।",
            "prevention": "रतुआ प्रतिरोधी किस्मों का प्रयोग करें। कटाई के बाद खेत की उचित स्वच्छता सुनिश्चित करें।"
        },
        "yellow": {
            "disease_detected": "नाइट्रोजन की कमी / पीला मोज़ेक",
            "recommendation": "तुरंत 25-30 किलोग्राम यूरिया/एकड़ डालें। 7 दिनों के बाद 2% यूरिया के घोल का पर्णीय छिड़काव करें।",
            "prevention": "बुवाई से पहले मिट्टी की जांच कराएं। इष्टतम पीएच (6.0–7.5) बनाए रखें।"
        },
        "blight": {
            "disease_detected": "अगेती झुलसा (अर्ली ब्लाइट)",
            "recommendation": "600 ग्राम/एकड़ की दर से मैनकोजेब 75% डब्ल्यूपी डालें। पत्तियों के गीले रहने की अवधि को कम करने के लिए जल निकासी में सुधार करें।",
            "prevention": "हर 2-3 साल में फसल चक्र अपनाएं। संक्रमित पौधों के मलबे को हटा दें।"
        },
        "spot": {
            "disease_detected": "पत्ती धब्बा (लीफ स्पॉट)",
            "recommendation": "250 ग्राम/एकड़ की दर से कार्बेंडाज़िम 50% डब्ल्यूपी डालें। ठंडे समय (सुबह जल्दी) के दौरान छिड़काव करें।",
            "prevention": "अतिरिक्त नाइट्रोजन से बचें। वायु प्रवाह के लिए पौधों के बीच उचित दूरी बनाए रखें।"
        },
        "wilt": {
            "disease_detected": "फ्यूजेरियम विल्ट (उकठा रोग)",
            "recommendation": "कोई उपचारात्मक रासायनिक उपचार उपलब्ध नहीं है। संक्रमित पौधों को तुरंत हटा दें और नष्ट कर दें। बची हुई फसल पर 5 किलोग्राम/एकड़ की दर से ट्राइकोडर्मा विरिडे डालें।",
            "prevention": "प्रमाणित रोग-मुक्त बीजों का प्रयोग करें। रोपण से पहले मिट्टी का सौरकरण करें।"
        },
        "none": {
            "disease_detected": "कोई रोग नहीं मिला",
            "recommendation": "फसल स्वस्थ प्रतीत होती है। हर 5-7 दिनों में नियमित निगरानी जारी रखें। वर्तमान सिंचाई और उर्वरक अनुसूची बनाए रखें।",
            "prevention": "खेत को खरपतवार मुक्त रखें। कीट गतिविधि के शुरुआती संकेतों के लिए निगरानी करें।"
        }
    }
}
