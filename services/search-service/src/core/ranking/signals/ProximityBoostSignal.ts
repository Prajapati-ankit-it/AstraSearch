/**
 * Proximity Boost Signal
 * 
 * Boosts documents where query terms appear close together, even if not contiguous.
 * Only applies to queries with 2 or more terms.
 * 
 * SEMANTICS & DESIGN:
 * - Proximity boost rewards documents where query terms appear in close proximity
 * - Gradient-based scoring: closer terms = higher boost
 * - Complements phrase boost (binary) with continuous proximity scoring
 * - Works with normalized document text and deduplicated query terms
 * - Maintains strict separation from indexing and retrieval logic
 * 
 * SEMANTIC NOTE:
 * Proximity is computed over the set of query terms that actually appear in the document.
 * It does NOT require all query terms to be present.
 * 
 * Missing terms are handled separately by TermCoverageSignal.
 * This separation avoids double-penalizing documents and keeps signal responsibilities orthogonal.
 * 
 * PERFORMANCE:
 * - Time:
 *   - Tokenization: O(L) where L = document text length
 *   - Position collection: O(L) - single pass through tokens with O(1) query term lookup
 *   - Span computation: O(P₁ × M × Pᵢ), where P₁ is the number of positions for the first term
 *     and Pᵢ is the average number of positions per term; in the worst case where all
 *     terms appear at every position this is O(M × L²)
 *   - Overall: O(L + K log K) where K is total matched term positions
 * - Implementation: single pass to tokenize doc.text into array, then single pass to collect term positions
 * - Performance guard: skip for large candidate sets to maintain scalability
 * - Early exit: return 0 if fewer than 2 distinct query terms found
 * 
 * Weight must be tuned empirically using evaluation framework.
 */

import { RankingSignal, SearchDocument } from '../RankingSignal';
import { RankingContext } from '../RankingContext';
import { config } from '../../../config/config';

export const PROXIMITY_SIGNAL_NAME = 'proximity_boost';

/**
 * Global weight for proximity boost signal.
 *
 * Rationale:
 * - Proximity matches should meaningfully improve ranking when they occur,
 *   but must not dominate core relevance signals.
 * - A value of 0.15 keeps this signal as a tertiary boost that
 *   complements BM25 and other signals without overwhelming term-level relevance.
 * - Proximity provides spatial dimension to BM25's depth scoring.
 */
const PROXIMITY_WEIGHT = 0.15;

export class ProximityBoostSignal implements RankingSignal {
  readonly name = PROXIMITY_SIGNAL_NAME;
  readonly weight = PROXIMITY_WEIGHT;

  score(doc: SearchDocument, query: string, context: RankingContext): number {
    // Apply only to queries with 2 or more terms
    if (context.queryTerms.length < 2) {
      return 0;
    }

    // Defensive check: ensure document text exists and is string
    if (!doc.text || typeof doc.text !== 'string') {
      return 0;
    }

    // Performance guard: skip proximity calculation for large candidate sets
    if (context.candidateCount > config.proximityScanThreshold) {
      return 0;
    }

    // NOTE: doc.text is already normalized during ingestion pipeline
    // Ingestion applies: NFKC Unicode normalization → lowercase → ASCII filtering → whitespace normalization
    // Ranking layer must NOT re-normalize to maintain single-source-of-truth
    // Tokenize document text into array with positions
    const tokens = doc.text.split(/\s+/).filter(Boolean);
    
    // Convert queryTerms to Set for O(1) lookup
    const queryTermsSet = new Set(context.queryTerms);
    
    // Build termPositions in single pass (O(L) instead of O(M×L))
    const termPositions = new Map<string, number[]>();
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (queryTermsSet.has(token)) {
        if (!termPositions.has(token)) {
          termPositions.set(token, []);
        }
        termPositions.get(token)!.push(i);
      }
    }
    
    // Compute distinctTermsFound using termPositions.size
    const distinctTermsFound = termPositions.size;

    // Need at least 2 distinct query terms to compute proximity
    if (distinctTermsFound < 2) {
      return 0;
    }

    // Compute minimal span covering all matched query terms using sliding window
    // Build flattened array of all term positions
    const allPositions: Array<{term: string, pos: number}> = [];
    for (const [term, positions] of termPositions.entries()) {
      for (const pos of positions) {
        allPositions.push({ term, pos });
      }
    }

    // Sort positions by position
    // We flatten and sort positions for clarity and correctness.
    // Although positions are discovered in ascending order per term,
    // interleaving across terms requires global sorting.
    // Given small query term counts, O(K log K) is acceptable.
    allPositions.sort((a, b) => a.pos - b.pos);

    // Use sliding window to find minimal span covering all terms
    let minSpan = Infinity;
    const requiredTerms = new Set(termPositions.keys());
    const termCounts = new Map<string, number>();

