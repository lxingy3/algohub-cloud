import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { getCurrentUser } from '../../../lib/auth';
import { mediaStorageProvider, mediaStorageUri } from '../../../lib/mediaStorage';
import { rankStoriesForSearch } from '../../../lib/searchRanking';
import { buildStorySummary } from '../../../lib/storySummary';
import { anonymizedExcerpt, parseExploreFilters, storedKeywords } from '../../../lib/briefingsExplore';
import { cosineSimilarity, getSemanticEmbeddingMap, meanEmbedding } from '../../../lib/semanticEmbeddings';

export const dynamic = 'force-dynamic';

const testimonySchema = z.object({
  title: z.string().trim().min(1),
  name: z.string().trim().optional(),
  city: z.string().trim().min(1),
  zipCode: z.string().trim().optional(),
  occurredAtText: z.string().trim().optional(),
  referralSource: z.string().trim().optional(),
  facilitatorCode: z.string().trim().optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal('')),
  narrativeText: z.string().trim().optional(),
  algorithmId: z.string().trim().optional(),
  uncertainSystem: z.boolean().optional(),
  affectedDomain: z.string().trim().optional(),
  selfReportedImpact: z.enum(['POSITIVE', 'NEGATIVE', 'MIXED', 'UNCLEAR']).optional(),
  publicPosting: z.boolean(),
  followupConsent: z.literal(true),
  isAnonymous: z.boolean().optional(),
  storyType: z.enum(['text', 'voice', 'facilitated']),
  mediaObjectKey: z.string().trim().optional(),
  mediaUrl: z.string().trim().optional(),
  mediaMimeType: z.string().trim().optional(),
  mediaDurationSeconds: z.number().int().nonnegative().optional(),
});

function isChecked(value) {
  return value === 'on' || value === 'true' || value === true;
}

function formText(formData, key) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

const testimonyListSelect = {
  id: true,
  sourceId: true,
  title: true,
  summary: true,
  city: true,
  zipCode: true,
  imageUrl: true,
  submitterName: true,
  referralSource: true,
  publicPosting: true,
  followupConsent: true,
  storyType: true,
  isAnonymous: true,
  narrativeText: true,
  submissionMethod: true,
  audioFileUrl: true,
  originalLanguage: true,
  affectedDomain: true,
  selfReportedImpact: true,
  aiImpactClassification: true,
  aiThemes: true,
  aiLinkedAlgorithmIds: true,
  aiConfidenceScore: true,
  aiExtractedExperiences: true,
  aiProcessedAt: true,
  moderationStatus: true,
  submittedAt: true,
  updatedAt: true,
  algorithmLinks: { select: { linkType: true, confidence: true, algorithm: true } },
  _count: { select: { comments: true, reactions: true } },
};

const testimonySearchSelect = {
  ...testimonyListSelect,
  transcriptionText: true,
  brief: { select: { summary: true } },
};

