/**
 * Evaluation Entry Point
 * 
 * Runs offline evaluation of search engine performance.
 * Treats SearchEngine as black box client.
 */

import { SearchEngine } from '../core/searchEngine';
import { EvaluationRunner } from './EvaluationRunner';

async function main(): Promise<void> {
  // Initialize search engine
  const searchEngine = new SearchEngine();
  await searchEngine.initialize();

  // Run evaluation
  const evaluator = new EvaluationRunner(searchEngine);
  const summary = await evaluator.runEvaluation();

  // Print results
  evaluator.printSummary(summary);
}

// Run evaluation if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
