/**
 * Evaluation Types
 * 
 * Defines interfaces for offline evaluation of search engine performance.
 * Evaluation treats SearchEngine as a black box client.
 */

export interface EvaluationQuery {
  query: string;
  relevantDocIds: string[];
}

export interface EvaluationResult {
  query: string;
  precisionAtK: number;
  recallAtK: number;
  ndcgAtK: number;
}

export interface EvaluationSummary {
  averagePrecisionAtK: number;
  averageRecallAtK: number;
  averageNdcgAtK: number;
  totalQueries: number;
}
