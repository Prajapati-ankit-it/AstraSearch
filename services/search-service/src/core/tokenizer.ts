import { logger } from '../utils/logger';

export class Tokenizer {
  private static readonly STOPWORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'i', 'you', 'your', 'we',
    'they', 'them', 'their', 'this', 'these', 'those', 'or', 'but',
    'not', 'no', 'can', 'could', 'should', 'would', 'have', 'had',
    'do', 'does', 'did', 'so', 'if', 'then', 'else', 'when', 'where',
    'why', 'how', 'what', 'which', 'who', 'whom', 'whose', 'my',
    'me', 'mine', 'our', 'us', 'ours', 'him', 'his', 'her', 'hers'
  ]);

  // Pattern to split on whitespace only (input is already normalized)
  private static readonly SPLIT_PATTERN = /\s+/;

  /**
   * Tokenize pre-normalized text into terms
   * 
   * Tokenizer expects pre-normalized input.
   * Do not perform normalization here.
   * 
   * @param text - Pre-normalized text input
   * @param removeStopwords - Whether to filter stopwords
   * @returns Array of tokens
   */
  static tokenize(text: string, removeStopwords: boolean = true): string[] {
    if (!text) {
      return [];
    }

    try {
      // Split on whitespace (input is already normalized)
      let tokens = text.split(Tokenizer.SPLIT_PATTERN);
      
      // Filter out empty strings and optionally stopwords
      const filteredTokens = tokens
        .filter(token => token.length > 0)
        .filter(token => !removeStopwords || !Tokenizer.STOPWORDS.has(token));

      logger.debug(`Tokenized "${text}" -> [${filteredTokens.join(', ')}]`);
      return filteredTokens;

    } catch (error) {
      logger.error('Tokenization error:', error);
      return [];
    }
  }
}