import { QueryIntent } from '../query/QueryIntent';

/**
 * Intent-aware Weight Adjustment
 * 
 * Modulates signal weights based on query intent characteristics.
 * 
 * DESIGN PRINCIPLES:
 * - Signals remain pure: scoring logic never changes based on intent
 * - Intent modifies weight only: preserves signal independence
 * - Prevents signal coupling: signals don't need to know about intent
 * - Maintains ranking modularity: clear separation of concerns
 * 
 * This approach allows signals to focus on their core scoring logic
 * while intent-based tuning happens centrally and transparently.
 */
export class IntentWeightAdjuster {
  static adjust(
    signalName: string,
    baseWeight: number,
    intent: QueryIntent
  ): number {
    let weight = baseWeight;

    // Single-term queries: reduce structural signal weights
    if (intent.isSingleTerm) {
      if (signalName === 'phrase_boost' || signalName === 'proximity_boost') {
        weight *= 0.5;
      }
    }

    // Very short queries: moderate reduction of structural signals
    if (intent.isVeryShort) {
      if (signalName === 'phrase_boost' || signalName === 'proximity_boost') {
        weight *= 0.7;
      }
    }

    // Phrase-like queries: boost structural signals
    if (intent.isPhraseLike) {
      if (signalName === 'phrase_boost') {
        weight *= 1.5;
      }
      if (signalName === 'proximity_boost') {
        weight *= 1.3;
      }
    }

    return weight;
  }
}
