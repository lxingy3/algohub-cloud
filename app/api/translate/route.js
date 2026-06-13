import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_TEXTS = 50;
const MAX_TEXT_LENGTH = 1500;
const FALLBACK_TIMEOUT_MS = 3500;
const SUPPORTED_FALLBACK_LANGUAGES = new Set(['zh', 'es', 'ko', 'ja', 'de', 'fr', 'pt', 'ru', 'ar', 'hi', 'it']);

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const targetLanguage = normalizeLanguage(body.targetLanguage);
  const sourceLanguage = normalizeLanguage(body.sourceLanguage) || 'en';
  const texts = Array.isArray(body.texts)
    ? body.texts.map((text) => String(text || '').trim()).filter(Boolean).slice(0, MAX_TEXTS)
    : [];

  if (!targetLanguage || targetLanguage === sourceLanguage || !texts.length) {
    return NextResponse.json({ translations: texts, configured: false });
  }

  const clippedTexts = texts.map((text) => text.slice(0, MAX_TEXT_LENGTH));
  const configuredTranslations = await translateWithConfiguredProvider(clippedTexts, sourceLanguage, targetLanguage);
  const translations = await fillMissingTranslations(clippedTexts, configuredTranslations, sourceLanguage, targetLanguage);
  return NextResponse.json({
    translations,
    configured: Boolean(process.env.TRANSLATION_API_URL),
    fallbackConfigured: SUPPORTED_FALLBACK_LANGUAGES.has(targetLanguage),
  });
}

function normalizeLanguage(value) {
  const language = String(value || '').trim().toLowerCase().split('-')[0];
  return /^[a-z]{2}$/.test(language) ? language : '';
}

async function translateWithConfiguredProvider(texts, sourceLanguage, targetLanguage) {
  const apiUrl = process.env.TRANSLATION_API_URL;
  if (!apiUrl) return texts;

  const apiKey = process.env.TRANSLATION_API_KEY;
  const translations = [];
  for (const text of texts) {
    translations.push(await translateOne(apiUrl, apiKey, text, sourceLanguage, targetLanguage));
  }
  return translations;
}

async function fillMissingTranslations(originalTexts, configuredTranslations, sourceLanguage, targetLanguage) {
  if (!SUPPORTED_FALLBACK_LANGUAGES.has(targetLanguage)) return configuredTranslations;

  const translations = [...configuredTranslations];
  for (const [index, text] of originalTexts.entries()) {
    if (translations[index] && translations[index] !== text) continue;
    translations[index] = await translateWithPublicFallback(text, sourceLanguage, targetLanguage);
  }
  return translations;
}

async function translateOne(apiUrl, apiKey, text, sourceLanguage, targetLanguage) {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: sourceLanguage,
        target: targetLanguage,
        format: 'text',
        ...(apiKey ? { api_key: apiKey } : {}),
      }),
    });
    if (!response.ok) return text;
    const payload = await response.json().catch(() => null);
    if (typeof payload?.translatedText === 'string') return payload.translatedText;
    if (typeof payload?.translation === 'string') return payload.translation;
    if (Array.isArray(payload?.translations) && typeof payload.translations[0]?.translatedText === 'string') {
      return payload.translations[0].translatedText;
    }
  } catch {
    return text;
  }
  return text;
}

async function translateWithPublicFallback(text, sourceLanguage, targetLanguage) {
  const myMemoryTranslation = await translateWithMyMemoryFallback(text, sourceLanguage, targetLanguage);
  if (myMemoryTranslation !== text) return myMemoryTranslation;
  return translateWithGoogleFallback(text, sourceLanguage, targetLanguage);
}

async function translateWithGoogleFallback(text, sourceLanguage, targetLanguage) {
  try {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: sourceLanguage,
      tl: targetLanguage,
      dt: 't',
      q: text,
    });
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 AlgoStories translation fallback',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(FALLBACK_TIMEOUT_MS),
    });
    if (!response.ok) return text;
    const payload = await response.json().catch(() => null);
    const translated = Array.isArray(payload?.[0])
      ? payload[0].map((part) => (Array.isArray(part) ? part[0] : '')).join('')
      : '';
    return translated || text;
  } catch {
    return text;
  }
}

async function translateWithMyMemoryFallback(text, sourceLanguage, targetLanguage) {
  try {
    const params = new URLSearchParams({
      q: text,
      langpair: `${sourceLanguage}|${targetLanguage}`,
    });
    const response = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`, {
      headers: {
        'User-Agent': 'AlgoStories translation fallback',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(FALLBACK_TIMEOUT_MS),
    });
    if (!response.ok) return text;
    const payload = await response.json().catch(() => null);
    const translated = payload?.responseData?.translatedText;
    return typeof translated === 'string' && translated.trim() ? translated : text;
  } catch {
    return text;
  }
}
