export interface Document {
  id: number; // Internal sequential ID (for indexing)
  answer_id: string; // Original StackOverflow answer ID
  question_id: string; // Original StackOverflow answer ID
  score: number; // Original StackOverflow answer ID
  solution: string; // Cleaned answer content
}

export interface InvertedIndex {
  [term: string]: number[];
}

export interface SearchResult {
  id: string;// Returns answer_id (string) for API consistency
  solution: string;// Cleaned answer content
  score: number;// Normalized relevance score
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