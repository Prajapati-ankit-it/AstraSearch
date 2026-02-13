import { CorpusStats } from '../../types/search.types';

export interface RankingContext {
  corpusStats: CorpusStats;
  queryTerms: string[];
  query: string;
  candidateCount: number;
}
