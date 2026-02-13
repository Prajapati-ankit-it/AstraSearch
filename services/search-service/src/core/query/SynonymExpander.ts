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

    // Deduplicate original tokens first
    const uniqueOriginalTokens = new Set(tokens);
    
    // Initialize Set with unique originals
    const expanded = new Set<string>(uniqueOriginalTokens);

    for (const token of uniqueOriginalTokens) {
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

    // Enforce invariant: all original tokens must be present
    const allOriginalPresent = [...uniqueOriginalTokens].every(t => expanded.has(t));
    if (!allOriginalPresent) {
      logger.error("Synonym invariant violated — falling back to original tokens.");
      return [...uniqueOriginalTokens];
    }

    const result = Array.from(expanded);
    
    // Correct addedCount calculation
    const addedCount = expanded.size - uniqueOriginalTokens.size;
    if (addedCount > 0) {
      logger.debug(`Synonym expansion: [${[...uniqueOriginalTokens].join(', ')}] -> [${result.join(', ')}] (${addedCount} additions)`);
    }

    return result;
  }
}
