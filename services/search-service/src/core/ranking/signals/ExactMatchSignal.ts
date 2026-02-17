/**
 * Exact Match Signal
 * 
 * Boosts documents where the entire normalized query exactly matches the document text.
 * Only applies when document text is identical to normalized query.
 * 
 * SEMANTICS & DESIGN:
 * - Exact match provides highest precision signal
 * - Compares normalized document text to normalized query for exact equality
 * - Orthogonal to phrase and proximity signals
 * - No recall impact - only exact matches receive boost
 * - Maintains strict separation from indexing and retrieval logic
 * 
 * PERFORMANCE:
 * - Time: O(1) per document - simple string comparison
 * - Implementation: direct equality check with defensive guards
 * - No scanning or complex operations required
 * 
 * Weight must be tuned empirically using evaluation framework.
 */

import { RankingSignal, SearchDocument } from '../RankingSignal';
import { RankingContext } from '../RankingContext';

/**
 * Global weight for exact match signal.
 *
 * Rationale:
 * - Exact matches should significantly improve ranking when they occur,
 *   but must not dominate core relevance signals.
 * - A value of 0.5 provides strong boost for perfect matches
 *   while maintaining balance with other signals.
 * - Exact match complements BM25's term-level scoring with document-level precision.
 */
const EXACT_MATCH_WEIGHT = 0.5;

export class ExactMatchSignal implements RankingSignal {
  readonly name = 'exact_match';
  readonly weight = EXACT_MATCH_WEIGHT;

  score(doc: SearchDocument, query: string, context: RankingContext): number {
    // Defensive guard: ensure document text exists and is string
    if (!doc.text || typeof doc.text !== 'string') {
      return 0;
    }

    // Exact normalized equality check
    // doc.text is already normalized during ingestion pipeline
    // context.normalizedQuery is normalized query string
    // Direct equality provides highest precision matching
    return doc.text === context.normalizedQuery ? 1 : 0;
  }
}
