/**
 * Static Synonym Dictionary
 * 
 * Explicit, static synonym mappings for query-time expansion.
 * No dynamic loading, no external APIs, no stemming assumptions.
 * 
 * Rules:
 * - Keep mappings explicit and directional
 * - Only true equivalence (abbreviations, exact terms)
 * - No concept expansion or ecosystem mappings
 * - No bidirectional auto-generation
 */

export const SYNONYM_MAP: Record<string, string[]> = {
  // Programming Language Abbreviations
  js: ['javascript'],
  ts: ['typescript'],
  py: ['python'],
  
  // Technical Term Equivalents
  db: ['database'],
  callback: ['cb'],
  array: ['list'],
  map: ['dict'],
  dict: ['map'],
  
  // Common Abbreviations
  api: ['endpoint'],
  css: ['style'],
  html: ['markup'],
  dom: ['element']
};

/**
 * Get synonyms for a given term
 * @param term - The term to find synonyms for
 * @returns Array of synonyms or empty array if none found
 */
export function getSynonyms(term: string): string[] {
  return SYNONYM_MAP[term] || [];
}
