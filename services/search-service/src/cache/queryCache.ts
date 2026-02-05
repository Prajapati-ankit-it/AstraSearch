import { CacheEntry } from '../types/search.types';
import { logger } from '../utils/logger';

export class QueryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly defaultTtl: number;

  constructor(defaultTtl: number = 300000) { // 5 minutes default
    this.defaultTtl = defaultTtl;
  }

  set(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl
    };
    
    this.cache.set(key, entry);
    logger.debug(`Cache SET: ${key}`);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      logger.debug(`Cache MISS: ${key}`);
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      logger.debug(`Cache EXPIRED: ${key}`);
      return null;
    }

    logger.debug(`Cache HIT: ${key}`);
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  size(): number {
    return this.cache.size;
  }

  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }
}