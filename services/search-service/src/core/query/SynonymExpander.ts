/**
 * Synonym Expansion Engine
 * 
 * Safe, query-time synonym expansion with strict controls:
 * - Preserves original tokens
 * - Non-recursive expansion only
 * - Bounded expansion to prevent candidate explosion
 * - O(n + k) complexity where k = number of added synonyms
 * 
 * Synonym expansion is query-time only.
 * Index remains untouched.
 * Expansion is non-recursive and capped.
 */

import { getSynonyms } from './SynonymDictionary';
import { logger } from '../../utils/logger';

// Maximum number of tokens after expansion to prevent candidate explosion
const MAX_EXPANSION_LIMIT = 20;

export class SynonymExpander {
  /**
   * Expand query tokens with their direct synonyms
   * 
   * Rules:
   * - Always preserve original tokens
   * - Expand only direct synonyms (no recursion)
   * - Deduplicate final list
   * - Cap total expanded tokens at safe threshold
   * - O(n + k) complexity where k = number of added synonyms
   * 
   * @param tokens - Original query tokens
   * @returns Expanded array of tokens with synonyms
   */
  static expand(tokens: string[]): string[] {
    if (!tokens || tokens.length === 0) {
      return [];
    }

    // Track unique original tokens to enforce invariant
    const uniqueOriginalCount = new Set(tokens).size;
    
    // Use Set for automatic deduplication and O(1) lookups
    const expanded = new Set<string>(tokens);

    for (const token of tokens) {
      // Safety check: don't expand if we've hit the limit
      if (expanded.size >= MAX_EXPANSION_LIMIT) {
        logger.debug(`Synonym expansion hit limit (${MAX_EXPANSION_LIMIT}) for tokens: [${tokens.join(', ')}]`);
        break;
      }

      const synonyms = getSynonyms(token);
      if (synonyms && synonyms.length > 0) {
        for (const synonym of synonyms) {
          expanded.add(synonym);
          
          // Safety check: prevent excessive expansion
          if (expanded.size >= MAX_EXPANSION_LIMIT) {
            break;
          }
        }
      }
    }

    const result = Array.from(expanded);
    
    // Enforce invariant: original tokens are never dropped
    const finalUniqueCount = new Set(result).size;
    if (finalUniqueCount < uniqueOriginalCount) {
      logger.error(`Invariant violation: original tokens dropped. Original: ${uniqueOriginalCount}, Final: ${finalUniqueCount}`);
      // Fallback to original tokens to preserve intent
      return tokens;
    }

    const addedCount = result.length - tokens.length;
    if (addedCount > 0) {
      logger.debug(`Synonym expansion: [${tokens.join(', ')}] -> [${result.join(', ')}] (${addedCount} additions)`);
    }

    return result;
  }
}
