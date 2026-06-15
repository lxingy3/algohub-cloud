import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const themeTerms = {
  opacity: ['explain', 'explained', 'why', 'how', 'transparent', 'transparency', 'calculated', 'criteria'],
  positive_experience: ['helped', 'worked', 'successful', 'faster', 'connected', 'completed', 'approved', 'right person'],
  lack_of_recourse: ['appeal', 'challenge', 'no way', 'could not dispute', 'recourse', 'review'],
  process_confusion: ['confused', 'confusion', 'unclear', 'not sure', 'do not know', "didn't know"],
  arbitrary_outcome: ['random', 'inconsistent', 'arbitrary', 'did not match', 'mismatch'],
  delayed_outcome: ['delay', 'delayed', 'waiting', 'months', 'weeks', 'took too long', 'slow'],
  discriminatory_impact: ['bias', 'biased', 'discriminatory', 'race', 'racial', 'income', 'demographic', 'homeless'],
  lack_of_notification: ['not told', 'no notice', 'notice', 'algorithm involved', "didn't realize"],
  data_accuracy: ['incorrect', 'wrong', 'outdated', 'old record', 'missing data', 'accuracy', 'record'],
  loss_of_dignity: ['dignity', 'dehumanized', 'treated', 'suspicion', 'punished', 'ashamed'],
};

const stopwords = new Set(['able', 'about', 'after', 'again', 'also', 'and', 'are', 'because', 'before', 'being', 'but', 'could', 'during', 'every', 'first', 'for', 'from', 'had', 'has', 'have', 'here', 'her', 'him', 'his', 'how', 'into', 'like', 'made', 'more', 'most', 'not', 'one', 'our', 'out', 'over', 'own', 'she', 'than', 'that', 'the', 'their', 'there', 'these', 'they', 'this', 'those', 'through', 'too', 'was', 'were', 'when', 'where', 'which', 'while', 'who', 'why', 'with', 'without', 'would', 'you', 'your', 'system', 'algorithm', 'automated', 'public', 'service', 'story']);

const confidenceFromScore = (score) => Number(Math.min(0.84, 0.58 + score * 0.07).toFixed(2));

function storyText(testimony) {
  return [testimony.title, testimony.narrativeText, testimony.transcriptionText].filter(Boolean).join(' ');
}

function unique(matches) {
  return [...new Set(matches || [])];
}

function themes(testimony) {
  const text = storyText(testimony).toLowerCase();
  const output = Object.entries(themeTerms)
    .map(([theme, terms]) => {
      const evidence = terms.filter((term) => text.includes(term));
      return evidence.length ? { theme, confidence: confidenceFromScore(evidence.length), evidence: evidence.slice(0, 4) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return output.length ? output : [{ theme: 'process_confusion', confidence: 0.5, evidence: [] }];
}

function entities(testimony) {
  const text = storyText(testimony);
  const lowerText = text.toLowerCase();
  return {
    agencies: unique(text.match(/\b[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4}\s+(?:Agency|Department|Office|Authority|Center|University|County)\b/g)),
    locations: unique(text.match(/\b(?:Pittsburgh|Allegheny County|Downtown Labor Center)\b/g)),
    systems: ['risk score', 'priority score', 'waiting list', 'screening tool', 'routing system', 'inspection system', 'student support system', 'benefits system', 'housing system', 'traffic management system'].filter((term) => lowerText.includes(term)),
    dates: unique(text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}|\b\d{4}\b/g)),
    people_roles: ['caseworker', 'worker', 'screeners', 'supervisors', 'counselor', 'teacher', 'tenant', 'resident', 'parent', 'student', 'caller', 'interpreter', 'agency staff', 'community member'].filter((term) => lowerText.includes(term)),
  };
}

function keywords(testimony) {
  const words = storyText(testimony).toLowerCase().match(/[a-z][a-z'-]{2,}/g)?.filter((word) => !stopwords.has(word)) || [];
  const candidates = [];
  for (const size of [3, 2]) {
    for (let index = 0; index <= words.length - size; index += 1) {
      const phrase = words.slice(index, index + size).join(' ');
      if (new Set(phrase.split(' ')).size > 1) candidates.push(phrase);
    }
  }
  candidates.push(...words);

  const counts = new Map();
  for (const candidate of candidates) counts.set(candidate, (counts.get(candidate) || 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([candidate]) => candidate);
  const selected = [];
  for (const candidate of ranked) {
    const tokens = new Set(candidate.split(' '));
    const repeatsExisting = selected.some((existing) => {
      const existingTokens = new Set(existing.split(' '));
      const overlap = [...tokens].filter((token) => existingTokens.has(token)).length;
      return overlap >= Math.min(tokens.size, 2);
    });
    if (!repeatsExisting) selected.push(candidate);
    if (selected.length >= 10) break;
  }
  return selected;
}

function hasExperiences(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entityValues = value.entities && typeof value.entities === 'object' ? Object.values(value.entities).flat() : [];
  return entityValues.length > 0 || (Array.isArray(value.keywords) && value.keywords.length > 0);
}

async function main() {
  const jurisdictionId = process.argv[2] || 'pittsburgh';
  const force = process.argv.includes('--force');
  const testimonies = await prisma.testimony.findMany({
    where: { jurisdictionId, narrativeText: { not: '' } },
    select: {
      id: true,
      title: true,
      narrativeText: true,
      transcriptionText: true,
      aiThemes: true,
      aiExtractedExperiences: true,
    },
  });

  let updated = 0;
  for (const testimony of testimonies) {
    const hasThemes = Array.isArray(testimony.aiThemes) && testimony.aiThemes.length > 0;
    const hasExtraction = hasExperiences(testimony.aiExtractedExperiences);
    if (!force && hasThemes && hasExtraction) continue;

    await prisma.testimony.update({
      where: { id: testimony.id },
      data: {
        aiThemes: !force && hasThemes ? testimony.aiThemes : themes(testimony),
        aiExtractedExperiences: !force && hasExtraction ? testimony.aiExtractedExperiences : {
          entities: entities(testimony),
          keywords: keywords(testimony),
        },
        aiProcessedAt: new Date(),
      },
    });
    updated += 1;
  }

  console.log(JSON.stringify({ scanned: testimonies.length, updated }));
}

main().finally(async () => {
  await prisma.$disconnect();
});
