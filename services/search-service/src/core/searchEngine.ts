import { SearchResult, SearchResponse } from '../types/search.types';
import { IndexLoader } from './indexLoader';
import { Tokenizer } from './tokenizer';
import { Ranking } from './ranking';
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
    logger.info('Search engine initialized');
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

    // Get index and documents
    const index = this.indexLoader.getIndex();
    const documents = this.indexLoader.getAllDocuments();

    // Calculate document scores
    const docScores = new Map<number, number>();

    for (const term of terms) {
      const postings = index[term];
      
      if (!postings) {
        logger.debug(`Term "${term}" not found in index`);
        continue;
      }

      // Add frequency count for each document
      for (const docId of postings) {
        docScores.set(docId, (docScores.get(docId) || 0) + 1);
      }
    }

    logger.debug(`Found ${docScores.size} matching documents`);

    // Rank results
    const rankedResults = Ranking.rankByFrequency(docScores, documents, limit + offset);

    return rankedResults;
  }

  getStats(): any {
    return {
      loaded: this.indexLoader.isLoaded(),
      cacheSize: this.queryCache.size(),
      documents: this.indexLoader.getAllDocuments().size,
      vocabulary: Object.keys(this.indexLoader.getIndex()).length
    };
  }

  clearCache(): void {
    this.queryCache.clear();
  }
}