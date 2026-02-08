import { RankingSignal, SearchDocument } from './RankingSignal';
import { RankingContext } from './RankingContext';
import { SignalRegistry } from './SignalRegistry';
import { logger } from '../../utils/logger';

export interface RankedDocument {
  docId: number;
  bm25Score: number;
  finalScore: number;
  document: SearchDocument;
}

export class Ranker {
  private static readonly registry = SignalRegistry.getInstance();

  static rank(
    docId: number,
    bm25Score: number,
    document: SearchDocument,
    query: string,
    context: RankingContext
  ): RankedDocument {
    const activeSignals = this.registry.getActiveSignals();
    
    let signalScore = 0;
    for (const signal of activeSignals) {
      try {
        const score = signal.score(document, query, context);
        
        // Validate signal score is finite
        if (!Number.isFinite(score)) {
          logger.warn(`Signal ${signal.name} returned non-finite score: ${score} for document ${docId}, treating as 0`);
          continue; // Skip this signal
        }
        
        signalScore += score * signal.weight;
      } catch (error) {
        // Signals must never crash ranking
        logger.warn(`Signal ${signal.name} failed for document ${docId}:`, error);
        // Continue with score 0 for this signal
      }
    }

    const finalScore = bm25Score + signalScore;

    return {
      docId,
      bm25Score,
      finalScore,
      document
    };
  }

  static rankMultiple(
    documents: Map<number, { bm25Score: number; document: SearchDocument }>,
    query: string,
    context: RankingContext
  ): RankedDocument[] {
    const results: RankedDocument[] = [];

    for (const [docId, { bm25Score, document }] of documents) {
      const ranked = this.rank(docId, bm25Score, document, query, context);
      results.push(ranked);
    }

    return results;
  }
}
