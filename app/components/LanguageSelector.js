'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const languages = [
  ['en', 'English'],
  ['zh', '\u4e2d\u6587'],
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

const SKIP_SELECTOR = [
  '[data-no-translate]',
  'script',
  'style',
  'textarea',
  'input',
  'select',
  'option',
  'svg',
].join(', ');

const originals = new WeakMap();
const attributeOriginals = new WeakMap();

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function shouldTranslate(value) {
  const text = normalizeText(value);
  return text.length > 1 && /[\p{L}\p{N}]/u.test(text);
}

function getTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !shouldTranslate(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      if (parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

function getTranslatableAttributes(root) {
  return Array.from(root.querySelectorAll('[placeholder], [title], [aria-label]')).filter((element) => {
    return !element.closest(SKIP_SELECTOR);
  });
}

function cacheKey(language, text) {
  return `algostories-translation:${language}:${text}`;
}

function readCached(language, text) {
  try {
    return window.localStorage.getItem(cacheKey(language, text));
  } catch {
    return null;
  }
}

function writeCached(language, text, translated) {
  try {
    window.localStorage.setItem(cacheKey(language, text), translated);
  } catch {
  }
}

function collectPageText() {
  const textNodes = getTextNodes(document.body).map((node) => {
    if (!originals.has(node)) originals.set(node, normalizeText(node.nodeValue));
    return { type: 'text', node, original: originals.get(node) };
  });

  const attributes = [];
  getTranslatableAttributes(document.body).forEach((element) => {
    let values = attributeOriginals.get(element);
    if (!values) {
      values = {};
      attributeOriginals.set(element, values);
    }

    ['placeholder', 'title', 'aria-label'].forEach((name) => {
      const value = element.getAttribute(name);
      if (value && shouldTranslate(value)) {
        if (!values[name]) values[name] = normalizeText(value);
        attributes.push({ type: 'attribute', element, name, original: values[name] });
      }
    });
  });

  return [...textNodes, ...attributes];
}

function setItemText(item, value) {
  if (item.type === 'text') {
    const current = item.node.nodeValue;
    const leading = current.match(/^\s*/)?.[0] || '';
    const trailing = current.match(/\s*$/)?.[0] || '';
    item.node.nodeValue = `${leading}${value}${trailing}`;
    return;
  }

  item.element.setAttribute(item.name, value);
}

async function translateTexts(language, texts) {
  if (!texts.length) return {};

  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: language, texts }),
  });

  if (!response.ok) throw new Error('Translation request failed');
  const payload = await response.json();
  return payload.translations || {};
}

export function LanguageSelector() {
  const [language, setLanguage] = useState('en');
  const languageRef = useRef('en');
  const requestRef = useRef(0);
  const applyingRef = useRef(false);
  const timerRef = useRef(null);

  const languageName = useMemo(() => {
    return languages.find(([code]) => code === language)?.[1] || 'English';
  }, [language]);

  useEffect(() => {
    const stored = window.localStorage.getItem('algostories-language') || 'en';
    setLanguage(stored);
  }, []);

  useEffect(() => {
    languageRef.current = language;
    document.documentElement.lang = language;
    window.localStorage.setItem('algostories-language', language);

    async function applyLanguage() {
      if (!document.body || applyingRef.current) return;
      applyingRef.current = true;
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;

      try {
        const items = collectPageText();

        if (language === 'en') {
          items.forEach((item) => setItemText(item, item.original));
          return;
        }

        const missing = [];
        const seen = new Set();

        items.forEach((item) => {
          const cached = readCached(language, item.original);
          if (cached) {
            setItemText(item, cached);
          } else if (!seen.has(item.original)) {
            seen.add(item.original);
            missing.push(item.original);
          }
        });

        if (!missing.length) return;

        const translations = await translateTexts(language, missing);
        if (requestRef.current !== requestId || languageRef.current !== language) return;

        Object.entries(translations).forEach(([original, translated]) => {
          if (translated && translated !== original) writeCached(language, original, translated);
        });

        items.forEach((item) => {
          const translated = translations[item.original] || readCached(language, item.original);
          if (translated) setItemText(item, translated);
        });
      } finally {
        applyingRef.current = false;
      }
    }

    function scheduleApply() {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(applyLanguage, 120);
    }

    applyLanguage();

    const observer = new MutationObserver(() => {
      if (!applyingRef.current) scheduleApply();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });

    return () => {
      observer.disconnect();
      window.clearTimeout(timerRef.current);
    };
  }, [language]);

  return (
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
  );
}
