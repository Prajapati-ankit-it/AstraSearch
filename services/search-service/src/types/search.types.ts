export interface Document {
  id: string; // Document ID (e.g., "stackoverflow:92")
  text: string; // Document content
  metadata: {
    source: string;
    question_id?: string;
    created_at?: string;
    user_login?: string;
  };
  signals: {
    popularity: number;
  };
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
  id: string; // Returns canonical document id
  solution: string; // Document text content
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