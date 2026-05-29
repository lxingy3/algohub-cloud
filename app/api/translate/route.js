import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TARGETS = {
  zh: 'zh-CN',
  es: 'es-ES',
  ko: 'ko-KR',
  ja: 'ja-JP',
  de: 'de-DE',
  fr: 'fr-FR',
  pt: 'pt-PT',
  ru: 'ru-RU',
  ar: 'ar-SA',
  hi: 'hi-IN',
  it: 'it-IT',
};

const cache = globalThis.__algostoriesTranslationCache || new Map();
globalThis.__algostoriesTranslationCache = cache;

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function splitText(text) {
  if (text.length <= 450) return [text];

  const parts = [];
  let remaining = text;
  while (remaining.length > 450) {
    const slice = remaining.slice(0, 450);
    const splitAt = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf(', '), slice.lastIndexOf(' '));
    const index = splitAt > 120 ? splitAt + 1 : 450;
    parts.push(remaining.slice(0, index).trim());
    remaining = remaining.slice(index).trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

async function translateChunk(text, target) {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `en|${target}`);

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!response.ok) return text;

  const data = await response.json();
  const translated = data?.responseData?.translatedText;
  return translated ? decodeHtml(translated) : text;
}

async function translateText(text, target) {
  const key = `${target}:${text}`;
  if (cache.has(key)) return cache.get(key);

  const translated = (await Promise.all(splitText(text).map((part) => translateChunk(part, target)))).join(' ');
  cache.set(key, translated);
  return translated;
}

async function runWithLimit(items, limit, worker) {
  const results = {};
  let index = 0;

  async function next() {
    const current = index;
    index += 1;
    if (current >= items.length) return;
    const item = items[current];
    results[item] = await worker(item);
    await next();
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

export async function POST(request) {
  try {
    const { target, texts } = await request.json();
    const targetCode = TARGETS[target];

    if (!targetCode) {
      return NextResponse.json({ translations: {} });
    }

    const uniqueTexts = Array.from(
      new Set((Array.isArray(texts) ? texts : []).filter((text) => typeof text === 'string' && text.trim())),
    ).slice(0, 120);

    const translations = await runWithLimit(uniqueTexts, 4, (text) => translateText(text, targetCode));
    return NextResponse.json({ translations });
  } catch {
    return NextResponse.json({ translations: {} }, { status: 200 });
  }
}
