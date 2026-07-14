import { shouldTranslateToEnglish, translateLongTextWithConfiguredProvider } from './translation.js';

export const MAX_ML_ANALYSIS_CHARS = 12_000;

export function selectTestimonyAnalysisText(testimony = {}) {
  return String(
    testimony.transcriptionText
    || testimony.narrativeText
    || testimony.summary
    || testimony.title
    || '',
  ).trim();
}

export async function prepareMlAnalysisInput(text) {
  const originalText = String(text || '').trim();
  const sourceForAnalysis = originalText.slice(0, MAX_ML_ANALYSIS_CHARS);
  let preparedText = sourceForAnalysis;
  let translatedToEnglish = false;

  if (shouldTranslateToEnglish(sourceForAnalysis)) {
    const translatedText = await translateLongTextWithConfiguredProvider(sourceForAnalysis, 'auto', 'en');
    if (translatedText && translatedText !== sourceForAnalysis) {
      preparedText = translatedText;
      translatedToEnglish = true;
    }
  }

  return {
    text: preparedText.slice(0, MAX_ML_ANALYSIS_CHARS),
    originalText,
    translatedToEnglish,
    truncated: originalText.length > MAX_ML_ANALYSIS_CHARS || preparedText.length > MAX_ML_ANALYSIS_CHARS,
    originalLength: originalText.length,
  };
}
