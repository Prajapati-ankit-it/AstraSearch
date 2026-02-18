/**
 * Phrase Boost Signal
 * 
 * Boosts documents that contain normalized contiguous query terms.
 * Only applies to multi-term queries that are not very short.
 * 
 * SEMANTICS & DESIGN:
 * - Phrase boost operates on normalizedQuery to maintain symmetry with indexed documents
 * - Stopwords are preserved intentionally to prefer exact user phrasing
 * - This signal prefers exact contiguous phrasing over term-level matching
 * - BM25 handles core term-level relevance independently
 * - PhraseBoost is a secondary refinement layer that rewards precise phrase matches
 * 
 * PERFORMANCE:
 * - Guard prevents O(N × text length) scanning under high candidate load
 * - Introduces controlled ranking degradation for scalability
 * - This is a deliberate tradeoff between precision and performance
 * 
 * Weight must be tuned empirically using evaluation framework.
 */

import { RankingSignal, SearchDocument } from '../RankingSignal';
import { RankingContext } from '../RankingContext';
import { config } from '../../../config/config';

export const PHRASE_SIGNAL_NAME = 'phrase_boost';

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
  readonly name = PHRASE_SIGNAL_NAME;
  readonly weight = PHRASE_BOOST_WEIGHT;

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
    if (context.candidateCount > config.phraseScanThreshold) {
      return 0;
    }

    // Use normalized query string for phrase matching
    // Preserves normalization symmetry with indexed documents
    const phrase = context.normalizedQuery;

    // Check if normalized contiguous query terms exist in document text
    return doc.text.includes(phrase) ? 1 : 0;
  }

  /**
   * Determines if this signal would trigger on the given text.
   * Uses the exact same detection logic as score() including performance guards.
   * Used for field-aware metadata computation.
   */
  wouldTriggerOnText(text: string, context: RankingContext): boolean {
    // Apply only for multi-term queries that are not very short
    if (!context.intent.isMultiTerm || context.intent.isVeryShort) {
      return false;
    }

    // Defensive safety: ensure text exists and is string
    if (!text || typeof text !== 'string') {
      return false;
    }

    // Performance guard: skip phrase scanning for large candidate sets (same as score())
    if (context.candidateCount > config.phraseScanThreshold) {
      return false;
    }

    // Use normalized query string for phrase matching
    // Preserves normalization symmetry with indexed documents
    const phrase = context.normalizedQuery;

    // Check if normalized contiguous query terms exist in text
    return text.includes(phrase);
  }
}
