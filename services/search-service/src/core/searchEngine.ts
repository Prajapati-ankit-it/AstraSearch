import { SearchResult, SearchResponse, Document } from '../types/search.types';
import { IndexLoader } from './indexLoader';
import { Tokenizer } from './tokenizer';
import { BM25Scorer } from './bm25';
import { QueryCache } from '../cache/queryCache';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { Ranker, RankedDocument } from './ranking/Ranker';
import { RankingContext } from './ranking/RankingContext';
import { registerSignals } from './ranking/registerSignals';
import { SignalRegistry } from './ranking/SignalRegistry';
import { QueryNormalizer } from './query/QueryNormalizer';
import { SynonymExpander } from './query/SynonymExpander';
import { QueryIntentAnalyzer } from './query/QueryIntent';
import { PhraseBoostSignal } from './ranking/signals/PhraseBoostSignal';
import { ProximityBoostSignal } from './ranking/signals/ProximityBoostSignal';
import { ExactMatchSignal } from './ranking/signals/ExactMatchSignal';

export class SearchEngine {
  private indexLoader: IndexLoader;
  private queryCache: QueryCache<SearchResult[]>;

  /**
   * FIELD-AWARENESS ARCHITECTURAL DESIGN:
   *
   * SearchEngine implements lightweight field-awareness through ranking-layer signal weighting only.
   * Retrieval (candidate generation) and BM25 scoring operate on body field exclusively by design.
   *
   * This approach:
   * - Avoids complexity of multi-field indexing and retrieval
   * - Maintains performance through single-index operations
   * - Provides semantic importance tuning via title field consideration in ranking
   * - Computes field match metadata per-document in SearchEngine, consumed by Ranker
   *
   * Title matches amplify structural signal weights but do not influence retrieval or base BM25 scoring.
   */

  constructor() {
    this.indexLoader = new IndexLoader();
    this.queryCache = new QueryCache(config.cacheTtl);
  }

  async initialize(): Promise<void> {
    await this.indexLoader.loadIndex();
    // Register ranking signals (framework initialization)
    registerSignals();
    logger.info('Search engine initialized with BM25 scoring and ranking framework');
  }

  async search(query: string, limit: number = 10, offset: number = 0): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      // Normalize query for consistent processing and caching
      const normalizedQuery = QueryNormalizer.normalize(query);

      // Cache key uses normalized query to ensure deterministic retrieval.
      const cacheKey = `${normalizedQuery}:${limit}:${offset}`;
      let results = this.queryCache.get(cacheKey);

      if (!results) {
        // Perform search
        results = await this.performSearch(normalizedQuery, query, limit, offset);

        // Cache results
        this.queryCache.set(cacheKey, results);
      }

      const processingTime = Date.now() - startTime;

