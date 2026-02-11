import { RankingSignal, SearchDocument } from '../RankingSignal';
import { RankingContext } from '../RankingContext';

/**
 * Example signal that favors shorter documents
 * This is for demonstration only - not meant for production use
 * 
 * NOTE: This signal is commented out in registerSignals.ts
 * It demonstrates the proper dataset-agnostic pattern
 */
export class DocumentLengthSignal implements RankingSignal {
  readonly name = 'document_length';
  readonly weight = 0.1; // Small weight to avoid overwhelming BM25

  score(doc: SearchDocument, query: string, context: RankingContext): number {
    // Return 0 if document doesn't have text field
    if (!doc.text || typeof doc.text !== 'string') {
      return 0;
    }

    const docLength = doc.text.length;
    const avgLength = context.corpusStats.avg_doc_length;

    // Simple scoring: shorter documents get higher scores
    // Normalize to reasonable range
    const lengthRatio = avgLength / Math.max(docLength, 1);
    return Math.min(lengthRatio * 0.1, 0.5); // Cap at 0.5
  }
}
