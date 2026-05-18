"use client";

import { createContext, useContext } from "react";
import { translations } from "@/lib/i18n";

type Language = "English" | "Bahasa Melayu";

const LanguageContext = createContext<Language>("English");

export function LanguageProvider({
  lang,
  children,
}: {
  lang: Language;
  children: React.ReactNode;
}) {
  return (
    <LanguageContext.Provider value={lang}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook — guna ni dalam setiap page
export function useLanguage() {
  return useContext(LanguageContext);
}

// Hook shortcut — terus dapat translations object
export function useT() {
  const lang = useContext(LanguageContext);
  return translations[lang];
}