    let left = 0;
    for (let right = 0; right < allPositions.length; right++) {
      const rightItem = allPositions[right];
      termCounts.set(rightItem.term, (termCounts.get(rightItem.term) || 0) + 1);

      // Check if window covers all required terms
      while (this.windowCoversAllTerms(termCounts, requiredTerms)) {
        const currentSpan = rightItem.pos - allPositions[left].pos;
        minSpan = Math.min(minSpan, currentSpan);

        // Shrink window from left
        const leftItem = allPositions[left];
        const leftCount = termCounts.get(leftItem.term)!;
        if (leftCount === 1) {
          termCounts.delete(leftItem.term);
        } else {
          termCounts.set(leftItem.term, leftCount - 1);
        }
        left++;
      }
    }

    // If no valid window found, return 0
    if (minSpan === Infinity) {
      return 0;
    }
    // Compute proximity score: closer terms = higher score.
    // For queries with N distinct terms, the minimum achievable span is (N - 1):
    //   - terms = 2, min span = 1 (adjacent positions) → score = 1 / (1 + 1) ≈ 0.5
    //   - terms = 3, min span = 2 (e.g., positions 0,1,2) → score = 1 / (1 + 2) ≈ 0.33
    //   - terms = 2, span = 4 (e.g., positions 0 and 4) → score = 1 / (1 + 4) = 0.2 (farther apart = weaker boost)
    const proximityScore = 1 / (1 + minSpan);

    return proximityScore;
  }

  /**
   * Determines if this signal would trigger on the given text.
   * Uses the exact same detection logic as score() including performance guards.
   * Used for field-aware metadata computation.
   */
  wouldTriggerOnText(text: string, context: RankingContext): boolean {
    // Apply only to queries with 2 or more terms
    if (context.queryTerms.length < 2) {
      return false;
    }

    // Defensive check: ensure text exists and is string
    if (!text || typeof text !== 'string') {
      return false;
    }

    // Performance guard: skip proximity calculation for large candidate sets (same as score())
    if (context.candidateCount > config.proximityScanThreshold) {
      return false;
    }

    // NOTE: text is already normalized during ingestion pipeline
    // Ingestion applies: NFKC Unicode normalization → lowercase → ASCII filtering → whitespace normalization
    // Ranking layer must NOT re-normalize to maintain single-source-of-truth
    // Tokenize text into array with positions
    const tokens = text.split(/\s+/).filter(Boolean);

    // Convert queryTerms to Set for O(1) lookup
    const queryTermsSet = new Set(context.queryTerms);

    // Build termPositions in single pass (O(L) instead of O(M×L))
    const termPositions = new Map<string, number[]>();

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (queryTermsSet.has(token)) {
        if (!termPositions.has(token)) {
          termPositions.set(token, []);
        }
        termPositions.get(token)!.push(i);
      }
    }

    // Compute distinctTermsFound using termPositions.size
    const distinctTermsFound = termPositions.size;

    // Need at least 2 distinct query terms to compute proximity
    if (distinctTermsFound < 2) {
      return false;
    }

    // Compute minimal span covering all matched query terms using sliding window
    // Build flattened array of all term positions
    const allPositions: Array<{term: string, pos: number}> = [];
    for (const [term, positions] of termPositions.entries()) {
      for (const pos of positions) {
        allPositions.push({ term, pos });
      }
    }

    // Sort positions by position
    // We flatten and sort positions for clarity and correctness.
    // Although positions are discovered in ascending order per term,
    // interleaving across terms requires global sorting.
    // Given small query term counts, O(K log K) is acceptable.
    allPositions.sort((a, b) => a.pos - b.pos);

    // Use sliding window to find minimal span covering all terms
    let minSpan = Infinity;
    const requiredTerms = new Set(termPositions.keys());
    const termCounts = new Map<string, number>();

    let left = 0;
    for (let right = 0; right < allPositions.length; right++) {
      const rightItem = allPositions[right];
      termCounts.set(rightItem.term, (termCounts.get(rightItem.term) || 0) + 1);

      // Check if window covers all required terms
      while (this.windowCoversAllTerms(termCounts, requiredTerms)) {
        const currentSpan = rightItem.pos - allPositions[left].pos;
        minSpan = Math.min(minSpan, currentSpan);

        // Shrink window from left
        const leftItem = allPositions[left];
        const leftCount = termCounts.get(leftItem.term)!;
        if (leftCount === 1) {
          termCounts.delete(leftItem.term);
        } else {
          termCounts.set(leftItem.term, leftCount - 1);
        }
        left++;
      }
    }

    // If no valid window found, proximity does not trigger
    if (minSpan === Infinity) {
      return false;
    }

    // If we found a valid span, proximity would trigger
    return true;
  }

  private windowCoversAllTerms(termCounts: Map<string, number>, requiredTerms: Set<string>): boolean {
    // termCounts only populated from requiredTerms.
    // Equal sizes imply full coverage.
    return termCounts.size === requiredTerms.size;
  }
}
