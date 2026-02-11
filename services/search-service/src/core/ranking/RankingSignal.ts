import { Document } from '../../types/search.types';
import { RankingContext } from './RankingContext';

export interface SearchDocument extends Document {
  // Additional fields for ranking signals can be added here
  // For now, it's the same as Document since we've aligned the contracts
}

export interface RankingSignal {
  readonly name: string;
  readonly weight: number;

  score(
    doc: SearchDocument,
    query: string,
    context: RankingContext
  ): number;
}
