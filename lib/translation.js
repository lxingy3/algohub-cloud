const MAX_TEXT_LENGTH = 1500;
const FALLBACK_TIMEOUT_MS = 3500;
const TRANSLATION_CONCURRENCY = 8;
const MAX_SERVER_CACHE_ENTRIES = 5000;
const SUPPORTED_FALLBACK_LANGUAGES = new Set(['zh', 'es', 'ko', 'ja', 'de', 'fr', 'pt', 'ru', 'ar', 'hi', 'it']);

const translationCache = globalThis.__algostoriesTranslationCache || new Map();
const inFlightTranslations = globalThis.__algostoriesInFlightTranslations || new Map();
globalThis.__algostoriesTranslationCache = translationCache;
globalThis.__algostoriesInFlightTranslations = inFlightTranslations;

export function normalizeLanguage(value) {
  const language = String(value || '').trim().toLowerCase().split('-')[0];
  if (language === 'auto') return 'auto';
  return /^[a-z]{2}$/.test(language) ? language : '';
}

export function shouldTranslateToEnglish(text) {
  const value = String(text || '').trim();
  if (!value) return false;
  if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u0900-\u097f]/.test(value)) return true;
  if (/[áéíóúüñ¿¡àèìòùâêîôûçãõ]/i.test(value)) return true;
  const letters = value.match(/\p{L}/gu) || [];
  if (letters.length < 12) return false;
  const asciiLetters = value.match(/[A-Za-z]/g) || [];
  return asciiLetters.length / letters.length < 0.75;
}

export function detectLikelySourceLanguage(text) {
  const value = String(text || '');
  if (/[\u3400-\u9fff]/.test(value)) return 'zh';
  if (/[\u3040-\u30ff]/.test(value)) return 'ja';
  if (/[\uac00-\ud7af]/.test(value)) return 'ko';
  if (/[\u0400-\u04ff]/.test(value)) return 'ru';
  if (/[\u0600-\u06ff]/.test(value)) return 'ar';
  if (/[\u0900-\u097f]/.test(value)) return 'hi';
  if (/[ñ¿¡]/i.test(value)) return 'es';
  if (/[àâçéèêëîïôûùüÿœ]/i.test(value)) return 'fr';
  if (/[ãõ]/i.test(value)) return 'pt';
  if (/[äöüß]/i.test(value)) return 'de';
  if (/[àèéìíîòóùú]/i.test(value)) return 'it';
  return 'auto';
}

export async function translateTexts(texts, sourceLanguage, targetLanguage) {
  const normalizedSource = normalizeLanguage(sourceLanguage) || 'en';
  const normalizedTarget = normalizeLanguage(targetLanguage);
  const cleanTexts = Array.isArray(texts)
    ? texts.map((text) => String(text || '').trim()).filter(Boolean)
    : [];
  if (!normalizedTarget || normalizedTarget === normalizedSource || !cleanTexts.length) return cleanTexts;

  const clippedTexts = cleanTexts.map((text) => text.slice(0, MAX_TEXT_LENGTH));
  const uniqueTexts = [...new Set(clippedTexts)];
  const translatedPairs = await mapWithConcurrency(uniqueTexts, TRANSLATION_CONCURRENCY, async (text) => {
    const translated = await translateCachedText(text, normalizedSource, normalizedTarget);
    return [text, translated];
  });
  const translationMap = new Map(translatedPairs);
  return clippedTexts.map((text) => translationMap.get(text) || text);
}

export async function translateLongText(text, sourceLanguage = 'auto', targetLanguage = 'en') {
  const value = String(text || '').trim();
  if (!value) return '';
  const resolvedSourceLanguage = sourceLanguage === 'auto' ? detectLikelySourceLanguage(value) : sourceLanguage;
  const chunks = chunkText(value, 1200);
  const translations = await translateTexts(chunks, resolvedSourceLanguage, targetLanguage);
  return translations.join(' ').replace(/\s+/g, ' ').trim() || value;
}

export function isFallbackTranslationSupported(language) {
  return SUPPORTED_FALLBACK_LANGUAGES.has(normalizeLanguage(language));
}

async function translateCachedText(text, sourceLanguage, targetLanguage) {
  const key = cacheKey(sourceLanguage, targetLanguage, text);
  const cached = translationCache.get(key);
  if (cached) return cached;

  const inFlight = inFlightTranslations.get(key);
  if (inFlight) return inFlight;

  const promise = translateTextUncached(text, sourceLanguage, targetLanguage)
    .then((translated) => {
      setCachedTranslation(key, translated);
      return translated;
    })
    .finally(() => {
      inFlightTranslations.delete(key);
    });
  inFlightTranslations.set(key, promise);
  return promise;
}

async function translateTextUncached(text, sourceLanguage, targetLanguage) {
  let translated = await translateWithConfiguredProvider(text, sourceLanguage, targetLanguage);
  if (translated && translated !== text) return translated;
  if (targetLanguage === 'en' || isFallbackTranslationSupported(targetLanguage)) {
    translated = await translateWithPublicFallback(text, sourceLanguage, targetLanguage);
    return translated || text;
  }
  return text;
}

function cacheKey(sourceLanguage, targetLanguage, text) {
  return `${sourceLanguage}\u0000${targetLanguage}\u0000${text}`;
}

function setCachedTranslation(key, value) {
  if (!value) return;
  if (translationCache.size >= MAX_SERVER_CACHE_ENTRIES) {
    translationCache.delete(translationCache.keys().next().value);
  }
  translationCache.set(key, value);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }));
  return results;
}

async function translateWithConfiguredProvider(text, sourceLanguage, targetLanguage) {
  const apiUrl = process.env.TRANSLATION_API_URL;
  if (!apiUrl) return text;

  const apiKey = process.env.TRANSLATION_API_KEY;
  return translateOne(apiUrl, apiKey, text, sourceLanguage, targetLanguage);
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
  if (sourceLanguage !== 'auto') {
    const myMemoryTranslation = await translateWithMyMemoryFallback(text, sourceLanguage, targetLanguage);
    if (myMemoryTranslation !== text) return myMemoryTranslation;
  }
  return translateWithGoogleFallback(text, sourceLanguage, targetLanguage);
}

async function translateWithGoogleFallback(text, sourceLanguage, targetLanguage) {
  try {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: sourceLanguage || 'auto',
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

function chunkText(text, maxLength) {
  const sentences = String(text || '').match(/[^.!?\n。！？]+[.!?。！？]?|\n+/g) || [text];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    const next = `${current}${current ? ' ' : ''}${sentence.trim()}`.trim();
    if (next.length <= maxLength) {
      current = next;
      continue;
    }
    if (current) chunks.push(current);
    if (sentence.length <= maxLength) {
      current = sentence.trim();
    } else {
      for (let index = 0; index < sentence.length; index += maxLength) {
        chunks.push(sentence.slice(index, index + maxLength));
      }
      current = '';
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
