import { RankingSignal } from './RankingSignal';

export class SignalRegistry {
  private static instance: SignalRegistry;
  private signals: RankingSignal[] = [];

  private constructor() {}

  static getInstance(): SignalRegistry {
    if (!SignalRegistry.instance) {
      SignalRegistry.instance = new SignalRegistry();
    }
    return SignalRegistry.instance;
  }

  register(signal: RankingSignal): void {
    this.signals.push(signal);
  }

  getActiveSignals(): RankingSignal[] {
    return [...this.signals]; // Return copy to prevent external mutation
  }

  clear(): void {
    this.signals = [];
  }
}
