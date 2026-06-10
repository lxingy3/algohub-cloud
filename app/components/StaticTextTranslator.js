'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const originalText = new WeakMap();
const translatableAttributes = ['placeholder', 'aria-label', 'title'];

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

function translateTextNode(node, staticText) {
  const parent = node.parentElement;
  if (!parent || parent.closest('[data-no-i18n]')) return;
  if (['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE'].includes(parent.tagName)) return;

  const hasOriginal = originalText.has(node);
  const existing = originalText.get(node) || node.nodeValue;
  const key = existing.trim();
  if (!key || key.length < 2) return;
  if (!hasOriginal && !Object.prototype.hasOwnProperty.call(staticText, key)) return;

  originalText.set(node, existing);
  const translated = staticText[key] || key;
  const nextValue = preserveWhitespace(existing, translated);
  if (node.nodeValue !== nextValue) {
    node.nodeValue = nextValue;
    markTouched();
  }
}

function translateAttributes(element, staticText) {
  for (const attribute of translatableAttributes) {
    const value = element.getAttribute(attribute);
    if (!value) continue;

    const originalAttribute = `data-i18n-original-${attribute}`;
    const existingOriginal = element.getAttribute(originalAttribute);
    const original = existingOriginal || value;
    if (!existingOriginal && !Object.prototype.hasOwnProperty.call(staticText, original)) continue;

    element.setAttribute(originalAttribute, original);
    const nextValue = staticText[original] || original;
    if (value !== nextValue) {
      element.setAttribute(attribute, nextValue);
      markTouched();
    }
  }
}

function translateTree(root, staticText) {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => translateTextNode(node, staticText));

  if (root.nodeType === Node.ELEMENT_NODE) {
    translateAttributes(root, staticText);
    root.querySelectorAll?.('input, textarea, select, button, a, [title], [aria-label]').forEach((element) => {
      translateAttributes(element, staticText);
    });
  }
}

export function StaticTextTranslator() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'en';

  useEffect(() => {
    const staticText = getStaticTextMap(i18n);
    if (!Object.keys(staticText).length && !document.body.dataset.i18nTouched) return undefined;
    translateTree(document.body, staticText);

    const observer = new MutationObserver((mutations) => {
      const latestStaticText = getStaticTextMap(i18n);
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => translateTree(node, latestStaticText));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [i18n, language]);

  return null;
}
