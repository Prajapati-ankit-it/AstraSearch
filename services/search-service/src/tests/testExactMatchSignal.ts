import { ExactMatchSignal } from '../core/ranking/signals/ExactMatchSignal';
import { RankingContext } from '../core/ranking/RankingContext';
import { SearchDocument } from '../core/ranking/RankingSignal';

// Test suite for ExactMatchSignal
const signal = new ExactMatchSignal();

function createMockDocument(text: string): SearchDocument {
  return {
    id: 'test-doc',
    text: text,
    metadata: { source: 'test' },
    signals: { popularity: 0 }
  };
}

function createMockContext(queryTerms: string[], normalizedQuery: string): RankingContext {
  return {
    corpusStats: {
      total_documents: 10000,
      avg_doc_length: 50,
      document_lengths: {}
    },
    queryTerms: queryTerms,
    query: queryTerms.join(' '),
    normalizedQuery: normalizedQuery,
    candidateCount: 100,
    intent: {
      termCount: queryTerms.length,
      isSingleTerm: queryTerms.length === 1,
      isMultiTerm: queryTerms.length > 1,
      isVeryShort: queryTerms.join(' ').length < 5,
      isPhraseLike: false
    }
  };
}

console.log('=== ExactMatchSignal Test Suite ===\n');

// Test 1: Exact match should return 1
console.log('Test 1: Exact match');
const exactDoc = createMockDocument('python tutorial');
const exactScore = signal.score(exactDoc, 'python tutorial', createMockContext(['python', 'tutorial'], 'python tutorial'));
console.log(`Document: "python tutorial"`);
console.log(`Query: "python tutorial"`);
console.log(`Score: ${exactScore} (expected: 1)`);
console.log(`✓ ${exactScore === 1 ? 'PASS' : 'FAIL'}\n`);

// Test 2: Non-exact match should return 0
console.log('Test 2: Non-exact match');
const nonExactDoc = createMockDocument('python tutorial guide');
const nonExactScore = signal.score(nonExactDoc, 'python tutorial', createMockContext(['python', 'tutorial'], 'python tutorial'));
console.log(`Document: "python tutorial guide"`);
console.log(`Query: "python tutorial"`);
console.log(`Score: ${nonExactScore} (expected: 0)`);
console.log(`✓ ${nonExactScore === 0 ? 'PASS' : 'FAIL'}\n`);

// Test 3: Case sensitivity test (should be 0 since normalization handles case)
console.log('Test 3: Case sensitivity');
const caseDoc = createMockDocument('Python Tutorial');
const caseScore = signal.score(caseDoc, 'python tutorial', createMockContext(['python', 'tutorial'], 'python tutorial'));
console.log(`Document: "Python Tutorial"`);
console.log(`Query: "python tutorial" (normalized)`);
console.log(`Score: ${caseScore} (expected: 0 - different case)`);
console.log(`✓ ${caseScore === 0 ? 'PASS' : 'FAIL'}\n`);

// Test 4: Empty document should return 0
console.log('Test 4: Empty document');
const emptyDoc = createMockDocument('');
const emptyScore = signal.score(emptyDoc, 'python tutorial', createMockContext(['python', 'tutorial'], 'python tutorial'));
console.log(`Document: ""`);
console.log(`Score: ${emptyScore} (expected: 0)`);
console.log(`✓ ${emptyScore === 0 ? 'PASS' : 'FAIL'}\n`);

// Test 5: Invalid document should return 0
console.log('Test 5: Invalid document');
const invalidDoc = createMockDocument('test');
const invalidScore = signal.score({ ...invalidDoc, text: undefined as any }, 'python tutorial', createMockContext(['python', 'tutorial'], 'python tutorial'));
console.log(`Document: { text: undefined }`);
console.log(`Score: ${invalidScore} (expected: 0)`);
console.log(`✓ ${invalidScore === 0 ? 'PASS' : 'FAIL'}\n`);

// Test 6: Whitespace differences should return 0
console.log('Test 6: Whitespace differences');
const whitespaceDoc = createMockDocument('python   tutorial');
const whitespaceScore = signal.score(whitespaceDoc, 'python tutorial', createMockContext(['python', 'tutorial'], 'python tutorial'));
console.log(`Document: "python   tutorial"`);
console.log(`Query: "python tutorial" (normalized)`);
console.log(`Score: ${whitespaceScore} (expected: 0 - different whitespace)`);
console.log(`✓ ${whitespaceScore === 0 ? 'PASS' : 'FAIL'}\n`);

console.log('=== Test Summary ===');
console.log('All ExactMatchSignal tests completed!');
console.log('Signal weight:', signal.weight);
console.log('Signal name:', signal.name);
