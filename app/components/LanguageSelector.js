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
    <label className="flex items-center gap-1 text-xs text-gray-400" data-no-i18n>
      <span className="sr-only">{t('nav.language')}</span>
      <select
        value={language}
        aria-label={t('nav.language')}
        title={t('nav.language')}
        onChange={(event) => {
          window.localStorage.setItem('algostories-language', event.target.value);
          i18n.changeLanguage(event.target.value);
        }}
        className="h-11 max-w-[104px] rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-600 hover:border-gray-300 focus:border-gray-400 focus:outline-none sm:max-w-[132px] md:h-9 md:max-w-[112px]"
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
