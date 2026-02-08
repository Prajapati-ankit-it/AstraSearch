import { SignalRegistry } from './SignalRegistry';
import { DocumentLengthSignal } from './examples/DocumentLengthSignal';

/**
 * Register all ranking signals here
 * 
 * To add new signals:
 * 1. Create a class implementing RankingSignal interface
 * 2. Import it here
 * 3. Register it with the registry
 * 
 * The framework will automatically apply all registered signals
 * during ranking without requiring any changes to searchEngine.ts
 */

export function registerSignals(): void {
  const registry = SignalRegistry.getInstance();

  // Example: Register document length signal (commented out for initial state)
  // registry.register(new DocumentLengthSignal());

  // Future signals can be registered here:
  // registry.register(new PopularitySignal());
  // registry.register(new FreshnessSignal());
  // registry.register(new QualitySignal());
}
