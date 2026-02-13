/**
 * Static Synonym Dictionary
 * 
 * Explicit, static synonym mappings for query-time expansion.
 * No dynamic loading, no external APIs, no stemming assumptions.
 * 
 * Rules:
 * - Keep mappings explicit and directional
 * - No bidirectional auto-generation
 * - No recursive expansion
 * - Focus on technical/programming terms
 */

export const SYNONYM_MAP: Record<string, string[]> = {
  // JavaScript/Programming Language
  js: ['javascript'],
  javascript: ['js'],
  ts: ['typescript'],
  typescript: ['ts'],
  py: ['python'],
  python: ['py'],
  java: ['jvm'],
  jvm: ['java'],
  
  // Async/Programming Concepts
  promise: ['thenable', 'async'],
  async: ['promise'],
  thenable: ['promise'],
  callback: ['cb'],
  cb: ['callback'],
  
  // Database
  db: ['database'],
  database: ['db'],
  sql: ['query'],
  query: ['sql'],
  
  // Web/API
  api: ['endpoint', 'service'],
  endpoint: ['api'],
  service: ['api'],
  http: ['request', 'response'],
  request: ['http'],
  response: ['http'],
  
  // Development Tools
  git: ['commit', 'push', 'pull'],
  npm: ['package', 'install'],
  docker: ['container'],
  container: ['docker'],
  
  // Code Quality
  test: ['testing', 'unit'],
  testing: ['test'],
  unit: ['test'],
  bug: ['error', 'issue'],
  error: ['bug'],
  issue: ['bug'],
  
  // Data Structures
  array: ['list'],
  list: ['array'],
  map: ['dict', 'dictionary'],
  dict: ['map'],
  dictionary: ['map'],
  
  // Frontend
  css: ['style'],
  style: ['css'],
  html: ['markup'],
  markup: ['html'],
  dom: ['element'],
  element: ['dom'],
  
  // Backend
  server: ['backend'],
  backend: ['server'],
  client: ['frontend'],
  frontend: ['client']
};

/**
 * Get synonyms for a given term
 * @param term - The term to find synonyms for
 * @returns Array of synonyms or empty array if none found
 */
export function getSynonyms(term: string): string[] {
  return SYNONYM_MAP[term] || [];
}

/**
 * Check if a term has synonyms
 * @param term - The term to check
 * @returns True if term has synonyms, false otherwise
 */
export function hasSynonyms(term: string): boolean {
  return term in SYNONYM_MAP;
}
