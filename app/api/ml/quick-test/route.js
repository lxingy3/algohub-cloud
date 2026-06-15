import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { prisma } from '../../../../lib/prisma';
import { analyzeNarrativeText } from '../../../../lib/mlQuickAnalysis';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Admin access is required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const narrativeText = String(body.narrativeText || '').trim();
  if (!narrativeText) {
    return NextResponse.json({ error: 'Please enter narrative_text.' }, { status: 400 });
  }
  if (narrativeText.length > 8000) {
    return NextResponse.json({ error: 'Please keep narrative_text under 8000 characters.' }, { status: 400 });
  }

  const storedResult = await findStoredAnalysis(narrativeText);

  return NextResponse.json({
    ok: true,
    result: storedResult || analyzeNarrativeText(narrativeText),
  });
}

async function findStoredAnalysis(narrativeText) {
  const inputText = normalizeForMatch(narrativeText);
  if (inputText.length < 20) return null;

  const testimonies = await prisma.testimony.findMany({
    where: {
      jurisdictionId: getJurisdictionId(),
      narrativeText: { not: '' },
    },
    orderBy: { submittedAt: 'desc' },
    take: 150,
    select: {
      id: true,
      title: true,
      narrativeText: true,
      aiImpactClassification: true,
      aiConfidenceScore: true,
      aiThemes: true,
      aiExtractedExperiences: true,
    },
  });

  const match = testimonies.find((testimony) => {
    const storedText = normalizeForMatch(testimony.narrativeText);
    return storedText === inputText || storedText.includes(inputText) || inputText.includes(storedText);
  });
  if (!match) return null;

  const experiences = normalizeExperiences(match.aiExtractedExperiences);
  return {
    inputField: 'narrativeText',
    source: 'stored_story',
    matchedTestimonyId: match.id,
    matchedTitle: match.title,
    task1: {
      status: 'SKIPPED',
      reason: 'Text input does not need transcription.',
    },
    task2: {
      aiImpactClassification: match.aiImpactClassification || 'UNCLEAR',
      aiConfidenceScore: Number.isFinite(Number(match.aiConfidenceScore)) ? Number(match.aiConfidenceScore) : 0,
      humanReviewRequired: !Number.isFinite(Number(match.aiConfidenceScore)) || Number(match.aiConfidenceScore) < 0.85,
    },
    task3: {
      aiThemes: Array.isArray(match.aiThemes) ? match.aiThemes : [],
    },
    task4: {
      entities: experiences.entities,
    },
    task5: {
      keywords: experiences.keywords,
    },
  };
}

function normalizeForMatch(value) {
  return String(value || '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeExperiences(value) {
  const entityGroups = ['agencies', 'locations', 'systems', 'dates', 'people_roles'];
  const entities = Object.fromEntries(entityGroups.map((group) => [group, []]));
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { entities, keywords: [] };

  const rawEntities = value.entities && typeof value.entities === 'object' && !Array.isArray(value.entities) ? value.entities : {};
  for (const group of entityGroups) {
    entities[group] = Array.isArray(rawEntities[group])
      ? [...new Set(rawEntities[group].map((item) => String(item || '').trim()).filter(Boolean))]
      : [];
  }

  return {
    entities,
    keywords: Array.isArray(value.keywords)
      ? [...new Set(value.keywords.map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 10)
      : [],
  };
}
