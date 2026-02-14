/**
 * Query Intent Detection
 * 
 * Structural analysis of user query patterns.
 * No behavioral changes - pure metadata extraction.
 */

export interface QueryIntent {
  readonly termCount: number;
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

    const isVeryShort =
      normalizedQuery.length <= 3 || (termCount === 1 && tokens[0].length <= 2);

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
