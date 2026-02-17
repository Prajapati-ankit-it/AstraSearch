import { QueryIntent } from '../query/QueryIntent';
import { PHRASE_SIGNAL_NAME } from './signals/PhraseBoostSignal';
import { PROXIMITY_SIGNAL_NAME } from './signals/ProximityBoostSignal';
import { TERM_COVERAGE_SIGNAL_NAME } from './signals/TermCoverageSignal';

/**
 * Query-length-aware dampening multipliers.
 * 
 * Rationale:
 * - Structural signals (phrase, proximity, coverage) become less discriminative for longer queries
 * - Short queries (1 term): structural signals irrelevant (0.0x)
 * - Medium queries (2-3 terms): full strength (1.0x) - optimal for structural signals
 * - Long queries (4-6 terms): slight dampening (0.8x) - structural signals less discriminative
 * - Very long queries (7+ terms): stronger dampening (0.6x) - structural signals noisy
 * 
 * This preserves recall while reducing structural signal noise for complex queries.
 */
const QUERY_LENGTH_MULTIPLIERS = {
  SINGLE_TERM: 0.0,    // termCount <= 1
  MEDIUM_QUERY: 1.0,   // termCount 2-3
  LONG_QUERY: 0.8,     // termCount 4-6
  VERY_LONG_QUERY: 0.6  // termCount >= 7
} as const;

/**
 * Intent-aware weight modulation.
 *
 * The adjuster applies a simple, condition-based amplification with query-length-aware dampening.
 * Only phrase-like queries modify weights through amplification.
 * All other intents return baseWeight unchanged.
 * No stacking occurs because only one condition exists.
 * Future intent profiles must explicitly define exclusivity if introduced.
 *
 * MULTIPLIER INTERACTION:
 * - Query-length dampening applies to structural signals to prevent over-influence for long queries.
 * - Phrase-like amplification is relative, not absolute.
 * - Final weight = baseWeight × phraseMultiplier × lengthMultiplier.
 * - For long phrase-like queries, amplification remains relative to same-length non-phrase queries.
 * - ExactMatchSignal is intentionally excluded from dampening because exact equality becomes more discriminative for longer queries.
 *
 * This layer modulates signal weights based on query intent.
 * Some legacy signals may also inspect intent internally.
 * New signals SHOULD remain intent-agnostic and rely on this layer for tuning.
 */

/**
 * Multipliers for phrase-like queries.
 * 
 * Design rationale:
 * - Phrase multiplier (1.5) > proximity multiplier (1.3) because exact phrase matches
 *   represent stronger structural alignment than proximity matches
 * - Multipliers amplify base weights only, never replace them
 * - These are heuristic values that must be validated offline through evaluation
 * - Changes affect global ranking behavior and require careful measurement
 */
const PHRASE_LIKE_PHRASE_MULTIPLIER = 1.5;
const PHRASE_LIKE_PROXIMITY_MULTIPLIER = 1.3;

export class IntentWeightAdjuster {

  /**
   * Computes query-length-aware dampening multiplier.
   * 
   * Structural signals become less discriminative for longer queries.
   * This preserves recall while reducing structural signal noise.
   * 
   * @param termCount Number of terms in the query
   * @returns Dampening multiplier for structural signals
   */
  private static getQueryLengthMultiplier(termCount: number): number {
    if (termCount <= 1) {
      return QUERY_LENGTH_MULTIPLIERS.SINGLE_TERM;
    }
    if (termCount <= 3) {
      return QUERY_LENGTH_MULTIPLIERS.MEDIUM_QUERY;
    }
    if (termCount <= 6) {
      return QUERY_LENGTH_MULTIPLIERS.LONG_QUERY;
    }
    return QUERY_LENGTH_MULTIPLIERS.VERY_LONG_QUERY;
  }

  static adjust(signalName: string, baseWeight: number, intent: QueryIntent): number {

    let weight = baseWeight;

    // Phrase-like queries take highest priority
    if (intent.isPhraseLike) {
      if (signalName === PHRASE_SIGNAL_NAME) {
        weight = baseWeight * PHRASE_LIKE_PHRASE_MULTIPLIER;
      }
      if (signalName === PROXIMITY_SIGNAL_NAME) {
        weight = baseWeight * PHRASE_LIKE_PROXIMITY_MULTIPLIER;
      }
    }

    // Apply query-length dampening to structural signals only
    if (signalName === PHRASE_SIGNAL_NAME || 
        signalName === PROXIMITY_SIGNAL_NAME || 
        signalName === TERM_COVERAGE_SIGNAL_NAME) {
      const lengthMultiplier = this.getQueryLengthMultiplier(intent.termCount);
      weight *= lengthMultiplier;
    }

    return weight;
  }
}
