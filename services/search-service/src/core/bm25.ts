import { InvertedIndex, CorpusStats, FieldIndexes, Document } from '../types/search.types';
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
   * Score multiple documents for a query using field-aware BM25
   *
   * FIELD-AWARE SCORING:
   * - Computes separate BM25 scores for title and body fields
   * - Combines scores: score = (titleWeight * titleBM25) + (bodyWeight * bodyBM25)
   * - Falls back to body-only scoring if title field absent or title index empty
   * - Title weighting improves ranking precision for title-relevant queries
   * - Retrieval now includes both body and title postings; recall preserved for title-only matches
   * - Pruning layer remains untouched: field-aware scoring is post-retrieval
   * - Field-specific length normalization is used when available
   *
   * BACKWARD COMPATIBILITY:
   * - If title index is undefined or empty, uses body-only scoring
   * - IDF computation per field ensures correctness and no double-counting
   * - RankingContext and signals unchanged: only BM25 base score modified
   */
  /**
   * Get candidate documents for a query using union-based soft pruning
   *
   * RETRIEVAL SEMANTICS:
   * - Step 1: OR-union candidate generation preserves documents matching ANY query term
   * - Step 2: If union size <= config.candidateTargetSize → return union (no pruning)
   * - Step 3: Apply soft-AND coverage filtering when union size exceeds threshold
   * - Step 4: Optional truncation by match count if still too large
   * - Synonym expansion compatibility maintained: expanded terms participate in OR union
   * - No silent semantic changes from OR to AND behavior
   * - Field-aware retrieval includes both body and title postings to preserve recall for title-only matches
   *
   * RECALL AND PERFORMANCE TRADEOFFS:
   * - Recall is reduced when union candidate count exceeds candidateTargetSize
   * - This is an explicit performance tradeoff to cap ranking cost
   * - Fallback to unionCandidates when coverage filtering produces zero results
   *   is an intentional recall safety guard
   *
   * SOFT PRUNING STRATEGY:
   * - Coverage threshold scales with query length: ceil(validTerms.length / 2)
   * - 1-term → threshold = 1, 2-term → threshold = 1, 3-term → threshold = 2, etc.
   * - Coverage filtering primarily affects queries with 3+ terms
   * - Becomes stricter as query length increases
   *
   * RANKING LAYER UNTOUCHED:
   * - This method only reduces the candidate set passed to ranking
   * - Scoring formulas, signal logic, and weight modulation remain unchanged
   * - Ranking receives a smaller but high-quality candidate set
   */
  static getCandidateDocuments(
    queryTerms: string[],
    fieldIndexes: FieldIndexes
  ): Set<string> {
    // validTerms avoids repeated index lookups and is reused in coverage calculation
    const validTerms = queryTerms.filter(term => fieldIndexes.body[term] !== undefined || (fieldIndexes.title && fieldIndexes.title[term] !== undefined));
    
    if (validTerms.length === 0) {
      return new Set<string>();
    }
    
    // Step 1: Compute unionCandidates via existing union method
    const unionCandidates = this.getUnionCandidates(validTerms, fieldIndexes);
    
    // Step 2: If unionCandidates.size <= config.candidateTargetSize: return unionCandidates
    if (unionCandidates.size <= config.candidateTargetSize) {
      return unionCandidates;
    }
    
    // Step 3: Apply soft pruning: keep docs matching >= Math.ceil(validTerms.length / 2)
    // Coverage threshold scales with query length: ceil(validTerms.length / 2)
    // 1-term → threshold = 1, 2-term → threshold = 1, 3-term → threshold = 2, 4-term → threshold = 2, 5-term → threshold = 3
    // Coverage filtering primarily affects queries with 3+ terms and becomes stricter as query length increases
    const coverageThreshold = Math.ceil(validTerms.length / 2);
    const docMatchCounts = new Map<string, number>(); // docId -> matchCount (accumulates counts for all union docs)
    
    // Postings-first accumulation: O(totalPostingsOfQueryTerms) instead of O(|union| * |terms|)
    for (const term of validTerms) {
      // Check both body and title indexes for this term
      const bodyTermData = fieldIndexes.body[term];
      const titleTermData = fieldIndexes.title?.[term];
      
      // Get postings from both fields - optimize Set allocation
      if (bodyTermData && titleTermData) {
        // Both fields exist - need to merge postings
        const allPostings = new Set<string>();
        
        for (const docId of Object.keys(bodyTermData.postings)) {
          allPostings.add(docId);
        }
        
        for (const docId of Object.keys(titleTermData.postings)) {
          allPostings.add(docId);
        }
        
        for (const docId of allPostings) {
          if (unionCandidates.has(docId)) {
            const currentCount = docMatchCounts.get(docId) || 0;
            docMatchCounts.set(docId, currentCount + 1);
          }
        }
      } else if (bodyTermData) {
        // Only body postings - iterate directly
        for (const docId of Object.keys(bodyTermData.postings)) {
          if (unionCandidates.has(docId)) {
            const currentCount = docMatchCounts.get(docId) || 0;
            docMatchCounts.set(docId, currentCount + 1);
          }
        }
      } else if (titleTermData) {
        // Only title postings - iterate directly
        for (const docId of Object.keys(titleTermData.postings)) {
          if (unionCandidates.has(docId)) {
            const currentCount = docMatchCounts.get(docId) || 0;
            docMatchCounts.set(docId, currentCount + 1);
          }
        }
      }
    }
    
    // Filter to documents meeting coverage threshold
    const coverageFiltered = new Map<string, number>();
    for (const [docId, matchCount] of docMatchCounts) {
      if (matchCount >= coverageThreshold) {
        coverageFiltered.set(docId, matchCount);
      }
    }
    
    // Add debug logging when pruning triggers
    logger.debug(
      `Candidate pruning: union=${unionCandidates.size}, threshold=${coverageThreshold}, afterCoverage=${coverageFiltered.size}`
    );
    
    // Step 4: If still > candidateTargetSize: Sort by matchCount descending. Truncate to candidateTargetSize
    if (coverageFiltered.size > config.candidateTargetSize) {
      const sortedCandidates = Array.from(coverageFiltered.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by match count descending
        .slice(0, config.candidateTargetSize); // Truncate to candidateTargetSize
      
      // Truncation intentionally reduces recall to cap ranking cost.
      // This is a controlled performance safeguard.
      logger.debug(`Candidate truncation: afterTruncation=${sortedCandidates.length}`);
      
      return new Set(sortedCandidates.map(([docId]) => docId));
    }
    
    // Step 5: If pruning yields empty set: return unionCandidates
    // This fallback preserves recall when coverage threshold is too strict
    // for the given query. It is an intentional safety mechanism.
    if (coverageFiltered.size === 0) {
      return unionCandidates;
    }
    
    return new Set(coverageFiltered.keys());
  }

  /**
   * Helper: Get union of all postings from body and title indexes (fallback behavior)
   */
  private static getUnionCandidates(queryTerms: string[], fieldIndexes: FieldIndexes): Set<string> {
    const candidates = new Set<string>();

    for (const term of queryTerms) {
      // Check both body and title indexes for this term
      const bodyTermData = fieldIndexes.body[term];
      const titleTermData = fieldIndexes.title?.[term];

      if (bodyTermData) {
        for (const docIdStr of Object.keys(bodyTermData.postings)) {
          candidates.add(docIdStr);
        }
      }

      if (titleTermData) {
        for (const docIdStr of Object.keys(titleTermData.postings)) {
          candidates.add(docIdStr);
        }
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
   * Compute IDF cache for query terms in a specific field
   */
  private static computeFieldIdfCache(queryTerms: string[], index: InvertedIndex, stats: CorpusStats): Map<string, number> {
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
   * Compute BM25 score for a document in a specific field
   */
  private static computeFieldScore(
    docId: string,
    queryTerms: string[],
    index: InvertedIndex,
    idfCache: Map<string, number>,
    stats: CorpusStats,
    document: Document,
    isTitleField: boolean = false
  ): number {
    let totalScore = 0;

    // Field-aware BM25 uses field-specific length normalization
    let docLength: number;
    let avgDocLength: number;

    if (isTitleField) {
      // Use title-specific lengths when available, fallback to body length approximation
      if (stats.title_document_lengths && stats.title_document_lengths[docId] !== undefined) {
        docLength = stats.title_document_lengths[docId];
        avgDocLength = stats.avg_title_length || stats.avg_doc_length;
      } else {
        // Fallback to body length with explicit note that this is an approximation
        docLength = stats.body_document_lengths?.[docId] || stats.document_lengths[docId];
        avgDocLength = stats.avg_body_length || stats.avg_doc_length;
      }
    } else {
      // Body field uses body-specific lengths
      docLength = stats.body_document_lengths?.[docId] || stats.document_lengths[docId];
      avgDocLength = stats.avg_body_length || stats.avg_doc_length;
    }

    if (!Number.isFinite(docLength)) {
      return 0;
    }

    for (const term of queryTerms) {
      const termData = index[term];
      if (!termData) {
        continue; // Term not in this field's index
      }

      const tf = termData.postings[docId];
      if (!tf) {
        continue; // Term not in this document for this field
      }

      const idf = idfCache.get(term);
      if (idf === undefined) {
        continue; // Term not in IDF cache for this field
      }

      const bm25Component = this.computeBM25Component(tf, docLength, avgDocLength);
      totalScore += idf * bm25Component;
    }

    return totalScore;
  }

  /**
   * Score multiple documents for a query using field-aware BM25
   *
   * FIELD-AWARE SCORING:
   * - Computes separate BM25 scores for title and body fields
   * - Combines scores: score = (titleWeight * titleBM25) + (bodyWeight * bodyBM25)
   * - Falls back to body-only scoring if title field absent or title index empty
   * - Title weighting improves ranking precision for title-relevant queries
   * - Retrieval now includes both body and title postings; recall preserved for title-only matches
   * - Pruning layer remains untouched: field-aware scoring is post-retrieval
   * - Field-specific length normalization is used when available
   *
   * BACKWARD COMPATIBILITY:
   * - If title index is undefined or empty, uses body-only scoring
   * - IDF computation per field ensures correctness and no double-counting
   * - RankingContext and signals unchanged: only BM25 base score modified
   */
  static scoreDocuments(
    docIds: string[],
    queryTerms: string[],
    fieldIndexes: FieldIndexes,
    stats: CorpusStats,
    documents: Map<string, Document>
  ): Map<string, number> {
    const scores = new Map<string, number>();
    
    // Defensive configuration validation
    let titleWeight = config.titleWeight;
    let bodyWeight = config.bodyWeight;
    
    // Validate weights: default to 2.0 and 1.0 if invalid, clamp between 0.1 and 10.0
    if (!Number.isFinite(titleWeight) || titleWeight <= 0) {
      logger.warn(`Invalid titleWeight: ${titleWeight}, defaulting to 2.0`);
      titleWeight = 2.0;
    }
    if (!Number.isFinite(bodyWeight) || bodyWeight <= 0) {
      logger.warn(`Invalid bodyWeight: ${bodyWeight}, defaulting to 1.0`);
      bodyWeight = 1.0;
    }
    
    // Clamp weights to reasonable range
    titleWeight = Math.max(0.1, Math.min(10.0, titleWeight));
    bodyWeight = Math.max(0.1, Math.min(10.0, bodyWeight));
    
    // Debug logging (once per query)
    if (fieldIndexes.title && Object.keys(fieldIndexes.title).length > 0) {
      logger.debug(`Field-aware BM25 active: titleWeight=${titleWeight}, bodyWeight=${bodyWeight}`);
    }

    // Compute IDF caches for each field
    const bodyIdfCache = this.computeFieldIdfCache(queryTerms, fieldIndexes.body, stats);
    const titleIdfCache = fieldIndexes.title 
      ? this.computeFieldIdfCache(queryTerms, fieldIndexes.title, stats)
      : new Map<string, number>();

    for (const docId of docIds) {
      const document = documents.get(docId);
      if (!document) {
        logger.warn(`Document ${docId} not found in documents map`);
        continue;
      }

      // Compute body BM25 score (always available)
      const bodyScore = this.computeFieldScore(docId, queryTerms, fieldIndexes.body, bodyIdfCache, stats, document, false);

      // Compute title BM25 score (if title field available)
      let titleScore = 0;
      if (document.title && fieldIndexes.title && titleIdfCache.size > 0) {
        titleScore = this.computeFieldScore(docId, queryTerms, fieldIndexes.title, titleIdfCache, stats, document, true);
      }

      // Combine field scores with weights
      const finalScore = (titleWeight * titleScore) + (bodyWeight * bodyScore);
      
      if (finalScore > 0) {
        scores.set(docId, finalScore);
      }
    }

    return scores;
  }
}
