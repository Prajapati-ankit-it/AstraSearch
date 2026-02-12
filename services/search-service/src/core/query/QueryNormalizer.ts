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
 * QueryNormalizer matches TextNormalizer behavior (HTML cleaning not needed for queries)
 */

// Precompiled regex patterns for performance
const PUNCTUATION_PATTERN = /[^\w\s_]/gu;
const WHITESPACE_PATTERN = /\s+/gu;

export class QueryNormalizer {
  /**
   * Normalize query text to match indexing behavior
   * 
   * Performs:
   * - Unicode normalization (NFKC)
   * - Lowercasing
   * - Punctuation handling (replace with space)
   * - Whitespace normalization
   * 
   * @param query - Raw query string
   * @returns Normalized query string
   */
  static normalize(query: string): string {
    if (!query) {
      return "";
    }

    try {
      // Unicode normalization (NFKC)
      let normalized = query.normalize('NFKC');
      
      // Convert to lowercase
      normalized = normalized.toLowerCase();
      
      // Replace punctuation with space (matches TextNormalizer behavior)
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