      return {
        results: results.slice(offset, offset + limit),
        total: results.length,
        query,
        processingTime
      };

    } catch (error) {
      logger.error('Search error:', error);
      throw error;
    }
  }

  private async performSearch(normalizedQuery: string, originalQuery: string, limit: number, offset: number): Promise<SearchResult[]> {
    if (!normalizedQuery.trim()) {
      return [];
    }

    // Tokenize query
    const terms = Tokenizer.tokenize(normalizedQuery);

    if (terms.length === 0) {
      return [];
    }

    // Compute intent using raw terms (no deduplication)
    const queryIntent = QueryIntentAnalyzer.analyze(
      originalQuery,
      normalizedQuery,
      terms
    );

    // Deduplicate for retrieval and ranking (intent uses raw terms)
    const originalTerms = [...new Set(terms)];

    logger.debug(`Original search terms: [${originalTerms.join(', ')}]`);
    logger.debug(`Query intent: single=${queryIntent.isSingleTerm}, multi=${queryIntent.isMultiTerm}, short=${queryIntent.isVeryShort}, phrase=${queryIntent.isPhraseLike}`);

    // Synonym expansion is query-time only.
    // Index remains untouched.
    // Expansion is non-recursive and capped.
    const retrievalTerms = SynonymExpander.expand(originalTerms);

    // Get index, documents, and corpus stats
    const index = this.indexLoader.getIndex();
    const documents = this.indexLoader.getAllDocuments();
    const corpusStats = this.indexLoader.getCorpusStats();

    // Get unique terms from retrieval terms for BM25 processing
    const uniqueTerms = retrievalTerms;

    // Get candidate documents with union-based soft pruning
    const candidateDocs = BM25Scorer.getCandidateDocuments(uniqueTerms, index);

    if (candidateDocs.size === 0) {
      logger.debug('No candidate documents found');
      return [];
    }

    // Create ranking context with original user terms only
    // Ranking signals operate on original user intent.
    // Synonym-expanded terms are used for retrieval only.
    const rankingContext: RankingContext = {
      corpusStats,
      queryTerms: originalTerms,
      query: originalQuery,
      normalizedQuery: normalizedQuery,
      candidateCount: candidateDocs.size,
      intent: queryIntent
    };
    logger.debug(`Candidate documents after pruning: ${candidateDocs.size}`);

    // Log proximity boost performance guard once per query
    if (candidateDocs.size > config.proximityScanThreshold) {
      logger.debug(`Proximity boost disabled for this query due to candidate threshold: ${candidateDocs.size} > ${config.proximityScanThreshold}`);
    }

    // Log phrase boost performance guard once per query
    if (candidateDocs.size > config.phraseScanThreshold) {
      logger.debug(`Phrase boost disabled for this query due to candidate threshold: ${candidateDocs.size} > ${config.phraseScanThreshold}`);
    }

    // Score documents using BM25
    const docScores = BM25Scorer.scoreDocuments(
      Array.from(candidateDocs),
      uniqueTerms,
      corpusStats,
      index,
      documents
    );

    logger.debug(`Scored ${docScores.size} documents with BM25`);

    // Apply ranking signals using optimized batch processing
    // Create shared query-level context to avoid per-document duplication
    const sharedQueryContext: Omit<RankingContext, 'phraseMatchInTitle' | 'proximityMatchInTitle' | 'exactMatchInTitle'> = {
      corpusStats,
      queryTerms: originalTerms,
      query: originalQuery,
      normalizedQuery: normalizedQuery,
      candidateCount: candidateDocs.size,
      intent: queryIntent
    };

    const documentsForRanking = new Map<string, { bm25Score: number; document: Document; fieldMatches: { phraseMatchInTitle: boolean; proximityMatchInTitle: boolean; exactMatchInTitle: boolean } }>();

    for (const [docId, bm25Score] of docScores) {
      const document = documents.get(docId);
      if (!document) {
        logger.warn(`Document ${docId} not found in documents map`);
        continue;
      }

      // Compute field-aware metadata for this document using signal detection logic
      // FIELD-AWARE STRUCTURAL BOOST SEMANTICS:
      // - Detects whether structural patterns also appear in title
      // - Signals themselves operate on body field only (doc.text)
      // - Title matches amplify signal weight but do not independently generate signal scores
      // - Title-only matches do NOT get amplified (only body matches get signals)
      // - This provides structural reinforcement when body + title alignment occurs
      const title = document.titleNormalized || '';
      const phraseMatchInTitle = new PhraseBoostSignal().wouldTriggerOnText(title, sharedQueryContext);
      const proximityMatchInTitle = new ProximityBoostSignal().wouldTriggerOnText(title, sharedQueryContext);
      const exactMatchInTitle = new ExactMatchSignal().wouldTriggerOnText(title, sharedQueryContext);

      documentsForRanking.set(docId, {
        bm25Score,
        document: document,
        fieldMatches: {
          phraseMatchInTitle,
          proximityMatchInTitle,
          exactMatchInTitle
        }
      });
    }

    const rankedDocuments = Ranker.rankMultipleWithSharedContext(documentsForRanking, sharedQueryContext, originalQuery);

    // Sort by final score
    const sortedResults = rankedDocuments
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit + offset);

    // Log ranking completion (once per query)
    logger.debug(
      `Ranking applied | signals=${SignalRegistry.getInstance().getActiveSignals().length}`
    );

    // Convert to SearchResult format
    const searchResults: SearchResult[] = sortedResults
      .map(ranked => ({
        id: ranked.document.id,
        solution: ranked.document.text,
        score: Math.round(ranked.finalScore * 100) / 100 // Round to 2 decimal places
      }));

    return searchResults;
  }

  getStats(): any {
    return this.indexLoader.getStats();
  }

  clearCache(): void {
    this.queryCache.clear();
  }
}