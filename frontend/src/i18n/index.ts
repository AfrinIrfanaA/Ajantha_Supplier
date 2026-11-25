import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ta from "./ta.json";

const saved = localStorage.getItem("language") || "en";

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ta: { translation: ta } },
  lng: saved,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
