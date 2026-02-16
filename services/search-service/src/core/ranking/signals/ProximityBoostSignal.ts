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
 * PERFORMANCE:
 * - Time:
 *   - Tokenization: O(L) where L = document text length
 *   - Position collection: O(M × L) where M = query term count
 *   - Span computation: O(P₁ × M × Pᵢ), where P₁ is the number of positions for the first term
 *     and Pᵢ is the average number of positions per term; in the worst case where all
 *     terms appear at every position this is O(M × L²)
 * - Implementation: single pass to tokenize doc.text into array, then collect positions per query term
 * - Performance guard: skip for large candidate sets (>3000) to maintain scalability
 * - Early exit: return 0 if fewer than 2 distinct query terms found
 * 
 * Weight must be tuned empirically using evaluation framework.
 */

import { RankingSignal, SearchDocument } from '../RankingSignal';
import { RankingContext } from '../RankingContext';
import { logger } from '../../../utils/logger';

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
  readonly name = 'proximity_boost';
  readonly weight = PROXIMITY_WEIGHT;

  // Performance guard: prevent expensive proximity calculation on large candidate sets
  private readonly PROXIMITY_SCAN_THRESHOLD = 3000;

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
    if (context.candidateCount > this.PROXIMITY_SCAN_THRESHOLD) {
      logger.info(`Proximity boost skipped: candidateCount ${context.candidateCount} exceeds threshold ${this.PROXIMITY_SCAN_THRESHOLD}, query="${context.query}"`);
      return 0;
    }

    // NOTE: doc.text is already normalized during ingestion pipeline
    // Ingestion applies: NFKC Unicode normalization → lowercase → ASCII filtering → whitespace normalization
    // Ranking layer must NOT re-normalize to maintain single-source-of-truth
    // Tokenize document text into array with positions
    const tokens = doc.text.split(/\s+/).filter(Boolean);
    
    // Collect positions for each query term
    const termPositions = new Map<string, number[]>();
    let distinctTermsFound = 0;

    for (const term of context.queryTerms) {
      const positions: number[] = [];
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === term) {
          positions.push(i);
        }
      }
      
      if (positions.length > 0) {
        termPositions.set(term, positions);
        distinctTermsFound++;
      }
    }

    // Need at least 2 distinct query terms to compute proximity
    if (distinctTermsFound < 2) {
      return 0;
    }

    // Compute minimal span covering all matched query terms
    let minSpan = Infinity;
    
    // For each combination of positions (one from each term), compute span
    const termNames = Array.from(termPositions.keys());
    const allPositions = termNames.map(term => termPositions.get(term)!);
    
    // Find minimal span by considering all combinations
    // For efficiency, we'll use a greedy approach: try each position of first term
    for (const firstPos of allPositions[0]) {
      let currentMin = firstPos;
      let currentMax = firstPos;
      
      // Expand span to include at least one position from each other term
      for (let i = 1; i < allPositions.length; i++) {
        const positions = allPositions[i];
        // Find position closest to current span
        let closestPos = positions[0];
        let minDistance = Math.abs(closestPos - currentMin);
        
        for (const pos of positions) {
          const distance = Math.min(
            Math.abs(pos - currentMin),
            Math.abs(pos - currentMax)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestPos = pos;
          }
        }
        
        currentMin = Math.min(currentMin, closestPos);
        currentMax = Math.max(currentMax, closestPos);
      }
      
      const span = currentMax - currentMin;
      minSpan = Math.min(minSpan, span);
    }

    // Compute proximity score: closer terms = higher score
    // Note: for distinct query terms, the minimum achievable span is 1 (adjacent positions).
    // span = 1 (adjacent) → score ≈ 0.5
    // span = 2 → score ≈ 0.33
    const proximityScore = 1 / (1 + minSpan);

    return proximityScore;
  }
}
