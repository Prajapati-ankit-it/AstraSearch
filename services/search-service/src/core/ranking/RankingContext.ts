import { CorpusStats } from '../../types/search.types';
import { QueryIntent } from '../query/QueryIntent';

export interface RankingContext {
  readonly corpusStats: CorpusStats;
  readonly queryTerms: string[];
  readonly query: string;
  readonly candidateCount: number;
  readonly intent: QueryIntent;
}
