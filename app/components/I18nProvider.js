'use client';

import { useEffect } from 'react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next, useTranslation } from 'react-i18next';
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
      <TranslationNotice />
      {children}
    </I18nextProvider>
  );
}

function TranslationNotice() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  if (language === 'en') return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-950" role="status">
      This page includes automatic translation. Some details may be less precise than the original text.
    </div>
  );
}
