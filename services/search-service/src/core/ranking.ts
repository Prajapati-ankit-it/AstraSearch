import { SearchResult } from '../types/search.types';
import { logger } from '../utils/logger';

export class Ranking {
  /**
   * Rank documents by simple term frequency count
   * Designed to be replaced by BM25 later
   */
  static rankByFrequency(
    docScores: Map<number, number>,
    documents: Map<number, any>,
    limit: number = 10
  ): SearchResult[] {
    try {
      // Convert to array and sort by score (descending)
      const rankedDocs = Array.from(docScores.entries())
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
        .slice(0, limit);

      // Get the highest score for normalization
      const maxScore = rankedDocs.length > 0 ? rankedDocs[0]?.[1] ?? 1 : 1;

      // Transform to SearchResult format
      const results: SearchResult[] = rankedDocs.map(([docId, score]) => {
        const doc = documents.get(docId);
        if (!doc) {
          logger.warn(`Document ${docId} not found in documents map`);
          return null;
        }

        return {
          id: doc.answer_id,
          solution: doc.solution,
          score: this.normalizeScore(score, maxScore)
        };
      })
      .filter((result): result is SearchResult => result !== null);

      logger.debug(`Ranked ${results.length} documents`);
      return results;

    } catch (error) {
      logger.error('Ranking error:', error);
      return [];
    }
  }

  /**
   * Normalize score to 0-1 range for better API consistency
   */
  private static normalizeScore(score: number, maxScore: number): number {
    if (maxScore === 0) return 0;
    return Math.round((score / maxScore) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Placeholder for future BM25 implementation
   */
  static rankByBM25(
    docScores: Map<number, number>,
    documents: Map<number, any>,
    limit: number = 10
  ): SearchResult[] {
    // TODO: Implement BM25 ranking algorithm
    logger.warn('BM25 ranking not yet implemented, falling back to frequency ranking');
    return this.rankByFrequency(docScores, documents, limit);
  }
}