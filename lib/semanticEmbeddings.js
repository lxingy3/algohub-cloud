import { getJurisdictionId } from './jurisdiction.js';
import { prisma } from './prisma.js';

export const BRIEFINGS_EMBEDDING_MODEL = process.env.BRIEFINGS_EMBEDDING_MODEL || 'Qwen/Qwen3-Embedding-0.6B';
export const SEMANTIC_RELEVANCE_THRESHOLD = 0.4;

export function embeddingVector(value) {
  if (!Array.isArray(value)) return null;
  const vector = value.map(Number);
  return vector.length && vector.every(Number.isFinite) ? vector : null;
}

export function cosineSimilarity(a, b) {
  const left = embeddingVector(a);
  const right = embeddingVector(b);
  if (!left || !right || left.length !== right.length) return null;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  return denominator ? dot / denominator : null;
}

export function meanEmbedding(vectors) {
  const usable = vectors.map(embeddingVector).filter(Boolean);
  if (!usable.length || usable.some((vector) => vector.length !== usable[0].length)) return null;
  const mean = Array(usable[0].length).fill(0);
  for (const vector of usable) {
    for (let index = 0; index < vector.length; index += 1) mean[index] += vector[index];
  }
  return mean.map((value) => value / usable.length);
}

export async function getSemanticEmbeddingMap(entityType, entityIds = [], { jurisdictionId = getJurisdictionId(), model = BRIEFINGS_EMBEDDING_MODEL } = {}) {
  const ids = [...new Set(entityIds.filter(Boolean))];
  const rows = await prisma.semanticEmbedding.findMany({
    where: {
      jurisdictionId,
      entityType,
      model,
      ...(ids.length ? { entityId: { in: ids } } : {}),
    },
    select: { entityId: true, vector: true, contentHash: true, generatedAt: true },
  });
  return new Map(rows.map((row) => [row.entityId, {
    vector: embeddingVector(row.vector),
    contentHash: row.contentHash,
    generatedAt: row.generatedAt,
  }]));
}
