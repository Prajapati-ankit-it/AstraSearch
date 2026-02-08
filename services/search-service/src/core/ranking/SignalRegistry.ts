import { RankingSignal } from './RankingSignal';

export class SignalRegistry {
  private static instance: SignalRegistry;
  private signals: RankingSignal[] = [];
  private signalMap: Map<string, RankingSignal> = new Map();

  private constructor() {}

  static getInstance(): SignalRegistry {
    if (!SignalRegistry.instance) {
      SignalRegistry.instance = new SignalRegistry();
    }
    return SignalRegistry.instance;
  }

  register(signal: RankingSignal): void {
    // O(1) lookup for duplicate prevention
    if (this.signalMap.has(signal.name)) {
      return; // Skip duplicate registration
    }
    
    this.signals.push(signal);
    this.signalMap.set(signal.name, signal);
  }

  getActiveSignals(): RankingSignal[] {
    return [...this.signals]; // Return copy to prevent external mutation
  }

  clear(): void {
    this.signals = [];
    this.signalMap.clear();
  }

  // Optional: Explicit replace behavior
  replace(signal: RankingSignal): void {
    const existingIndex = this.signals.findIndex(s => s.name === signal.name);
    if (existingIndex >= 0) {
      this.signals[existingIndex] = signal;
    } else {
      this.signals.push(signal);
    }
    this.signalMap.set(signal.name, signal);
  }

  // Optional: Explicit unregister behavior  
  unregister(signalName: string): boolean {
    const index = this.signals.findIndex(s => s.name === signalName);
    if (index >= 0) {
      this.signals.splice(index, 1);
      this.signalMap.delete(signalName);
      return true;
    }
    return false;
  }
}
