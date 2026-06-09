'use client';

import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { resources } from '../i18n/resources';
import { StaticTextTranslator } from './StaticTextTranslator';

if (!i18next.isInitialized) {
  i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      supportedLngs: Object.keys(resources),
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: 'algostories-language',
        caches: ['localStorage'],
      },
    });
}

export function I18nProvider({ children }) {
  return (
    <I18nextProvider i18n={i18next}>
      <StaticTextTranslator />
      {children}
    </I18nextProvider>
  );
}
