import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// 📌 Importamos los archivos JSON con las traducciones
import translationES from "./locales/es.json";
import translationEN from "./locales/en.json";
import translationFR from "./locales/fr.json"; // Si quieres francés

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: translationEN },
        es: { translation: translationES },
        fr: { translation: translationFR }
    },
    lng: "es", // 🔹 Idioma por defecto
    fallbackLng: "en", // 🔹 Si falta traducción, usa inglés
    interpolation: { escapeValue: false }
});

export default i18n;
