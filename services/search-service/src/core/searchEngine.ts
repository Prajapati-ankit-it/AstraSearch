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

export class SearchEngine {
  private indexLoader: IndexLoader;
  private queryCache: QueryCache<SearchResult[]>;

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

    logger.debug(`Original search terms: [${terms.join(', ')}]`);

    // Synonym expansion is query-time only.
    // Index remains untouched.
    // Expansion is non-recursive and capped.
    const expandedTerms = SynonymExpander.expand(terms);
    
    // Get unique terms from expanded set
    const uniqueTerms = [...new Set(expandedTerms)];

    logger.debug(`Expanded search terms: [${expandedTerms.join(', ')}]`);

    // Get index, documents, and corpus stats
    const index = this.indexLoader.getIndex();
    const documents = this.indexLoader.getAllDocuments();
    const corpusStats = this.indexLoader.getCorpusStats();
    const idfCache = BM25Scorer.computeIDFCache(uniqueTerms, index, corpusStats);

    // Get candidate documents with progressive intersection pruning
    const candidateDocs = BM25Scorer.getCandidateDocuments(uniqueTerms, index, corpusStats);
    
    if (candidateDocs.size === 0) {
      logger.debug('No candidate documents found');
      return [];
    }

    logger.debug(`Candidate documents after pruning: ${candidateDocs.size}`);

    // Score documents using BM25 with precomputed IDF
    const docScores = BM25Scorer.scoreDocuments(
      Array.from(candidateDocs),
      uniqueTerms,
      index,
      corpusStats,
      idfCache
    );

    logger.debug(`Scored ${docScores.size} documents with BM25`);

    // Create ranking context
    const rankingContext: RankingContext = {
      corpusStats,
      queryTerms: uniqueTerms,
      query: originalQuery,
      candidateCount: candidateDocs.size
    };

    // Apply ranking signals using optimized batch processing
    const documentsForRanking = new Map<string, { bm25Score: number; document: Document }>();
    
    for (const [docId, bm25Score] of docScores) {
      const document = documents.get(docId);
      if (!document) {
        logger.warn(`Document ${docId} not found in documents map`);
        continue;
      }
      documentsForRanking.set(docId, { 
        bm25Score, 
        document: document 
      });
    }

    const rankedDocuments = Ranker.rankMultiple(documentsForRanking, originalQuery, rankingContext);

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