/**
 * Query Intent Detection
 * 
 * Structural analysis of user query patterns.
 * No behavioral changes - pure metadata extraction.
 */

export interface QueryIntent {
  readonly termCount: number;
  
  // Semantic abstraction for ranking signals and future intent extensions.
  // Both fields exist despite being derivable from termCount to provide:
  // - Clear intent semantics for ranking signal developers
  // - Future extensibility for intent-based routing
  // - Readable intent patterns without boolean logic
  readonly isSingleTerm: boolean;
  readonly isMultiTerm: boolean;
  
  readonly isVeryShort: boolean;
  readonly isPhraseLike: boolean;
}

/**
 * Analyzes query structure to detect basic intent patterns.
 * This is preparation for future intent-based features.
 * 
 * Rules:
 * - No NLP or complex heuristics
 * - Pure structural analysis
 * - No behavioral changes
 */
export class QueryIntentAnalyzer {
  static analyze(
    originalQuery: string,
    normalizedQuery: string,
    tokens: string[]
  ): QueryIntent {
    const termCount = tokens.length;

    const isSingleTerm = termCount === 1;
    const isMultiTerm = termCount > 1;

    // Character-length heuristic is intentionally used.
    // Multi-term queries like "a b" may be flagged as very short.
    // This is structural metadata, not semantic classification.
    const isVeryShort =
      normalizedQuery.length <= 3 || (termCount === 1 && tokens[0].length <= 2);

    // Intentionally a loose heuristic.
    // Any occurrence of a double quote marks query as phrase-like.
    // No balanced quote parsing is performed.
    // This layer avoids complex parsing by design.
    const isPhraseLike = originalQuery.includes('"');


    return {
      termCount,
      isSingleTerm,
      isMultiTerm,
      isVeryShort,
      isPhraseLike
    };
  }
}
