/**
 * Phrase Boost Signal
 * 
 * Boosts documents that contain the exact original query phrase.
 * Only applies to multi-term queries that are not very short.
 */

import { RankingSignal, SearchDocument } from '../RankingSignal';
import { RankingContext } from '../RankingContext';

export class PhraseBoostSignal implements RankingSignal {
  readonly name = 'phraseBoost';
  readonly weight = 0.3;

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
