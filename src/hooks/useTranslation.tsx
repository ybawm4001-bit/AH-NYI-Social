import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../locales/translations';
import { Language } from '../types';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['my']) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('ahnyi_language');
      if (saved === 'my' || saved === 'en') return saved;
    } catch {}
    return 'my'; // Default to Myanmar language
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('ahnyi_language', lang);
      document.documentElement.lang = lang;
    } catch {}
  };

  const t = (key: keyof typeof translations['my']): string => {
    const dict = translations[language] || translations.my;
    return (dict as any)[key] || (translations.en as any)[key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
