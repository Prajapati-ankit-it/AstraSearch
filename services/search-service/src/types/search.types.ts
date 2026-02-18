export interface Document {
  id: string; // Document ID (e.g., "stackoverflow:92")
  title?: string; // Raw document title
  titleNormalized?: string; // Normalized title using same pipeline as body text
  text: string; // Document content (already normalized during ingestion)
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

export interface FieldIndexes {
  body: InvertedIndex; // Existing index treated as body field
  title?: InvertedIndex; // Optional title index (can be empty for now)
}

export interface CorpusStats {
  total_documents: number;
  avg_doc_length: number; // Legacy: overall average (for backward compatibility)
  document_lengths: { [docId: string]: number }; // Legacy: overall lengths (for backward compatibility)

  // Field-specific statistics for correct BM25 normalization
  body_document_lengths?: { [docId: string]: number };
  title_document_lengths?: { [docId: string]: number };
  avg_body_length?: number;
  avg_title_length?: number;
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