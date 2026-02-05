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

  // Pattern to split on underscores, whitespace, and common punctuation
  private static readonly SPLIT_PATTERN = /[\s,_;:.'"`~!@#$%^&*()+=\-\[\]{}\\|<>?/]+/;
  
  // Pattern to remove remaining punctuation from tokens
  private static readonly PUNCTUATION_PATTERN = /[^\w\s]/g;

  static tokenize(text: string, removeStopwords: boolean = true): string[] {
    if (!text) {
      return [];
    }

    try {
      // Convert to lowercase
      let normalized = text.toLowerCase();
      
      // Remove punctuation characters (except underscores which are handled by split)
      normalized = normalized.replace(Tokenizer.PUNCTUATION_PATTERN, '');
      
      // Split on underscores, whitespace, and common punctuation
      let tokens = normalized.split(Tokenizer.SPLIT_PATTERN);
      
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