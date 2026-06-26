import { NextResponse } from 'next/server';
import { isFallbackTranslationSupported, normalizeLanguage, translateTexts } from '../../../lib/translation';

export const dynamic = 'force-dynamic';

const MAX_TEXTS = 50;

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

  const translations = await translateTexts(texts, sourceLanguage, targetLanguage);
  return NextResponse.json({
    translations,
    configured: Boolean(process.env.TRANSLATION_API_URL),
    fallbackConfigured: isFallbackTranslationSupported(targetLanguage),
  });
}
