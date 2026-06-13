'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const originalText = new WeakMap();
const dynamicTranslationCache = new Map();
const pendingDynamic = new Map();
let pendingTimer = null;
const translatableAttributes = ['placeholder', 'aria-label', 'title', 'alt'];
const brandText = new Set(['AlgoStories']);

function preserveWhitespace(currentValue, nextValue) {
  const prefix = currentValue.match(/^\s*/)?.[0] || '';
  const suffix = currentValue.match(/\s*$/)?.[0] || '';
  return `${prefix}${nextValue}${suffix}`;
}

function getStaticTextMap(i18n) {
  return i18n.getResourceBundle(i18n.resolvedLanguage || i18n.language || 'en', 'translation')?.staticText || {};
}

function markTouched() {
  document.body.dataset.i18nTouched = 'true';
}

function shouldTranslateUnknownText(text) {
  const trimmed = text.trim();
  if (trimmed.length < 2 || trimmed.length > 800) return false;
  if (brandText.has(trimmed)) return false;
  if (/^[\d\s.,:;!?()[\]{}%$#@+\-/]+$/.test(trimmed)) return false;
  return /[A-Za-z\u00c0-\u024f\u0400-\u04ff\u0600-\u06ff\u0900-\u097f\u3040-\u30ff\u3400-\u9fff]/.test(trimmed);
}

function cacheKey(language, text) {
  return `${language}\u0000${text}`;
}

function automaticTranslation(text, language) {
  if (language !== 'zh') return '';
  const trimmed = text.trim();
  const countRules = [
    [/^(\d+) reactions?$/i, '$1 个回应'],
    [/^(\d+) comments?$/i, '$1 条评论'],
    [/^(\d+) likes?$/i, '$1 个赞'],
    [/^Comment (\d+)$/i, '评论 $1'],
    [/^Support (\d+)$/i, '支持 $1'],
    [/^Eye-Opening (\d+)$/i, '很有启发 $1'],
    [/^Showing (\d+) of (\d+)$/i, '显示 $1 / $2'],
    [/^(\d+) events? coming up$/i, '$1 个即将举行的活动'],
    [/^(\d+) past events?$/i, '$1 个过去活动'],
  ];
  for (const [pattern, replacement] of countRules) {
    if (pattern.test(trimmed)) return trimmed.replace(pattern, replacement);
  }

  const exact = {
    'High Impact': '高影响',
    'Medium Impact': '中等影响',
    'Low Impact': '低影响',
    Active: '运行中',
    'Under Review': '审核中',
    Proposed: '拟议中',
    Deprecated: '已停用',
    'AI SUMMARY': 'AI 摘要',
    'AI-GENERATED SUMMARY': 'AI 生成摘要',
    'Story Details': '故事详情',
    'Key Excerpts': '关键摘录',
    Comments: '评论',
    'Log in to post a comment.': '登录后发表评论。',
    'Write a comment': '写一条评论',
    'Post comment': '发表评论',
    Reply: '回复',
    Citation: '引用',
  };
  if (exact[trimmed]) return exact[trimmed];

  const monthMap = {
    Jan: '1月',
    January: '1月',
    Feb: '2月',
    February: '2月',
    Mar: '3月',
    March: '3月',
    Apr: '4月',
    April: '4月',
    May: '5月',
    Jun: '6月',
    June: '6月',
    Jul: '7月',
    July: '7月',
    Aug: '8月',
    August: '8月',
    Sep: '9月',
    September: '9月',
    Oct: '10月',
    October: '10月',
    Nov: '11月',
    November: '11月',
    Dec: '12月',
    December: '12月',
  };
  const dateWithYear = trimmed.match(/^(?:(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+)?([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (dateWithYear && monthMap[dateWithYear[2]]) return `${dateWithYear[4]}年${monthMap[dateWithYear[2]]}${dateWithYear[3]}日`;
  const shortDate = trimmed.match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
  if (shortDate && monthMap[shortDate[1]]) return `${monthMap[shortDate[1]]}${shortDate[2]}日`;
  const time = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (time) {
    const period = time[3].toUpperCase() === 'AM' ? '上午' : '下午';
    return `${period} ${time[1]}:${time[2]}`;
  }
  return '';
}

function translateValue(original, staticText, language) {
  const key = original.trim();
  return staticText[key] || automaticTranslation(key, language) || '';
}

function applyTranslatedText(entry, translated) {
  if (!translated || translated === entry.original) return;
  if (entry.type === 'text') {
    const nextValue = preserveWhitespace(entry.original, translated);
    if (entry.node.nodeValue !== nextValue) {
      entry.node.nodeValue = nextValue;
      markTouched();
    }
    return;
  }

  if (entry.element?.isConnected) {
    const current = entry.element.getAttribute(entry.attribute);
    if (current !== translated) {
      entry.element.setAttribute(entry.attribute, translated);
      markTouched();
    }
  }
}

function queueDynamicTranslation(entry, language) {
  if (language === 'en') return;
  if (!shouldTranslateUnknownText(entry.original)) return;
  const key = cacheKey(language, entry.original.trim());
  const cached = dynamicTranslationCache.get(key);
  if (cached) {
    applyTranslatedText(entry, cached);
    return;
  }

  const pending = pendingDynamic.get(key) || { text: entry.original.trim(), language, entries: [] };
  pending.entries.push(entry);
  pendingDynamic.set(key, pending);

  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(flushDynamicTranslations, 250);
}

async function flushDynamicTranslations() {
  const groups = new Map();
  for (const [key, pending] of pendingDynamic) {
    pendingDynamic.delete(key);
    const group = groups.get(pending.language) || [];
    group.push(pending);
    groups.set(pending.language, group);
  }

  for (const [language, group] of groups) {
    for (let index = 0; index < group.length; index += 50) {
      const chunk = group.slice(index, index + 50);
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceLanguage: 'en',
            targetLanguage: language,
            texts: chunk.map((item) => item.text),
          }),
        });
        const payload = await response.json().catch(() => ({}));
        const translations = Array.isArray(payload.translations) ? payload.translations : chunk.map((item) => item.text);
        chunk.forEach((item, itemIndex) => {
          const translated = translations[itemIndex] || item.text;
          dynamicTranslationCache.set(cacheKey(language, item.text), translated);
          item.entries.forEach((entry) => applyTranslatedText(entry, translated));
        });
      } catch {
        chunk.forEach((item) => dynamicTranslationCache.set(cacheKey(language, item.text), item.text));
      }
    }
  }
}

function translateTextNode(node, staticText, language) {
  const parent = node.parentElement;
  if (!parent || parent.closest('[data-no-i18n]')) return;
  if (['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE'].includes(parent.tagName)) return;

  const hasOriginal = originalText.has(node);
  const existing = originalText.get(node) || node.nodeValue;
  const key = existing.trim();
  if (!key || key.length < 2) return;
  const translatedValue = translateValue(existing, staticText, language);
  if (!hasOriginal && !translatedValue && language === 'en') return;

  originalText.set(node, existing);
  if (translatedValue || language === 'en') {
    const nextValue = preserveWhitespace(existing, translatedValue || key);
    if (node.nodeValue !== nextValue) {
      node.nodeValue = nextValue;
      markTouched();
    }
  }
  if (!translatedValue) {
    queueDynamicTranslation({ type: 'text', node, original: existing }, language);
  }
}

function translateAttributes(element, staticText, language) {
  for (const attribute of translatableAttributes) {
    const value = element.getAttribute(attribute);
    if (!value) continue;

    const originalAttribute = `data-i18n-original-${attribute}`;
    const existingOriginal = element.getAttribute(originalAttribute);
    const original = existingOriginal || value;
    const translatedValue = translateValue(original, staticText, language);
    if (!existingOriginal && !translatedValue && language === 'en') continue;

    element.setAttribute(originalAttribute, original);
    if (translatedValue || language === 'en') {
      const nextValue = translatedValue || original;
      if (value !== nextValue) {
        element.setAttribute(attribute, nextValue);
        markTouched();
      }
    }
    if (!translatedValue) {
      queueDynamicTranslation({ type: 'attribute', element, attribute, original }, language);
    }
  }
}

function translateTree(root, staticText, language) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, staticText, language);
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => translateTextNode(node, staticText, language));

  if (root.nodeType === Node.ELEMENT_NODE) {
    translateAttributes(root, staticText, language);
    root.querySelectorAll?.('input, textarea, select, button, a, img, [title], [aria-label]').forEach((element) => {
      translateAttributes(element, staticText, language);
    });
  }
}

export function StaticTextTranslator() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'en';

  useEffect(() => {
    const staticText = getStaticTextMap(i18n);
    const shouldScanPage = language !== 'en' || Object.keys(staticText).length || document.body.dataset.i18nTouched;
    if (!shouldScanPage) return undefined;
    translateTree(document.body, staticText, language);

    const observer = new MutationObserver((mutations) => {
      const latestStaticText = getStaticTextMap(i18n);
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => translateTree(node, latestStaticText, language));
        }
        if (mutation.type === 'characterData') {
          translateTree(mutation.target, latestStaticText, language);
        }
        if (mutation.type === 'attributes') {
          translateAttributes(mutation.target, latestStaticText, language);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatableAttributes,
    });

    return () => observer.disconnect();
  }, [i18n, language]);

  return null;
}
