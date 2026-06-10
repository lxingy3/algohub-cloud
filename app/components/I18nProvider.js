'use client';

import { useEffect } from 'react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { resources } from '../i18n/resources';
import { StaticTextTranslator } from './StaticTextTranslator';

if (!i18next.isInitialized) {
  i18next
    .use(initReactI18next)
    .init({
      resources,
      lng: 'en',
      fallbackLng: 'en',
      supportedLngs: Object.keys(resources),
      interpolation: { escapeValue: false },
    });
}

export function I18nProvider({ children }) {
  useEffect(() => {
    const storedLanguage = window.localStorage.getItem('algostories-language');
    if (storedLanguage && resources[storedLanguage] && i18next.language !== storedLanguage) {
      i18next.changeLanguage(storedLanguage);
    }
  }, []);

  return (
    <I18nextProvider i18n={i18next}>
      <StaticTextTranslator />
      {children}
    </I18nextProvider>
  );
}
