export interface Document {
  id: number;
  answer_id: string;
  question_id: string;
  score: number;
  solution: string;
}

export interface InvertedIndex {
  [term: string]: number[];
}

export interface SearchResult {
  id: string;
  solution: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  processingTime: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface SearchQuery {
  q: string;
  limit?: number;
  offset?: number;
}