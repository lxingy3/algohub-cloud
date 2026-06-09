'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { languageOptions } from '../i18n/resources';

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'en';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  return (
    <label className="flex items-center gap-1 text-xs text-gray-400">
      <span className="sr-only">{t('nav.language')}</span>
      <select
        value={language}
        aria-label={t('nav.language')}
        title={t('nav.language')}
        onChange={(event) => i18n.changeLanguage(event.target.value)}
        className="h-9 max-w-[112px] rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-500 hover:border-gray-300 focus:border-gray-400 focus:outline-none"
      >
        {languageOptions.map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
