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
 * Normalization Standard (v1_ascii_nfkc):
 * - NFKC Unicode normalization
 * - Lowercase
 * - Keep only [a-z0-9\s] (English-only normalization v1)
 * - Collapse whitespace
 * 
 * Non-ASCII characters are removed intentionally.
 * Future multilingual support requires normalization v2.
 */

// Precompiled regex patterns for performance
// Explicit ASCII-safe normalization to match Python behavior
const DISALLOWED_CHAR_PATTERN = /[^a-z0-9\s]/g;
const WHITESPACE_PATTERN = /\s+/g;

// Normalization version constant for compatibility checking
export const NORMALIZATION_VERSION = "v1_ascii_nfkc";

export class QueryNormalizer {
  /**
 * Normalization Standard (v1_ascii_nfkc)
 * Must match Python indexing exactly.
 *
 * - NFKC
 * - lowercase
 * - keep only [a-z0-9\s]
 * - collapse whitespace
 *
 * If Python normalizer changes, this must change.
 */
  /**
   * Normalize query text to match indexing behavior exactly
   * 
   * Performs:
   * - Unicode normalization (NFKC)
   * - Lowercasing
   * - Disallowed character handling (replace with space) - explicit ASCII-safe rule
   * - Whitespace normalization
   * 
   * @param query - Raw query string
   * @returns Normalized query string
   */

  static normalize(query: string): string {
    if (!query) {
      return "";
    }

    let normalized: string;
    
    try {
      // Unicode normalization (NFKC) - matches Python indexing
      normalized = query.normalize('NFKC');
    } catch (error) {
      // Continue with original text if NFKC fails
      normalized = query;
    }
    
    // Always apply lowercasing and ASCII filtering
    try {
      // Convert to lowercase
      normalized = normalized.toLowerCase();
      
      // Replace disallowed characters with space (explicit ASCII-safe rule to match Python)
      normalized = normalized.replace(DISALLOWED_CHAR_PATTERN, ' ');
      
      // Collapse multiple spaces and trim edges
      normalized = normalized.replace(WHITESPACE_PATTERN, ' ').trim();
      
      return normalized;
      
    } catch (error) {
      // Fail gracefully - return original input trimmed
      return query.trim();
    }
  }
}
