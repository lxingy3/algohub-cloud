import { NextResponse } from 'next/server';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { prisma } from '../../../../lib/prisma';
import { BRIEFINGS_EMBEDDING_MODEL, cosineSimilarity, getSemanticEmbeddingMap } from '../../../../lib/semanticEmbeddings';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const jurisdictionId = getJurisdictionId();
  const useCase = params.get('use_case') || params.get('domain') || '';
  const algorithmSlug = params.get('algorithm') || '';
  const [insights, algorithm] = await Promise.all([
    prisma.crossJurisdictionInsight.findMany({
      where: {
        isApproved: true,
        NOT: { sourceJurisdictionId: jurisdictionId },
        ...(useCase ? { useCase: { contains: useCase, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        useCase: true,
        insightType: true,
        insightData: true,
        createdAt: true,
        sourceJurisdiction: { select: { id: true, name: true } },
      },
    }),
    algorithmSlug
      ? prisma.algorithm.findFirst({ where: { jurisdictionId, slug: algorithmSlug }, select: { id: true, name: true } })
      : null,
  ]);

  const [insightEmbeddings, algorithmEmbeddings] = await Promise.all([
    getSemanticEmbeddingMap('cross_jurisdiction_insight', insights.map((insight) => insight.id), { jurisdictionId }),
    getSemanticEmbeddingMap('algorithm', algorithm ? [algorithm.id] : [], { jurisdictionId }),
  ]);
  const algorithmVector = algorithm ? algorithmEmbeddings.get(algorithm.id)?.vector : null;
  const rows = insights.map((insight) => {
    const similarity = algorithmVector
      ? cosineSimilarity(algorithmVector, insightEmbeddings.get(insight.id)?.vector)
      : null;
    return {
      id: insight.id,
      sourceJurisdiction: insight.sourceJurisdiction?.name || insight.sourceJurisdiction?.id || 'Peer jurisdiction',
      useCase: insight.useCase,
      insightType: insight.insightType,
      insightData: insight.insightData,
      similarity: Number.isFinite(similarity) ? Number(similarity.toFixed(3)) : null,
      createdAt: insight.createdAt,
    };
  }).sort((a, b) => (b.similarity ?? -1) - (a.similarity ?? -1) || String(a.sourceJurisdiction).localeCompare(String(b.sourceJurisdiction)));

  return NextResponse.json({
    label: 'peer-jurisdiction benchmark',
    method: algorithmVector && rows.some((row) => Number.isFinite(row.similarity))
      ? `${BRIEFINGS_EMBEDDING_MODEL} cosine similarity over approved aggregate peer insights`
      : 'approved aggregate peer insights grouped by shared use-case taxonomy',
    reviewStatus: rows.length ? 'approved aggregate data only' : 'waiting for approved peer insight data',
    rows,
  });
}
