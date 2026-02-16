import { CorpusStats } from '../../types/search.types';
import { QueryIntent } from '../query/QueryIntent';

/**
 * RankingContext provides structured metadata for ranking signals.
 * 
 * CONTRACT & SEMANTICS:
 * 
 * query:
 *   Raw user input as received by the search endpoint.
 *   Used for display purposes and signal-level processing that needs original user intent.
 * 
 * normalizedQuery:
 *   Canonical normalized form of the query (lowercased, punctuation removed, whitespace normalized).
 *   Used for deterministic matching with indexed documents and phrase-based signals.
 *   Ensures symmetry between indexing and retrieval normalization.
 * 
 * queryTerms:
 *   Deduplicated tokens derived from normalizedQuery after tokenization.
 *   Used by signals that operate on individual terms rather than full phrases.
 *   May have stopwords removed depending on tokenizer configuration.
 * 
 * intent:
 *   Structural query metadata (single-term, multi-term, very short, phrase-like).
 *   Enables signals to apply conditional logic based on query characteristics.
 *   Computed from raw query before normalization and tokenization.
 * 
 * corpusStats:
 *   Global corpus statistics for normalization and scoring calculations.
 *   Provides document count, average length, and other corpus-level metrics.
 * 
 * candidateCount:
 *   Number of documents being scored for this query.
 *   Used by performance guards and adaptive algorithms.
 */
export interface RankingContext {
  readonly corpusStats: CorpusStats;
  readonly queryTerms: string[];
  readonly query: string;
  readonly normalizedQuery: string;
  readonly candidateCount: number;
  readonly intent: QueryIntent;
}
