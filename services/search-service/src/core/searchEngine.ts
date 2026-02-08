import { SearchResult, SearchResponse } from '../types/search.types';
import { IndexLoader } from './indexLoader';
import { Tokenizer } from './tokenizer';
import { BM25Scorer } from './bm25';
import { QueryCache } from '../cache/queryCache';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { Ranker, RankedDocument } from './ranking/Ranker';
import { RankingContext } from './ranking/RankingContext';
import { SearchDocument } from './ranking/RankingSignal';
import { registerSignals } from './ranking/registerSignals';
import { SignalRegistry } from './ranking/SignalRegistry';

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
      // Check cache first
      const cacheKey = `${query}:${limit}:${offset}`;
      let results = this.queryCache.get(cacheKey);

      if (!results) {
        // Perform search
        results = await this.performSearch(query, limit, offset);
        
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

  private async performSearch(query: string, limit: number, offset: number): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    // Tokenize query
    const terms = Tokenizer.tokenize(query);
    
    if (terms.length === 0) {
      return [];
    }

    logger.debug(`Search terms: [${terms.join(', ')}]`);

    // Get index, documents, and corpus stats
    const index = this.indexLoader.getIndex();
    const documents = this.indexLoader.getAllDocuments();
    const corpusStats = this.indexLoader.getCorpusStats();

    // Get unique terms
    const uniqueTerms = [...new Set(terms)];

    // Compute IDF cache once per query
    const idfCache = BM25Scorer.computeIDFCache(uniqueTerms, index, corpusStats);

    // Get candidate documents (union of all postings)
    const candidateDocs = BM25Scorer.getCandidateDocuments(uniqueTerms, index);
    
    if (candidateDocs.size === 0) {
      logger.debug('No candidate documents found');
      return [];
    }

    logger.debug(`Found ${candidateDocs.size} candidate documents`);

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
      query,
      candidateCount: candidateDocs.size
    };

    // Apply ranking signals using optimized batch processing
    const documentsForRanking = new Map<number, { bm25Score: number; document: SearchDocument }>();
    
    for (const [docId, bm25Score] of docScores) {
      const document = documents.get(docId);
      if (!document) {
        logger.warn(`Document ${docId} not found in documents map`);
        continue;
      }
      documentsForRanking.set(docId, { 
        bm25Score, 
        document: document as SearchDocument 
      });
    }

    const rankedDocuments = Ranker.rankMultiple(documentsForRanking, query, rankingContext);

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
        id: ranked.document.answer_id,
        solution: ranked.document.solution,
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