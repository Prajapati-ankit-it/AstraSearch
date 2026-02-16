import { SignalRegistry } from './SignalRegistry';
import { DocumentLengthSignal } from './examples/DocumentLengthSignal';
import { PhraseBoostSignal } from './signals/PhraseBoostSignal';
import { TermCoverageSignal } from './signals/TermCoverageSignal';
import { ProximityBoostSignal } from './signals/ProximityBoostSignal';

/**
 * Register all ranking signals here
 * 
 * To add new signals:
 * 1. Create a class implementing RankingSignal interface
 * 2. Import it here
 * 3. Register it with registry
 * 
 * The framework will automatically apply all registered signals
 * during ranking without requiring any changes to searchEngine.ts
 * 
 * NOTE: Registration is idempotent - duplicate signals are ignored
 */

export function registerSignals(): void {
  const registry = SignalRegistry.getInstance();

  // Example: Register document length signal (commented out for initial state)
  // registry.register(new DocumentLengthSignal());

  // Register phrase boost signal
  registry.register(new PhraseBoostSignal());

  // Coverage complements BM25 by rewarding breadth of term match
  registry.register(new TermCoverageSignal());

  // Proximity boost rewards documents where query terms appear close together
  registry.register(new ProximityBoostSignal());

  // Future signals can be registered here:
  // registry.register(new PopularitySignal());
  // registry.register(new FreshnessSignal());
  // registry.register(new QualitySignal());
}
