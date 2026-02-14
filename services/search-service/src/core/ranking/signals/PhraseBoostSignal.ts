/**
 * Phrase Boost Signal
 * 
 * Boosts documents that contain the exact original query phrase.
 * Only applies to multi-term queries that are not very short.
 */

import { RankingSignal, SearchDocument } from '../RankingSignal';
import { RankingContext } from '../RankingContext';

/**
 * Global weight for the phrase boost signal.
 *
 * Rationale:
 * - Phrase matches should meaningfully improve ranking when they occur,
 *   but must not dominate core relevance signals.
 * - A value of 0.3 keeps this signal as a secondary boost in a typical
 *   normalized score range of [0, 1], where a phrase hit can adjust the
 *   final score but cannot fully override primary text-matching signals.
 */
const PHRASE_BOOST_WEIGHT = 0.3;

export class PhraseBoostSignal implements RankingSignal {
  readonly name = 'phraseBoost';
  readonly weight = PHRASE_BOOST_WEIGHT;

  score(doc: SearchDocument, query: string, context: RankingContext): number {
    // Apply only for multi-term queries that are not very short
    if (!context.intent.isMultiTerm || context.intent.isVeryShort) {
      return 0;
    }

    // Use original query terms to form phrase
    const phrase = context.queryTerms.join(' ');

    // Check if exact phrase exists in document text
    return doc.text.includes(phrase) ? 1 : 0;
  }
}
