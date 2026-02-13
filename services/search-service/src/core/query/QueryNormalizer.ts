/**
 * Query Normalization Layer
 * 
 * IMPORTANT:
 * Query normalization MUST stay consistent with indexing normalization.
 * If indexing changes, this must change accordingly.
 * 
 * Indexing pipeline: TextCleaner -> TextNormalizer -> Tokenizer
 * Query pipeline: QueryNormalizer -> Tokenizer
 * 
 * QueryNormalizer matches TextNormalizer behavior exactly (HTML cleaning not needed for queries)
 * 
 * Normalization rule: Keep only a-z, 0-9, and whitespace
 * This ensures identical behavior across Python and Node.js environments
 */

// Precompiled regex patterns for performance
// Explicit ASCII-safe normalization to match Python behavior
const PUNCTUATION_PATTERN = /[^a-z0-9\s]/g;
const WHITESPACE_PATTERN = /\s+/g;

export class QueryNormalizer {
  /**
   * Normalize query text to match indexing behavior exactly
   * 
   * Performs:
   * - Unicode normalization (NFKC)
   * - Lowercasing
   * - Punctuation handling (replace with space) - explicit ASCII-safe rule
   * - Whitespace normalization
   * 
   * @param query - Raw query string
   * @returns Normalized query string
   */

  /**
 * Normalization Standard (v1)
 * Must match Python indexing exactly.
 *
 * - NFKC
 * - lowercase
 * - keep only [a-z0-9\s]
 * - collapse whitespace
 *
 * If Python normalizer changes, this must change.
 */
  static normalize(query: string): string {
    if (!query) {
      return "";
    }

    try {
      // Unicode normalization (NFKC) - matches Python indexing
      let normalized = query.normalize('NFKC');
      
      // Convert to lowercase
      normalized = normalized.toLowerCase();
      
      // Replace punctuation with space (explicit ASCII-safe rule to match Python)
      normalized = normalized.replace(PUNCTUATION_PATTERN, ' ');
      
      // Collapse multiple spaces and trim edges
      normalized = normalized.replace(WHITESPACE_PATTERN, ' ').trim();
      
      return normalized;
      
    } catch (error) {
      // Fail gracefully - return original input trimmed
      return query.trim();
    }
  }
}
