import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || 'localhost',
  nodeEnv: process.env.NODE_ENV || 'development',
  indexPath: process.env.INDEX_PATH || '../../index/inverted_index.json',
  documentsPath: process.env.DOCUMENTS_PATH || '../../data/processed/documents.json',
  statsPath: process.env.STATS_PATH || '../../index/stats.json',
  cacheTtl: parseInt(process.env.CACHE_TTL || '300000'), // 5 minutes
  logLevel: process.env.LOG_LEVEL || 'info',
  search: {
    defaultLimit: 10,
    maxLimit: 100,
    defaultOffset: 0
  },
  phraseScanThreshold: parseInt(process.env.PHRASE_SCAN_THRESHOLD || '2000'),
  proximityScanThreshold: parseInt(process.env.PROXIMITY_SCAN_THRESHOLD || '2000'),
  candidateTargetSize: parseInt(process.env.CANDIDATE_TARGET_SIZE || '5000')
};