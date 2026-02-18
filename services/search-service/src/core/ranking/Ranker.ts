import { Document } from '../../types/search.types';
import { RankingContext } from './RankingContext';
import { SignalRegistry } from './SignalRegistry';
import { IntentWeightAdjuster } from './IntentWeightAdjuster';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

/**
 * Represents a document that has been ranked with both BM25 score and signal-based adjustments.
 */
export interface RankedDocument {
  docId: string;
  bm25Score: number;
  finalScore: number;
  document: Document;
}

/**
 * Ranker applies ranking signals to BM25-scored documents.
 * 
 * FIELD-AWARE SIGNAL TUNING:
 * 
 * Structural signals (phrase, proximity, exact match) receive stronger weight amplification
 * when their match conditions occur in the document title versus body field.
 * This reflects higher semantic importance of title field matches.
 * 
 * Weight amplification is applied multiplicatively:
 * finalWeight = baseWeight × titleStructuralBoostMultiplier
 * 
 * Where titleStructuralBoostMultiplier defaults to 1.3 and is configurable.
 * Body-only matches remain unchanged (multiplier = 1.0).
 * 
 * This tuning affects ranking only and does not modify retrieval or BM25 scoring.
 * Signals remain field-agnostic; field detection happens in ranking layer.
 */
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

        // Apply field-aware weight adjustment for structural signals
        let finalWeight = adjustedWeights.get(signal.name) ?? signal.weight;
        finalWeight = this.applyFieldAwareWeightAdjustment(signal.name, finalWeight, context);

        signalScore += score * finalWeight;
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
    documents: Map<string, { bm25Score: number; document: Document; context: RankingContext }>,
    query: string
  ): RankedDocument[] {
    const activeSignals = this.registry.getActiveSignals();
    
    // Get intent from first document (same for all documents in query)
    const firstDoc = documents.values().next().value;
    if (!firstDoc) {
      return [];
    }
    
    // Precompute adjusted weights once per query (not per document)
    const adjustedWeights = new Map<string, number>();
    for (const signal of activeSignals) {
      const adjusted = IntentWeightAdjuster.adjust(
        signal.name,
        signal.weight,
        firstDoc.context.intent
      );
      adjustedWeights.set(signal.name, adjusted);
    }
    
    const results: RankedDocument[] = [];

    for (const [docId, { bm25Score, document, context }] of documents) {
      const ranked = this.rank(docId, bm25Score, document, query, context, activeSignals, adjustedWeights);
      results.push(ranked);
    }

    return results;
  }

  /**
   * Apply field-aware weight adjustment for structural signals
   * Title matches receive amplification, body matches remain unchanged
   */
  private static applyFieldAwareWeightAdjustment(
    signalName: string,
    baseWeight: number,
    context: RankingContext
  ): number {
    let adjustedWeight = baseWeight;

    // Apply title structural boost multiplier when match occurs in title field
    if (signalName === 'phrase_boost' && context.phraseMatchInTitle) {
      adjustedWeight *= config.titleStructuralBoostMultiplier;
    } else if (signalName === 'proximity_boost' && context.proximityMatchInTitle) {
      adjustedWeight *= config.titleStructuralBoostMultiplier;
    } else if (signalName === 'exact_match' && context.exactMatchInTitle) {
      adjustedWeight *= config.titleStructuralBoostMultiplier;
    }

    return adjustedWeight;
  }
}
