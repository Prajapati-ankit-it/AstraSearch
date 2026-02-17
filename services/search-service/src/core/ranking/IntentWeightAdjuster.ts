import { QueryIntent } from '../query/QueryIntent';
import { PHRASE_SIGNAL_NAME } from './signals/PhraseBoostSignal';
import { PROXIMITY_SIGNAL_NAME } from './signals/ProximityBoostSignal';

/**
 * Intent-aware weight modulation.
 *
 * Intent profile is treated as mutually exclusive.
 * Only one profile is applied per query.
 *
 * This prevents multiplier stacking and keeps tuning predictable.
 *
 * This layer modulates signal weights based on query intent.
 * Some legacy signals may also inspect intent internally.
 * New signals SHOULD remain intent-agnostic and rely on this layer for tuning.
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
