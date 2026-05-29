'use client';

import { useEffect, useMemo, useState } from 'react';

const languages = [
  ['en', 'English'],
  ['zh-CN', '\u4e2d\u6587'],
  ['es', 'Espa\u00f1ol'],
  ['ko', '\ud55c\uad6d\uc5b4'],
  ['ja', '\u65e5\u672c\u8a9e'],
  ['de', 'Deutsch'],
  ['fr', 'Fran\u00e7ais'],
  ['pt', 'Portugu\u00eas'],
  ['ru', '\u0420\u0443\u0441\u0441\u043a\u0438\u0439'],
  ['ar', '\u0627\u0644\u0639\u0631\u0628\u064a\u0629'],
  ['hi', '\u0939\u093f\u0928\u094d\u0926\u0940'],
  ['it', 'Italiano'],
];

const STORAGE_KEY = 'algostories-language';
const SCRIPT_ID = 'google-translate-script';
let translateLoader = null;

function setTranslateCookie(language) {
  const value = language === 'en' ? '/en/en' : `/en/${language}`;
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `googtrans=${value}; path=/; expires=${expires}; SameSite=Lax`;

  const host = window.location.hostname;
  if (host.includes('.')) {
    document.cookie = `googtrans=${value}; path=/; domain=.${host}; expires=${expires}; SameSite=Lax`;
  }
}

function triggerGoogleTranslate(language) {
  const combo = document.querySelector('.goog-te-combo');
  if (!combo) return false;

  combo.value = language;
  combo.dispatchEvent(new Event('change'));
  return true;
}

function loadGoogleTranslate() {
  if (window.google?.translate?.TranslateElement) return Promise.resolve();
  if (translateLoader) return translateLoader;

  translateLoader = new Promise((resolve) => {
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          autoDisplay: false,
          includedLanguages: languages.map(([code]) => code).filter((code) => code !== 'en').join(','),
        },
        'google_translate_element',
      );
      resolve();
    };

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
  });

  return translateLoader;
}

export function LanguageSelector() {
  const [language, setLanguage] = useState('en');

  const languageName = useMemo(() => {
    return languages.find(([code]) => code === language)?.[1] || 'English';
  }, [language]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) || 'en';
    setLanguage(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === 'zh-CN' ? 'zh' : language;
    setTranslateCookie(language);

    loadGoogleTranslate().then(() => {
      const apply = () => triggerGoogleTranslate(language);
      if (!apply()) window.setTimeout(apply, 500);
    });
  }, [language]);

  return (
    <>
      <label data-no-translate className="flex items-center gap-1 text-xs text-gray-400">
        <span className="sr-only">Language</span>
        <select
          value={language}
          aria-label="Language"
          title={`Language: ${languageName}`}
          onChange={(event) => setLanguage(event.target.value)}
          className="h-9 max-w-[104px] rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-500 hover:border-gray-300 focus:border-gray-400 focus:outline-none"
        >
          {languages.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div id="google_translate_element" className="hidden" />
    </>
  );
}
