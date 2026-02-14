/**
 * Evaluation Runner
 * 
 * Treats SearchEngine as a black box client for offline evaluation.
 * No access to internal state, clean separation of concerns.
 */

import { SearchEngine } from '../core/searchEngine';
import { EvaluationQuery, EvaluationResult, EvaluationSummary } from './types';
import { precisionAtK, recallAtK, ndcgAtK } from './Metrics';
import * as fs from 'fs/promises';
import * as path from 'path';

export class EvaluationRunner {
  private searchEngine: SearchEngine;
  private readonly K = 10; // Standard evaluation cutoff

  constructor(searchEngine: SearchEngine) {
    this.searchEngine = searchEngine;
  }

  /**
   * Run complete evaluation on test queries
   */
  async runEvaluation(): Promise<EvaluationSummary> {
    // Load test queries from file
    const queriesPath = path.join(__dirname, '..', '..', 'evaluation', 'test_queries.json');
    const queryData = await fs.readFile(queriesPath, 'utf-8');
    const queries: EvaluationQuery[] = JSON.parse(queryData);

    const results: EvaluationResult[] = [];

    // Evaluate each query
    for (const query of queries) {
      const result = await this.evaluateQuery(query);
      results.push(result);
    }

    // Aggregate metrics
    return this.aggregateResults(results);
  }

  /**
   * Evaluate a single query
   */
  private async evaluateQuery(query: EvaluationQuery): Promise<EvaluationResult> {
    // Call search engine as black box client
    const searchResponse = await this.searchEngine.search(query.query, this.K, 0);
    
    // Extract returned document IDs
    const retrievedIds = searchResponse.results.map(result => result.id);
    const relevantSet = new Set(query.relevantDocIds);

    // Compute metrics
    const precision = precisionAtK(retrievedIds, relevantSet, this.K);
    const recall = recallAtK(retrievedIds, relevantSet, this.K);
    const ndcg = ndcgAtK(retrievedIds, relevantSet, this.K);

    return {
      query: query.query,
      precisionAtK: precision,
      recallAtK: recall,
      ndcgAtK: ndcg
    };
  }

  /**
   * Aggregate individual query results into summary
   */
  private aggregateResults(results: EvaluationResult[]): EvaluationSummary {
    const totalQueries = results.length;
    
    if (totalQueries === 0) {
      return {
        averagePrecisionAtK: 0,
        averageRecallAtK: 0,
        averageNdcgAtK: 0,
        totalQueries: 0
      };
    }

    const sumPrecision = results.reduce((sum, r) => sum + r.precisionAtK, 0);
    const sumRecall = results.reduce((sum, r) => sum + r.recallAtK, 0);
    const sumNdcg = results.reduce((sum, r) => sum + r.ndcgAtK, 0);

    return {
      averagePrecisionAtK: sumPrecision / totalQueries,
      averageRecallAtK: sumRecall / totalQueries,
      averageNdcgAtK: sumNdcg / totalQueries,
      totalQueries
    };
  }

  /**
   * Print structured evaluation summary
   */
  printSummary(summary: EvaluationSummary): void {
    console.log('\n=== Search Engine Evaluation Results ===');
    console.log(`Total Queries: ${summary.totalQueries}`);
    console.log(`Average Precision@${this.K}: ${summary.averagePrecisionAtK.toFixed(3)}`);
    console.log(`Average Recall@${this.K}: ${summary.averageRecallAtK.toFixed(3)}`);
    console.log(`Average NDCG@${this.K}: ${summary.averageNdcgAtK.toFixed(3)}`);
    console.log('=====================================\n');
  }
}
