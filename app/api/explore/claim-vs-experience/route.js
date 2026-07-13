import { NextResponse } from 'next/server';
import { anonymizedExcerpt, getApprovedBriefingCorpus, normalizeThemes, parseExploreFilters, storyTitle } from '../../../../lib/briefingsExplore';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { prisma } from '../../../../lib/prisma';
import { BRIEFINGS_EMBEDDING_MODEL, cosineSimilarity, getSemanticEmbeddingMap, SEMANTIC_RELEVANCE_THRESHOLD } from '../../../../lib/semanticEmbeddings';
import { compatibleBriefingDomain } from '../../../../lib/briefingDomainMatch';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const filters = parseExploreFilters(request);
  const jurisdictionId = getJurisdictionId();
  const algorithms = await prisma.algorithm.findMany({
    where: {
      jurisdictionId,
      ...(filters.algorithm ? { slug: filters.algorithm } : {}),
      ...(filters.agency ? { agencyName: { contains: filters.agency, mode: 'insensitive' } } : {}),
      ...(filters.domain ? { useCase: filters.domain } : {}),
      ...(filters.impactLevel ? { impactLevel: filters.impactLevel } : {}),
      ...(filters.status?.length ? { status: { in: filters.status } } : {}),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      useCase: true,
      claims: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, claimText: true, claimSource: true, claimDate: true },
      },
    },
    orderBy: { name: 'asc' },
  });
  const rows = await getApprovedBriefingCorpus(filters);
  const [storyEmbeddings, claimEmbeddings] = await Promise.all([
    getSemanticEmbeddingMap('testimony', rows.map((row) => row.id), { jurisdictionId }),
    getSemanticEmbeddingMap('claim', algorithms.flatMap((algorithm) => algorithm.claims.map((claim) => claim.id)), { jurisdictionId }),
  ]);
  const hasSemanticCache = storyEmbeddings.size > 0 && claimEmbeddings.size > 0;
  const rowsByAlgorithm = new Map();
  for (const row of rows) {
    for (const link of row.algorithmLinks) {
      const current = rowsByAlgorithm.get(link.algorithm.id) || [];
      current.push(row);
      rowsByAlgorithm.set(link.algorithm.id, current);
    }
  }

  return NextResponse.json({
    label: 'claim vs experience draft',
    method: hasSemanticCache
      ? `stored claims matched within linked or compatible domains using sentence-transformers ${BRIEFINGS_EMBEDDING_MODEL} cosine > ${SEMANTIC_RELEVANCE_THRESHOLD}; synthesis still needs review`
      : 'stored claims joined to approved linked stories while the sentence-transformers cache is unavailable; synthesis still needs review',
    reviewStatus: 'needs human review',
    rows: algorithms.map((algorithm) => {
      const semanticStories = hasSemanticCache ? rankClaimStories(algorithm, rows, claimEmbeddings, storyEmbeddings) : [];
      const stories = semanticStories.length ? semanticStories : (rowsByAlgorithm.get(algorithm.id) || []);
      return {
        algorithmSlug: algorithm.slug,
        algorithmName: algorithm.name,
        useCase: algorithm.useCase,
        claims: algorithm.claims.map((claim) => ({ text: claim.claimText, source: claim.claimSource, date: claim.claimDate })),
        experienceCount: stories.length,
        experienceExamples: filters.lens === 'government' ? [] : stories.slice(0, 3).map((story) => ({
          id: story.id,
          title: storyTitle(story),
          impact: story.aiImpactClassification,
          affectedDomain: story.affectedDomain,
          similarity: story.similarity ?? null,
          excerpt: anonymizedExcerpt(story),
        })),
        experienceMembers: filters.lens === 'government' ? [] : stories.map((story) => ({
          id: story.id,
          title: storyTitle(story),
          impact: story.aiImpactClassification,
          affectedDomain: story.affectedDomain,
          submittedAt: story.submittedAt,
          themes: normalizeThemes(story.aiThemes),
          algorithms: story.algorithmLinks.map((link) => link.algorithm),
          similarity: story.similarity ?? null,
          excerpt: anonymizedExcerpt(story),
        })),
      };
    }).filter((row) => row.claims.length || row.experienceCount),
  });
}

function rankClaimStories(algorithm, stories, claimEmbeddings, storyEmbeddings) {
  const claimVectors = algorithm.claims.map((claim) => claimEmbeddings.get(claim.id)?.vector).filter(Boolean);
  if (!claimVectors.length) return [];
  return stories.filter((story) => (
    story.algorithmLinks.some((link) => link.algorithm.id === algorithm.id)
    || compatibleBriefingDomain(story.affectedDomain, algorithm.useCase)
  )).map((story) => {
    const storyVector = storyEmbeddings.get(story.id)?.vector;
    const scores = claimVectors.map((claimVector) => cosineSimilarity(claimVector, storyVector)).filter(Number.isFinite);
    const similarity = scores.length ? Math.max(...scores) : null;
    return { ...story, similarity: Number.isFinite(similarity) ? Number(similarity.toFixed(3)) : null };
  }).filter((story) => Number.isFinite(story.similarity) && story.similarity > SEMANTIC_RELEVANCE_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity);
}
