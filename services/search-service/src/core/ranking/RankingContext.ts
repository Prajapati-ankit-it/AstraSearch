import { CorpusStats } from '../../types/search.types';
import { QueryIntent } from '../query/QueryIntent';

/**
 * RankingContext provides structured metadata for ranking signals.
 * 
 * NORMALIZATION CONTRACT:
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
 * doc.text (from SearchDocument):
 *   Canonical normalized ingestion text.
 *   Ingestion applies: NFKC Unicode normalization → lowercase → ASCII filtering → whitespace normalization.
 *   Ranking signals must never re-normalize document text.
 * 
 * SYMMETRY REQUIREMENT:
 * Ranking signals must use pre-normalized content without re-normalization.
 * Normalization exists in exactly one place: ingestion pipeline + QueryNormalizer.
 * 
 * CONTRACT & SEMANTICS:
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
 * 
 * FIELD-AWARE SIGNAL TUNING:
 * 
 * Field-based match metadata is computed once per document in SearchEngine and consumed during ranking weight adjustment.
 * This enables ranking-layer field awareness without modifying signal internals.
 * Structural signals (phrase, proximity, exact match) receive weight amplification
 * when matches occur in the title field versus body field.
 * 
 * phraseMatchInTitle, proximityMatchInTitle, exactMatchInTitle:
 *   Boolean flags indicating whether the query triggers these structural signals
 *   in this document's title field. Computed by checking if title text contains query patterns
 *   that would activate these signals. Used for field-aware weight adjustment in Ranker.
 */
export interface RankingContext {
  readonly corpusStats: CorpusStats;
  readonly queryTerms: string[];
  readonly query: string;
  readonly normalizedQuery: string;
  readonly candidateCount: number;
  readonly intent: QueryIntent;

  // Field-aware signal tuning metadata
  readonly phraseMatchInTitle?: boolean;
  readonly proximityMatchInTitle?: boolean;
  readonly exactMatchInTitle?: boolean;
}
