import * as fs from 'fs/promises';
import * as path from 'path';
import { InvertedIndex, Document, CorpusStats } from '../types/search.types';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export class IndexLoader {
  private index: InvertedIndex | null = null;
  private documents: Map<number, Document> = new Map();
  private corpusStats: CorpusStats | null = null;
  private loaded = false;

  async loadIndex(): Promise<void> {
    try {
      const indexPath = path.resolve(config.indexPath);
      const documentsPath = path.resolve(config.documentsPath);
      const statsPath = path.resolve(config.statsPath);

      logger.info(`Loading index from: ${indexPath}`);
      logger.info(`Loading documents from: ${documentsPath}`);
      logger.info(`Loading stats from: ${statsPath}`);

      // Load inverted index
      const indexData = await fs.readFile(indexPath, 'utf-8');
      this.index = JSON.parse(indexData);

      // Load corpus statistics
      const statsData = await fs.readFile(statsPath, 'utf-8');
      this.corpusStats = JSON.parse(statsData);

      // Validate corpus statistics
      this.validateCorpusStats();

      // Load documents
      const documentsData = await fs.readFile(documentsPath, 'utf-8');
      const documents: Document[] = JSON.parse(documentsData);

      // Create document map for quick lookup
      this.documents = new Map(documents.map(doc => [doc.id, doc]));

      this.loaded = true;

      logger.info(`Index loaded successfully:`);
      logger.info(`- Vocabulary size: ${Object.keys(this.index!).length}`);
      logger.info(`- Documents loaded: ${this.documents.size}`);
      logger.info(`- Total documents in corpus: ${this.corpusStats!.total_documents}`);
      logger.info(`- Average document length: ${this.corpusStats!.avg_doc_length.toFixed(2)}`);

    } catch (error) {
      logger.error('Failed to load index:', error);
      throw error;
    }
  }

  private validateCorpusStats(): void {
    if (!this.corpusStats) {
      throw new Error('Corpus stats not loaded');
    }

    if (this.corpusStats.total_documents <= 0) {
      throw new Error(`Invalid total_documents: ${this.corpusStats.total_documents}. Must be > 0.`);
    }

    if (this.corpusStats.avg_doc_length <= 0) {
      throw new Error(`Invalid avg_doc_length: ${this.corpusStats.avg_doc_length}. Must be > 0.`);
    }

    if (!this.corpusStats.document_lengths || Object.keys(this.corpusStats.document_lengths).length === 0) {
      throw new Error('Document lengths not found in corpus stats');
    }

    logger.info('Corpus statistics validation passed');
  }

  getIndex(): InvertedIndex {
    if (!this.loaded || !this.index) {
      throw new Error('Index not loaded. Call loadIndex() first.');
    }
    return this.index;
  }

  getCorpusStats(): CorpusStats {
    if (!this.loaded || !this.corpusStats) {
      throw new Error('Corpus stats not loaded. Call loadIndex() first.');
    }
    return this.corpusStats;
  }

  getDocument(id: number): Document | undefined {
    if (!this.loaded) {
      throw new Error('Index not loaded. Call loadIndex() first.');
    }
    return this.documents.get(id);
  }

  getAllDocuments(): Map<number, Document> {
    if (!this.loaded) {
      throw new Error('Index not loaded. Call loadIndex() first.');
    }
    return this.documents;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getStats() {
    if (!this.loaded) {
      throw new Error('Index not loaded. Call loadIndex() first.');
    }
    
    return {
      vocabularySize: Object.keys(this.index!).length,
      documentsLoaded: this.documents.size,
      totalDocuments: this.corpusStats!.total_documents,
      avgDocLength: this.corpusStats!.avg_doc_length
    };
  }
}