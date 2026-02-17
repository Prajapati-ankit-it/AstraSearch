import { InvertedIndex, CorpusStats } from '../types/search.types';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class BM25Scorer {
  private static readonly K1 = 1.2;
  private static readonly B = 0.75;

  /**
   * Compute BM25 score for a document given query terms
   * 
   * Formula: score(D, Q) = Σ IDF(t) * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / avgdl))))
   * 
   * IDF(t) = log(1 + (N - df + 0.5) / (df + 0.5))
   */
  static scoreDocument(
    docId: string,
    queryTerms: string[],
    idfCache: Map<string, number>,
    stats: CorpusStats,
    index: InvertedIndex
  ): number {
    let totalScore = 0;
    const docLength = stats.document_lengths[docId];

    if (!Number.isFinite(docLength)) {
      logger.debug(`Document ${docId} has invalid length: ${docLength}`);
      return 0;
    }

    for (const term of queryTerms) {
      const termData = index[term];
      if (!termData) {
        continue; // Term not in corpus
      }

      const tf = termData.postings[docId];
      if (!tf) {
        continue; // Term not in this document
      }

      const df = termData.df;
      const idf = idfCache.get(term);
      if (idf === undefined) {
        continue; // Term not in IDF cache (shouldn't happen)
      }

      const bm25Component = this.computeBM25Component(tf, docLength, stats.avg_doc_length);

      totalScore += idf * bm25Component;
    }

    return totalScore;
  }

  /**
   * Compute IDF (Inverse Document Frequency)
   * IDF(t) = log(1 + (N - df + 0.5) / (df + 0.5))
   */
  private static computeIDF(N: number, df: number): number {
    return Math.log(1 + (N - df + 0.5) / (df + 0.5));
  }

  /**
   * Compute BM25 component for term frequency and document length normalization
   * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / avgdl))))
   */
  private static computeBM25Component(tf: number, docLength: number, avgDocLength: number): number {
    const numerator = tf * (this.K1 + 1);
    const denominator = tf + this.K1 * (1 - this.B + this.B * (docLength / avgDocLength));
    return numerator / denominator;
  }

  /**
   * Get candidate documents for a query using progressive pruning
   * 
   * PROGRESSIVE PRUNING STRATEGY:
   * - Rare-first intersection: Sort query terms by increasing document frequency
   *   This maximizes early reduction of candidate set size by starting with the most selective terms
   * - Progressive intersection: Stop intersecting when candidate set ≤ target size
   *   This preserves recall while avoiding unnecessary computation
   * - Safety fallback: If progressive intersection yields zero candidates but union would not,
   *   fall back to union to preserve recall for documents matching all query terms
   * 
   * RANKING LAYER UNTOUCHED:
   * - This method only reduces the candidate set passed to ranking
   * - Scoring formulas, signal logic, and weight modulation remain unchanged
   * - Ranking receives a smaller but high-quality candidate set
   * 
   * PERFORMANCE:
   * - O(N log N) where N = number of query terms (for sorting by frequency)
   * - Intersection cost proportional to candidate set size, not corpus size
   * - Early termination reduces unnecessary intersection work
   */
  static getCandidateDocuments(
    queryTerms: string[],
    index: InvertedIndex,
    stats: CorpusStats
  ): Set<string> {
    // Filter out terms not in index
    const validTerms = queryTerms.filter(term => index[term] !== undefined);
    
    if (validTerms.length === 0) {
      return new Set<string>();
    }
    
    if (validTerms.length === 1) {
      // Single term: return all postings for that term
      const termData = index[validTerms[0]];
      return new Set(Object.keys(termData.postings));
    }
    
    // Sort terms by increasing document frequency (rare terms first)
    const sortedTerms = [...validTerms].sort((a, b) => index[a].df - index[b].df);
    
    // Start with postings of rarest term
    const firstTermData = index[sortedTerms[0]];
    let candidates = new Set(Object.keys(firstTermData.postings));
    
    // Progressively intersect with remaining terms
    for (let i = 1; i < sortedTerms.length; i++) {
      // Stop if we've reached target size
      if (candidates.size <= config.candidateTargetSize) {
        break;
      }
      
      const termData = index[sortedTerms[i]];
      candidates = this.intersectWithPostings(candidates, termData.postings);
      
      // If intersection yields zero candidates, we might be too restrictive
      if (candidates.size === 0) {
        break;
      }
    }
    
    // Safety fallback: if progressive intersection produced zero candidates 
    // but union would produce candidates, fall back to union to preserve recall
    if (candidates.size === 0) {
      const unionCandidates = this.getUnionCandidates(validTerms, index);
      if (unionCandidates.size > 0) {
        logger.debug(`Progressive intersection yielded 0 candidates, falling back to union (${unionCandidates.size} candidates)`);
        return unionCandidates;
      }
    }
    
    return candidates;
  }

  /**
   * Helper: Get union of all postings (fallback behavior)
   */
  private static getUnionCandidates(queryTerms: string[], index: InvertedIndex): Set<string> {
    const candidates = new Set<string>();

    for (const term of queryTerms) {
      const termData = index[term];
      if (!termData) continue;

      for (const docIdStr of Object.keys(termData.postings)) {
        candidates.add(docIdStr);
      }
    }

    return candidates;
  }

  /**
   * Helper: Intersect current candidates with postings object directly
   * Avoids creating intermediate Set for postings
   */
  private static intersectWithPostings(
    current: Set<string>,
    postings: { [docId: string]: number }
  ): Set<string> {
    const result = new Set<string>();

    for (const docId of current) {
      if (postings[docId] !== undefined) {
        result.add(docId);
      }
    }

    return result;
  }


  /**
   * Compute IDF cache for query terms (once per query)
   */
  static computeIDFCache(queryTerms: string[], index: InvertedIndex, stats: CorpusStats): Map<string, number> {
    const idfCache = new Map<string, number>();

    for (const term of queryTerms) {
      const termData = index[term];
      if (termData) {
        const idf = this.computeIDF(stats.total_documents, termData.df);
        idfCache.set(term, idf);
      }
    }

    return idfCache;
  }

  /**
   * Score multiple documents for a query
   */
  static scoreDocuments(
    docIds: string[],
    queryTerms: string[],
    index: InvertedIndex,
    stats: CorpusStats,
    idfCache: Map<string, number>
  ): Map<string, number> {
    const scores = new Map<string, number>();

    for (const docId of docIds) {
      const score = this.scoreDocument(docId, queryTerms, idfCache, stats, index);
      if (score > 0) {
        scores.set(docId, score);
      }
    }

    return scores;
  }
}
