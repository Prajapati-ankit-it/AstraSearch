import { Document } from '../../types/search.types';
import { RankingContext } from './RankingContext';
import { SignalRegistry } from './SignalRegistry';
import { IntentWeightAdjuster } from './IntentWeightAdjuster';
import { logger } from '../../utils/logger';

export interface RankedDocument {
  docId: string;
  bm25Score: number;
  finalScore: number;
  document: Document;
}

export class Ranker {
  private static readonly registry = SignalRegistry.getInstance();

  private static rank(
    docId: string,
    bm25Score: number,
    document: Document,
    query: string,
    context: RankingContext,
    signals: any[],
    adjustedWeights: Map<string, number>
  ): RankedDocument {
    let signalScore = 0;
    for (const signal of signals) {
      try {
        const score = signal.score(document, query, context);
        
        // Validate signal score is finite
        if (!Number.isFinite(score)) {
          logger.warn(`Signal ${signal.name} returned non-finite score: ${score} for document ${docId}, treating as 0`);
          continue; // Skip this signal
        }
        
        signalScore += score * (adjustedWeights.get(signal.name) ?? signal.weight);
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
    documents: Map<string, { bm25Score: number; document: Document }>,
    query: string,
    context: RankingContext
  ): RankedDocument[] {
    const activeSignals = this.registry.getActiveSignals();
    
    // Precompute adjusted weights once per query (not per document)
    const adjustedWeights = new Map<string, number>();
    for (const signal of activeSignals) {
      const adjusted = IntentWeightAdjuster.adjust(
        signal.name,
        signal.weight,
        context.intent
      );
      adjustedWeights.set(signal.name, adjusted);
    }
    
    const results: RankedDocument[] = [];

    for (const [docId, { bm25Score, document }] of documents) {
      const ranked = this.rank(docId, bm25Score, document, query, context, activeSignals, adjustedWeights);
      results.push(ranked);
    }

    return results;
  }
}