const testimonyExcerptSelect = {
  id: true,
  title: true,
  summary: true,
  narrativeText: true,
  transcriptionText: true,
  submissionMethod: true,
  originalLanguage: true,
  affectedDomain: true,
  selfReportedImpact: true,
  aiImpactClassification: true,
  aiThemes: true,
  aiExtractedExperiences: true,
  aiConfidenceScore: true,
  clusterId: true,
  isOutlier: true,
  topicId: true,
  submittedAt: true,
  corpusTopic: { select: { label: true, topKeywords: true } },
  algorithmLinks: {
    select: {
      linkType: true,
      confidence: true,
      algorithm: {
        select: {
          id: true,
          slug: true,
          name: true,
          useCase: true,
          agencyName: true,
        },
      },
    },
  },
  brief: { select: { summary: true } },
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function algorithmLinkWhere(value) {
  if (!value) return {};
  return uuidPattern.test(value)
    ? { algorithmId: value }
    : { algorithm: { slug: value } };
}

function normalizeThemeName(value) {
  return String(value || '').trim().toLowerCase();
}

function storyHasTheme(story, theme) {
  const target = normalizeThemeName(theme);
  if (!target) return true;
  const themes = Array.isArray(story.aiThemes) ? story.aiThemes : [];
  return themes.some((item) => {
    const name = typeof item === 'string' ? item : item?.theme || item?.label || item?.name;
    return normalizeThemeName(name) === target;
  });
}

function cleanExcerptText(story) {
  return anonymizedExcerpt(story);
}

function pickBriefingExcerpts(stories, limit, embeddings) {
  const picked = [];
  const seenIds = new Set();

  const addStory = (story, whyShown) => {
    if (!story || seenIds.has(story.id) || picked.length >= limit) return;
    picked.push({ story, whyShown });
    seenIds.add(story.id);
  };

  const clusterGroups = new Map();
  for (const story of stories) {
    if (story.clusterId == null || story.isOutlier) continue;
    clusterGroups.set(story.clusterId, [...(clusterGroups.get(story.clusterId) || []), story]);
  }
  const sortedGroups = [...clusterGroups.values()].sort((left, right) => right.length - left.length);
  for (const group of sortedGroups) {
    const centroid = meanEmbedding(group.map((story) => embeddings.get(story.id)?.vector));
    const representative = centroid
      ? [...group].sort((left, right) => {
        const rightScore = cosineSimilarity(embeddings.get(right.id)?.vector, centroid) ?? -1;
        const leftScore = cosineSimilarity(embeddings.get(left.id)?.vector, centroid) ?? -1;
        return rightScore - leftScore;
      })[0]
      : group[0];
    addStory(representative, centroid
      ? 'Story nearest to the saved sentence-transformers cluster centroid.'
      : 'Representative story from a recurring cluster.');
  }

  for (const story of stories) {
    if (!story.isOutlier) continue;
    addStory(story, 'Minority or outlier story kept visible by the corpus model.');
  }

  for (const story of stories) {
    addStory(story, 'Recent approved story matching the current filters.');
  }

  return picked.map(({ story, whyShown }) => ({
    id: story.id,
    title: story.title || 'Untitled story',
    excerpt: cleanExcerptText(story),
    whyShown,
    submittedAt: story.submittedAt,
    submissionMethod: story.submissionMethod,
    originalLanguage: story.originalLanguage,
    affectedDomain: story.affectedDomain,
    impact: story.aiImpactClassification || story.selfReportedImpact || 'UNCLEAR',
    themes: Array.isArray(story.aiThemes) ? story.aiThemes : [],
    confidence: story.aiConfidenceScore,
    cluster: story.clusterId == null ? null : { id: story.clusterId, isOutlier: story.isOutlier },
    topic: story.topicId == null ? null : {
      id: story.topicId,
      label: story.corpusTopic?.label || 'Suggested topic',
      keywords: storedKeywords(story),
    },
    keywords: storedKeywords(story),
    algorithms: story.algorithmLinks.map((link) => ({
      slug: link.algorithm.slug,
      name: link.algorithm.name,
      useCase: link.algorithm.useCase,
      agencyName: link.algorithm.agencyName,
      linkType: link.linkType,
      confidence: link.confidence,
    })),
  }));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filters = parseExploreFilters(request);
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50);
  const jurisdictionId = getJurisdictionId();
  const search = searchParams.get('search') || '';
  const { algorithm, domain, impact, language, lens, submissionMethod, theme } = filters;
  const fields = searchParams.get('fields') || '';
  const submittedAt = {
    ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
    ...(filters.dateTo ? { lte: filters.dateTo } : {}),
  };
  const storyFilters = [
    ...(domain ? [{
      OR: [
        { affectedDomain: domain },
        { algorithmLinks: { some: { algorithm: { useCase: domain } } } },
      ],
    }] : []),
    ...(impact ? [{ OR: [{ selfReportedImpact: impact }, { aiImpactClassification: impact }] }] : []),
  ];

  const where = {
    jurisdictionId,
    moderationStatus: 'APPROVED',
    ...(language ? { originalLanguage: language } : {}),
    ...(submissionMethod ? { submissionMethod } : {}),
    ...(Object.keys(submittedAt).length ? { submittedAt } : {}),
    ...(storyFilters.length ? { AND: storyFilters } : {}),
    ...(algorithm ? { algorithmLinks: { some: algorithmLinkWhere(algorithm) } } : {}),
  };

  if (lens === 'government') {
    const total = await prisma.testimony.count({ where });
    return NextResponse.json({
      items: [],
      page,
      limit,
      total,
      scope: searchParams.get('scope') || (algorithm ? 'algorithm' : 'corpus'),
      fields: fields || 'list',
      notes: ['Government lens is aggregate-only; story rows are not returned.'],
    });
  }

  if (fields === 'excerpt') {
    const candidates = await prisma.testimony.findMany({
      where,
      orderBy: [
        { isOutlier: 'desc' },
        { submittedAt: 'desc' },
      ],
      take: 150,
      select: testimonyExcerptSelect,
    });
    const matchingStories = candidates.filter((story) => storyHasTheme(story, theme));
    const embeddings = await getSemanticEmbeddingMap('testimony', matchingStories.map((story) => story.id), { jurisdictionId });
    const start = (page - 1) * limit;
    const items = pickBriefingExcerpts(matchingStories, start + limit, embeddings).slice(start, start + limit);

    return NextResponse.json({
      items,
      page,
      limit,
      total: matchingStories.length,
      scope: searchParams.get('scope') || (algorithm ? 'algorithm' : 'corpus'),
      fields: 'excerpt',
      method: 'stored Task 4 entities for redaction, sentence-transformers cluster-centroid similarity plus HDBSCAN outlier fields for selection, and KeyBERT keywords when available',
      notes: [
        'Excerpts are shortened and avoid submitter contact details.',
        'Representative rows are nearest the saved cluster centroid; minority rows use is_outlier when available.',
      ],
    });
  }

  if (search) {
    const candidates = await prisma.testimony.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      select: testimonySearchSelect,
    });
    const ranked = rankStoriesForSearch(candidates, search);
    const items = ranked.slice((page - 1) * limit, page * limit).map((story) => {
      const item = { ...story };
      delete item.brief;
      delete item.transcriptionText;
      return item;
    });

    return NextResponse.json({ items, page, limit, total: ranked.length });
  }

  const [items, total] = await Promise.all([
    prisma.testimony.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: testimonyListSelect,
    }),
    prisma.testimony.count({ where }),
  ]);

  return NextResponse.json({ items, page, limit, total });
}

