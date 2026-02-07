export interface Document {
  id: number; // Internal sequential ID (for indexing)
  answer_id: string; // Original StackOverflow answer ID
  question_id: string; // Original StackOverflow question ID
  score: number; // Original StackOverflow answer score
  solution: string; // Cleaned answer content
}

export interface TermPostings {
  df: number; // Document frequency
  postings: { [docId: string]: number }; // docId -> term frequency
}

export interface InvertedIndex {
  [term: string]: TermPostings;
}

export interface CorpusStats {
  total_documents: number;
  avg_doc_length: number;
  document_lengths: { [docId: string]: number };
}

export interface SearchResult {
  id: string; // Returns answer_id (string) for API consistency
  solution: string; // Cleaned answer content
  score: number; // BM25 relevance score
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