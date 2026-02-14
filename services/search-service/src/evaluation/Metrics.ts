/**
 * Evaluation Metrics
 * 
 * Pure functions for computing search evaluation metrics.
 * Binary relevance (1 or 0), O(k) complexity, no side effects.
 */

import { EvaluationResult } from './types';

/**
 * Compute precision at K
 * Fraction of retrieved documents that are relevant
 */
export function precisionAtK(
  retrievedIds: string[],
  relevantSet: Set<string>,
  k: number
): number {
  if (k === 0 || retrievedIds.length === 0) {
    return 0;
  }

  const relevantRetrieved = retrievedIds
    .slice(0, k)
    .filter(id => relevantSet.has(id)).length;

  return relevantRetrieved / Math.min(k, retrievedIds.length);
}

/**
 * Compute recall at K
 * Fraction of relevant documents that are retrieved in top K
 */
export function recallAtK(
  retrievedIds: string[],
  relevantSet: Set<string>,
  k: number
): number {
  if (relevantSet.size === 0) {
    return 0;
  }

  const relevantRetrieved = retrievedIds
    .slice(0, k)
    .filter(id => relevantSet.has(id)).length;

  return relevantRetrieved / relevantSet.size;
}

/**
 * Compute NDCG at K
 * Normalized Discounted Cumulative Gain
 */
export function ndcgAtK(
  retrievedIds: string[],
  relevantSet: Set<string>,
  k: number
): number {
  if (k === 0 || retrievedIds.length === 0) {
    return 0;
  }

  const kSlice = retrievedIds.slice(0, k);
  
  // Compute DCG
  let dcg = 0;
  for (let i = 0; i < kSlice.length; i++) {
    const relevance = relevantSet.has(kSlice[i]) ? 1 : 0;
    if (relevance > 0) {
      dcg += relevance / Math.log2(i + 2);
    }
  }

  // Compute IDCG (ideal DCG) for binary relevance
  const idealCount = Math.min(k, relevantSet.size);
  let idcg = 0;
  for (let i = 0; i < idealCount; i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  return idcg === 0 ? 0 : dcg / idcg;
}
