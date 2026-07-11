import { NextResponse } from 'next/server';
import { isFallbackTranslationSupported, normalizeLanguage, translateTexts } from '../../../lib/translation';

export const dynamic = 'force-dynamic';

const MAX_TEXTS = 50;
const MAX_TEXT_CHARS = 4000;
const MAX_TOTAL_CHARS = 12000;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const targetLanguage = normalizeLanguage(body.targetLanguage);
  const sourceLanguage = normalizeLanguage(body.sourceLanguage) || 'en';
  const texts = Array.isArray(body.texts)
    ? body.texts.map((text) => String(text || '').trim().slice(0, MAX_TEXT_CHARS)).filter(Boolean).slice(0, MAX_TEXTS)
    : [];

  if (texts.reduce((sum, text) => sum + text.length, 0) > MAX_TOTAL_CHARS) {
    return NextResponse.json({ error: 'Translation request is too large.' }, { status: 413 });
  }

  if (!targetLanguage || targetLanguage === sourceLanguage || !texts.length) {
    return NextResponse.json({ translations: texts, configured: false });
  }

  const translations = await translateTexts(texts, sourceLanguage, targetLanguage);
  return NextResponse.json({
    translations,
    configured: Boolean(process.env.TRANSLATION_API_URL),
    fallbackConfigured: isFallbackTranslationSupported(targetLanguage),
  });
}
