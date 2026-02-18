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
   * Get candidate documents for a query using OR-based soft pruning
   * 
   * OR SEMANTICS PRESERVATION:
   * - Strict intersection was removed to maintain OR retrieval semantics
   * - Query semantics remain OR: documents matching ANY query term are candidates
   * - Synonym expansion compatibility maintained: expanded terms participate in OR union
   * - No silent semantic changes from OR to AND behavior
   * 
   * SOFT PRUNING STRATEGY:
   * - Union-based retrieval: Start with all documents matching any query term
   * - Coverage threshold filtering: Keep docs matching ≥ half of query terms
   * - Soft coverage threshold is safer than strict intersection, preserves recall
   * - Final truncation by match count if still over target size
   * - Safety fallback to union if pruning eliminates too many candidates
   * 
   * RANKING LAYER UNTOUCHED:
   * - This method only reduces the candidate set passed to ranking
   * - Scoring formulas, signal logic, and weight modulation remain unchanged
   * - Ranking receives a smaller but high-quality candidate set with OR semantics preserved
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
    
    // 1️⃣ Restore union-based retrieval
    const unionCandidates = this.getUnionCandidates(validTerms, index);
    
    // 2️⃣ If union size is within target, return as-is
    if (unionCandidates.size <= config.candidateTargetSize) {
      return unionCandidates;
    }
    
    // 3️⃣ Apply soft pruning: keep docs matching ≥ half of query terms
    const coverageThreshold = Math.ceil(validTerms.length / 2);
    const prunedCandidates = new Map<string, number>(); // docId -> matchCount
    
    for (const docId of unionCandidates) {
      let matchCount = 0;
      
      // Count how many distinct query terms this document matches
      for (const term of validTerms) {
        const termData = index[term];
        if (termData && termData.postings[docId] !== undefined) {
          matchCount++;
        }
      }
      
      // Keep docs meeting coverage threshold
      if (matchCount >= coverageThreshold) {
        prunedCandidates.set(docId, matchCount);
      }
    }
    
    // 4️⃣ If still over target size, sort by match count and truncate
    if (prunedCandidates.size > config.candidateTargetSize) {
      const sortedCandidates = Array.from(prunedCandidates.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by match count descending
        .slice(0, config.candidateTargetSize); // Truncate to target size
      
      return new Set(sortedCandidates.map(([docId]) => docId));
    }
    
    // 5️⃣ Safety fallback: if pruning eliminated too many and results empty
    if (prunedCandidates.size === 0) {
      logger.debug(`Soft pruning eliminated all candidates, falling back to union (${unionCandidates.size} candidates)`);
      return unionCandidates;
    }
    
    return new Set(prunedCandidates.keys());
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
