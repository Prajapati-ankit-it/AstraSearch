# Generic Ranking Signal Framework

A production-ready, extensible ranking framework that allows optional signals to be added without modifying core BM25 logic.

## 🏗️ Architecture

```
query → tokenize → candidate selection → BM25 scoring → RankingSignals → sort → results
```

## 📁 Framework Components

### Core Interfaces
- **RankingSignal**: Interface for all ranking signals
- **RankingContext**: Shared read-only context for signals
- **RankedDocument**: Document with BM25 and final scores

### Core Classes
- **SignalRegistry**: Singleton registry for signal registration
- **Ranker**: Applies signals to compute final scores

## 🚀 Usage

### Adding New Signals

1. **Create Signal Class**:
```typescript
export class MySignal implements RankingSignal {
  readonly name = 'my_signal';
  readonly weight = 0.5;

  score(doc: SearchDocument, query: string, context: RankingContext): number {
    // Return 0 if data missing
    if (!doc.myField) return 0;
    
    // Compute signal score
    return Math.min(doc.myField / 100, 1.0);
  }
}
```

2. **Register Signal**:
```typescript
// In registerSignals.ts
import { MySignal } from './signals/MySignal';

export function registerSignals(): void {
  const registry = SignalRegistry.getInstance();
  registry.register(new MySignal());
}
```

### Signal Requirements

- **Pure Functions**: No side effects or mutations
- **Graceful Degradation**: Return 0 if data missing
- **Never Throw**: Signals must never crash ranking
- **Weighted Scoring**: Use weight to control signal impact

## 📊 Scoring Formula

```
finalScore = bm25Score + Σ (signal.score * signal.weight)
```

## 🛡️ Safety Guarantees

- **BM25 Always Included**: Core relevance never removed
- **Zero Signals Safe**: Works with no registered signals
- **Signal Isolation**: Failed signals don't affect others
- **Deterministic**: Same query produces same results

## 📋 Examples

### Document Length Signal
```typescript
export class DocumentLengthSignal implements RankingSignal {
  readonly name = 'document_length';
  readonly weight = 0.1;

  score(doc: SearchDocument, query: string, context: RankingContext): number {
    if (!doc.solution) return 0;
    const lengthRatio = context.corpusStats.avg_doc_length / doc.solution.length;
    return Math.min(lengthRatio * 0.1, 0.5);
  }
}
```

## 🔧 Configuration

Signal weights can be adjusted in signal classes or made configurable via environment variables.

## 📈 Performance

- **Minimal Overhead**: Only processes candidate documents
- **Cached Context**: Shared context avoids recomputation
- **Early Exit**: Signals return 0 for missing data

## 🚫 Forbidden Patterns

- **Dataset Coupling**: No StackOverflow-specific logic in signals
- **ML/Embeddings**: Keep signals simple and deterministic
- **Feature Flags**: Use registry pattern instead
- **BM25 Modification**: Never touch core BM25 logic
