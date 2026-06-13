import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_TEXTS = 50;
const MAX_TEXT_LENGTH = 1500;

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
  const translations = await translateWithConfiguredProvider(clippedTexts, sourceLanguage, targetLanguage);
  return NextResponse.json({
    translations,
    configured: Boolean(process.env.TRANSLATION_API_URL),
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
