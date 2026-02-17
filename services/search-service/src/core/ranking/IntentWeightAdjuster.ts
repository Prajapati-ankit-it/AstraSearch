import { QueryIntent } from '../query/QueryIntent';
import { PHRASE_SIGNAL_NAME } from './signals/PhraseBoostSignal';
import { PROXIMITY_SIGNAL_NAME } from './signals/ProximityBoostSignal';

/**
 * Intent-aware weight modulation.
 *
 * The adjuster currently applies a simple, condition-based amplification.
 * Only phrase-like queries modify weights.
 * All other intents return baseWeight unchanged.
 * No stacking occurs because only one condition exists.
 * Future intent profiles must explicitly define exclusivity if introduced.
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

  static adjust(signalName: string, baseWeight: number, intent: QueryIntent): number {

    // Phrase-like queries take highest priority
    if (intent.isPhraseLike) {
      if (signalName === PHRASE_SIGNAL_NAME) {
        return baseWeight * PHRASE_LIKE_PHRASE_MULTIPLIER;
      }
      if (signalName === PROXIMITY_SIGNAL_NAME) {
        return baseWeight * PHRASE_LIKE_PROXIMITY_MULTIPLIER;
      }
      return baseWeight;
    }

    // No stacking. Other intents currently do not adjust weight.
    return baseWeight;
  }
}
