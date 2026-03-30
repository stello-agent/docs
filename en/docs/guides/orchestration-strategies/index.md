# Orchestration Strategies Overview

Orchestration strategies determine where a newly forked Session is placed in the topology tree. Different strategies produce different tree structures suited to different use cases.

## OrchestrationStrategy Interface

```typescript
interface OrchestrationStrategy {
  /** Determine the parent node ID for a new fork */
  resolveForkParent(
    source: { sessionId: string },
    sessions: SessionMeta[]
  ): string
}
```

`resolveForkParent` receives the source Session of the fork and the list of all current Sessions, then returns the parent node ID where the new node should be attached.

## Available Strategies

| Strategy | Class | Status | Tree Shape |
|----------|-------|--------|-----------|
| [Flat Strategy](./flat-strategy) | `MainSessionFlatStrategy` | Available | 2 levels (Main → children) |
| [OKR Hierarchical Strategy](./okr-hierarchical-strategy) | `HierarchicalOkrStrategy` | Planned | Multi-level nesting |

## Configuration

Pass the strategy in orchestration config when creating the Engine:

```typescript
import { createEngine, MainSessionFlatStrategy } from '@stello-ai/core'

const agent = createEngine({
  orchestration: {
    strategy: new MainSessionFlatStrategy(),
  },
  // ...
})
```

If no strategy is specified, `MainSessionFlatStrategy` is used by default.

## Implementing a Custom Strategy

Implement the `OrchestrationStrategy` interface to create your own:

```typescript
import type { OrchestrationStrategy, SessionMeta } from '@stello-ai/core'

class DepthLimitedStrategy implements OrchestrationStrategy {
  constructor(private maxDepth: number) {}

  resolveForkParent(
    source: { sessionId: string },
    sessions: SessionMeta[]
  ): string {
    // Custom logic: determine attachment point based on depth limit
    const depth = this.calculateDepth(source.sessionId)
    if (depth >= this.maxDepth) {
      return this.findRootId(sessions)
    }
    return source.sessionId
  }
}
```

Strategies only decide "where to attach" -- they do not create Sessions or write topology nodes. That is handled by the orchestration layer.
