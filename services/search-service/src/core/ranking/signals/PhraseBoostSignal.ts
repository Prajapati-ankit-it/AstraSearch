/**
 * Phrase Boost Signal
 * 
 * Boosts documents that contain normalized contiguous query terms.
 * Only applies to multi-term queries that are not very short.
 */

import { RankingSignal, SearchDocument } from '../RankingSignal';
import { RankingContext } from '../RankingContext';
import { logger } from '../../../utils/logger';

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
  readonly name = 'phrase_boost';
  readonly weight = PHRASE_BOOST_WEIGHT;

  // Performance guard: prevent expensive phrase scanning on large candidate sets
  private readonly PHRASE_SCAN_THRESHOLD = 2000;

  score(doc: SearchDocument, query: string, context: RankingContext): number {
    // Apply only for multi-term queries that are not very short
    if (!context.intent.isMultiTerm || context.intent.isVeryShort) {
      return 0;
    }

    // Defensive safety: ensure document text exists and is string
    if (!doc.text || typeof doc.text !== 'string') {
      return 0;
    }

    // Performance guard: skip phrase scanning for large candidate sets
    if (context.candidateCount > this.PHRASE_SCAN_THRESHOLD) {
      logger.debug(`Phrase boost skipped: candidateCount ${context.candidateCount} exceeds threshold ${this.PHRASE_SCAN_THRESHOLD}`);
      return 0;
    }

    // Use normalized full query string for phrase matching
    // Preserves stopwords and true contiguous semantics
    const phrase = query;

    // Check if normalized contiguous query terms exist in document text
    return doc.text.includes(phrase) ? 1 : 0;
  }
}
