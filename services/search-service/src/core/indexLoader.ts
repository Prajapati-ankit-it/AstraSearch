import * as fs from 'fs/promises';
import * as path from 'path';
import { InvertedIndex, Document } from '../types/search.types';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export class IndexLoader {
  private index: InvertedIndex | null = null;
  private documents: Map<number, Document> = new Map();
  private loaded = false;

  async loadIndex(): Promise<void> {
    try {
      const indexPath = path.resolve(config.indexPath);
      const documentsPath = path.resolve(config.documentsPath);

      logger.info(`Loading index from: ${indexPath}`);
      logger.info(`Loading documents from: ${documentsPath}`);

      // Load inverted index
      const indexData = await fs.readFile(indexPath, 'utf-8');
      this.index = JSON.parse(indexData);

      // Load documents
      const documentsData = await fs.readFile(documentsPath, 'utf-8');
      const documents: Document[] = JSON.parse(documentsData);

      // Create document map for quick lookup
      this.documents = new Map(documents.map(doc => [doc.id, doc]));

      this.loaded = true;

      logger.info(`Index loaded successfully:`);
      logger.info(`- Vocabulary size: ${Object.keys(this.index!).length}`);
      logger.info(`- Documents loaded: ${this.documents.size}`);

    } catch (error) {
      logger.error('Failed to load index:', error);
      throw error;
    }
  }

  getIndex(): InvertedIndex {
    if (!this.loaded || !this.index) {
      throw new Error('Index not loaded. Call loadIndex() first.');
    }
    return this.index;
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
}