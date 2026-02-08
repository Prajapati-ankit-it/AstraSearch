import { Document } from '../../types/search.types';
import { RankingContext } from './RankingContext';

export interface SearchDocument extends Document {
  fields?: Record<string, string>;
  signals?: Record<string, number>;
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
