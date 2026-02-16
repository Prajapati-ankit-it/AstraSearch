/**
 * Term Coverage Signal
 * 
 * Boosts documents that match more distinct original query terms.
 * Only applies to queries with 2 or more terms.
 * 
 * SEMANTICS & DESIGN:
 * - Coverage complements BM25 by rewarding breadth of term match
 * - Uses original deduplicated queryTerms (not synonym-expanded terms)
 * - Simple coverage ratio: matchedTerms / totalQueryTerms
 * - Provides stability to ranking alongside BM25 term-level scoring
 * - Maintains strict separation from retrieval and normalization logic
 * 
 * PERFORMANCE:
 * - Time: O(L + m) where L = document text length (tokenization) and m = query term count
 * - Implementation: single pass to tokenize doc.text into a Set, then Set.has() per query term
 * - Early-exit once all distinct query terms are matched; no additional guards needed for typical query sizes
 * 
 * Weight must be tuned empirically using evaluation framework.
 */

import { RankingSignal, SearchDocument } from '../RankingSignal';
import { RankingContext } from '../RankingContext';

/**
 * Global weight for term coverage signal.
 *
 * Rationale:
 * - Coverage matches should meaningfully improve ranking when they occur,
 *   but must not dominate core relevance signals.
 * - A value of 0.4 keeps this signal as a secondary boost that
 *   complements BM25 without overwhelming term-level relevance.
 * - Coverage provides breadth dimension to BM25's depth scoring.
 */
const TERM_COVERAGE_WEIGHT = 0.4;

export class TermCoverageSignal implements RankingSignal {
  readonly name = 'term_coverage';
  readonly weight = TERM_COVERAGE_WEIGHT;

  score(doc: SearchDocument, query: string, context: RankingContext): number {
    // Defensive check: ensure document text exists and is string
    if (!doc.text || typeof doc.text !== 'string') {
      return 0;
    }

    // Apply only to queries with 2 or more terms
    if (context.queryTerms.length < 2) {
      return 0;
    }

    // NOTE: doc.text is already normalized during ingestion pipeline
    // Ingestion applies: NFKC Unicode normalization → lowercase → ASCII filtering → whitespace normalization
    // Ranking layer must NOT re-normalize to maintain single-source-of-truth
    // Tokenize document text ONCE for O(L + M) complexity
    const docTokens = new Set(
      doc.text.split(/\s+/).filter(Boolean)
    );

    // Count distinct query terms that appear as full tokens in document
    let matchedTerms = 0;
    const totalQueryTerms = context.queryTerms.length;

    for (const term of context.queryTerms) {
      if (docTokens.has(term)) {
        matchedTerms++;
        // Early exit: all terms matched
        if (matchedTerms === totalQueryTerms) {
          break;
        }
      }
    }

    // Return coverage ratio (0 to 1)
    return matchedTerms / totalQueryTerms;
  }
}
