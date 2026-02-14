/**
 * Phrase Boost Signal
 * 
 * Boosts documents that contain normalized contiguous query terms.
 * Only applies to multi-term queries that are not very short.
 */

import { RankingSignal, SearchDocument } from '../RankingSignal';
import { RankingContext } from '../RankingContext';

export class PhraseBoostSignal implements RankingSignal {
  readonly name = 'phraseBoost';
  readonly weight = 0.3;

  // Performance guard: prevent expensive phrase scanning on large candidate sets
  private readonly PHRASE_SCAN_THRESHOLD = 2000;

  score(doc: SearchDocument, query: string, context: RankingContext): number {
    // Apply only for multi-term queries that are not very short
    if (!context.intent.isMultiTerm || context.intent.isVeryShort) {
      return 0;
    }

    // Performance guard: skip phrase scanning for large candidate sets
    if (context.candidateCount > this.PHRASE_SCAN_THRESHOLD) {
      return 0;
    }

    // Use normalized query terms to form phrase
    const phrase = context.queryTerms.join(' ');

    // Check if normalized contiguous query terms exist in document text
    return doc.text.includes(phrase) ? 1 : 0;
  }
}