export async function POST(request) {
  const user = await getCurrentUser();
  const contentType = request.headers.get('content-type') || '';
  const formData = contentType.includes('application/json') ? null : await request.formData();
  const payload = formData ? {
    title: formText(formData, 'title'),
    name: formText(formData, 'name'),
    city: formText(formData, 'city'),
    zipCode: formText(formData, 'zipCode'),
    occurredAtText: formText(formData, 'occurredAtText'),
    referralSource: formText(formData, 'referralSource'),
    facilitatorCode: formText(formData, 'facilitatorCode'),
    contactEmail: formText(formData, 'contactEmail'),
    narrativeText: formText(formData, 'narrativeText'),
    algorithmId: formText(formData, 'algorithmId'),
    affectedDomain: formText(formData, 'affectedDomain'),
    selfReportedImpact: formText(formData, 'selfReportedImpact') || 'UNCLEAR',
    publicPosting: isChecked(formData.get('publicPosting')),
    followupConsent: isChecked(formData.get('followupConsent')),
    isAnonymous: isChecked(formData.get('isAnonymous')),
    storyType: formText(formData, 'storyType') || 'text',
  } : await request.json().catch(() => null);
  const jurisdictionId = getJurisdictionId();
  const result = testimonySchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json({ error: 'Invalid testimony submission' }, { status: 400 });
  }

  const {
    title,
    name,
    city,
    zipCode,
    occurredAtText,
    referralSource,
    facilitatorCode,
    contactEmail,
    narrativeText,
    algorithmId,
    uncertainSystem,
    affectedDomain,
    selfReportedImpact,
    publicPosting,
    followupConsent,
    isAnonymous,
    storyType,
    mediaObjectKey,
    mediaUrl,
    mediaMimeType,
    mediaDurationSeconds,
  } = result.data;

  if (storyType === 'voice' && !mediaObjectKey) {
    return NextResponse.json({ error: 'Please record or upload media before submitting.' }, { status: 400 });
  }

  const fallbackNarrative =
    storyType === 'voice'
      ? 'A voice story was submitted and is waiting for transcription.'
      : storyType === 'facilitated'
          ? 'A facilitated story session was submitted.'
          : '';
  const storedNarrative = narrativeText?.trim() || fallbackNarrative;
  const storedMediaUri = mediaObjectKey ? (mediaUrl || mediaStorageUri(mediaObjectKey)) : null;

  const testimony = await prisma.$transaction(async (tx) => {
    const created = await tx.testimony.create({
      data: {
      jurisdictionId,
      title,
      city: city || '',
      zipCode: zipCode || null,
      occurredAtText: occurredAtText || null,
      referralSource: referralSource || null,
      facilitatorCode: facilitatorCode || null,
      publicPosting,
      followupConsent,
      storyType,
      narrativeText: storedNarrative,
      summary: buildStorySummary(storedNarrative),
      userId: user?.id,
      submitterName: isAnonymous ? null : (name || user?.name),
      submitterEmail: contactEmail || user?.email,
      contactEmail: contactEmail || null,
      isAnonymous: Boolean(isAnonymous),
      submissionMethod: storyType === 'facilitated' ? 'FACILITATED_SESSION' : storyType === 'voice' ? 'AUDIO_TRANSCRIPTION' : 'WEB_FORM',
      audioFileUrl: storyType === 'voice' ? storedMediaUri : null,
      videoFileUrl: null,
      mediaStorageProvider: mediaObjectKey ? mediaStorageProvider : null,
      mediaObjectKey: mediaObjectKey || null,
      mediaMimeType: mediaMimeType || null,
      mediaDurationSeconds: mediaDurationSeconds || null,
      transcriptionStatus: storyType === 'voice' ? 'PENDING' : 'NOT_REQUIRED',
      selfReportedImpact,
      affectedDomain: affectedDomain || null,
      moderationStatus: 'PENDING',
      },
    });

    if (algorithmId && !uncertainSystem) {
      await tx.testimonyAlgorithmLink.create({
        data: {
          testimonyId: created.id,
        algorithmId,
        linkType: 'SUBMITTER_IDENTIFIED',
        confidence: 1,
        },
      });
    }

    if (storyType === 'voice' && mediaObjectKey) {
      await tx.transcriptionJob.create({
        data: {
          testimonyId: created.id,
          jurisdictionId,
          mediaKind: 'audio',
          objectKey: mediaObjectKey,
          mediaUrl: storedMediaUri,
          storageProvider: mediaStorageProvider,
          mimeType: mediaMimeType || null,
          provider: 'open-source-pipeline-pending',
        },
      });
    }

    return created;
  });

  return contentType.includes('application/json')
    ? NextResponse.json({ id: testimony.id, redirectTo: '/stories' }, { status: 201 })
    : NextResponse.redirect(new URL('/stories', request.url), { status: 303 });
}
