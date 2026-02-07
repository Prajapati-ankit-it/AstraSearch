import { SearchResult, SearchResponse } from '../types/search.types';
import { IndexLoader } from './indexLoader';
import { Tokenizer } from './tokenizer';
import { BM25Scorer } from './bm25';
import { QueryCache } from '../cache/queryCache';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export class SearchEngine {
  private indexLoader: IndexLoader;
  private queryCache: QueryCache<SearchResult[]>;

  constructor() {
    this.indexLoader = new IndexLoader();
    this.queryCache = new QueryCache(config.cacheTtl);
  }

  async initialize(): Promise<void> {
    await this.indexLoader.loadIndex();
    logger.info('Search engine initialized with BM25 scoring');
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

    // Convert scores to sorted array
    const sortedResults = Array.from(docScores.entries())
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, limit + offset);

    // Convert to SearchResult format
    const searchResults: SearchResult[] = sortedResults
      .map(([docId, score]) => {
        const doc = documents.get(docId);
        if (!doc) {
          logger.warn(`Document ${docId} not found in documents map`);
          return null;
        }

        return {
          id: doc.answer_id,
          solution: doc.solution,
          score: Math.round(score * 100) / 100 // Round to 2 decimal places
        };
      })
      .filter((result): result is SearchResult => result !== null);

    return searchResults;
  }

  getStats(): any {
    return this.indexLoader.getStats();
  }

  clearCache(): void {
    this.queryCache.clear();
  }
}