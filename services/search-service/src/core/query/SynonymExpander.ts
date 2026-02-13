/**
 * Synonym Expansion Engine
 * 
 * Safe, query-time synonym expansion with strict controls:
 * - Preserves original tokens
 * - Non-recursive expansion only
 * - Bounded expansion to prevent candidate explosion
 * - O(n) complexity
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
   * - O(n) complexity
   * 
   * @param tokens - Original query tokens
   * @returns Expanded array of tokens with synonyms
   */
  static expand(tokens: string[]): string[] {
    if (!tokens || tokens.length === 0) {
      return [];
    }

    // Use Set for automatic deduplication and O(1) lookups
    const expanded = new Set<string>(tokens);

    // Track expansion count for safety
    let expansionCount = 0;

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
          expansionCount++;

          // Safety check: prevent excessive expansion
          if (expanded.size >= MAX_EXPANSION_LIMIT) {
            break;
          }
        }
      }
    }

    const result = Array.from(expanded).slice(0, MAX_EXPANSION_LIMIT);
    
    if (expansionCount > 0) {
      logger.debug(`Synonym expansion: [${tokens.join(', ')}] -> [${result.join(', ')}] (${expansionCount} additions)`);
    }

    return result;
  }

  /**
   * Get expansion statistics for monitoring
   * 
   * @param originalTokens - Original query tokens
   * @param expandedTokens - Expanded tokens after synonym expansion
   * @returns Expansion statistics
   */
  static getExpansionStats(originalTokens: string[], expandedTokens: string[]): {
    originalCount: number;
    expandedCount: number;
    addedCount: number;
    expansionRatio: number;
    hitLimit: boolean;
  } {
    const originalCount = originalTokens.length;
    const expandedCount = expandedTokens.length;
    const addedCount = expandedCount - originalCount;
    const expansionRatio = originalCount > 0 ? expandedCount / originalCount : 1;
    const hitLimit = expandedCount >= MAX_EXPANSION_LIMIT;

    return {
      originalCount,
      expandedCount,
      addedCount,
      expansionRatio,
      hitLimit
    };
  }

  /**
   * Check if expansion would be safe for given tokens
   * 
   * @param tokens - Tokens to check
   * @returns True if expansion is within safe limits
   */
  static isSafeExpansion(tokens: string[]): boolean {
    if (!tokens || tokens.length === 0) {
      return true;
    }

    // Quick check: if original tokens already exceed limit, expansion is unsafe
    if (tokens.length >= MAX_EXPANSION_LIMIT) {
      return false;
    }

    // Count potential expansions
    let potentialExpansions = 0;
    for (const token of tokens) {
      const synonyms = getSynonyms(token);
      if (synonyms) {
        potentialExpansions += synonyms.length;
      }
    }

    return (tokens.length + potentialExpansions) <= MAX_EXPANSION_LIMIT;
  }
}
