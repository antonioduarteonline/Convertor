"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "pt" | "es" | "fr";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English",   flag: "🇬🇧" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "es", label: "Español",   flag: "🇪🇸" },
  { code: "fr", label: "Français",  flag: "🇫🇷" },
];

const T = {
  en: {
    subtitle:        "YouTube, Twitter, TikTok & more",
    placeholder:     "Paste any video link…",
    paste:           "PASTE",
    audio:           "Audio",
    video:           "Video",
    format:          "Format",
    quality:         "Quality",
    resolution:      "Resolution",
    bestAvailable:   "Best available",
    bestVbr:         "Best (VBR)",
    convertDownload: "Convert & Download",
    download:        "Download",
    processing:      "Processing",
  },
  pt: {
    subtitle:        "YouTube, Twitter, TikTok e mais",
    placeholder:     "Cola qualquer link de vídeo…",
    paste:           "COLAR",
    audio:           "Áudio",
    video:           "Vídeo",
    format:          "Formato",
    quality:         "Qualidade",
    resolution:      "Resolução",
    bestAvailable:   "Melhor disponível",
    bestVbr:         "Melhor (VBR)",
    convertDownload: "Converter & Descarregar",
    download:        "Descarregar",
    processing:      "A processar",
  },
  es: {
    subtitle:        "YouTube, Twitter, TikTok y más",
    placeholder:     "Pega cualquier enlace de vídeo…",
    paste:           "PEGAR",
    audio:           "Audio",
    video:           "Vídeo",
    format:          "Formato",
    quality:         "Calidad",
    resolution:      "Resolución",
    bestAvailable:   "Mejor disponible",
    bestVbr:         "Mejor (VBR)",
    convertDownload: "Convertir & Descargar",
    download:        "Descargar",
    processing:      "Procesando",
  },
  fr: {
    subtitle:        "YouTube, Twitter, TikTok et plus",
    placeholder:     "Collez n'importe quel lien vidéo…",
    paste:           "COLLER",
    audio:           "Audio",
    video:           "Vidéo",
    format:          "Format",
    quality:         "Qualité",
    resolution:      "Résolution",
    bestAvailable:   "Meilleure disponible",
    bestVbr:         "Meilleure (VBR)",
    convertDownload: "Convertir & Télécharger",
    download:        "Télécharger",
    processing:      "Traitement en cours",
  },
} as const;

export type TranslationKey = keyof typeof T.en;

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}>({
  lang: "en",
  setLang: () => {},
  t: (key) => T.en[key],
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("lang") as Lang | null;
    if (stored && stored in T) setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  };

  const t = (key: TranslationKey): string => T[lang][key];

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
