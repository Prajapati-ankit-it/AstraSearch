import { CorpusStats } from '../../types/search.types';

export interface RankingContext {
  readonly corpusStats: CorpusStats;
  readonly queryTerms: string[];
  readonly query: string;
  readonly candidateCount: number;
}
