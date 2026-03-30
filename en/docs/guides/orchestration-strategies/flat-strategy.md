# Flat Strategy

`MainSessionFlatStrategy` is Stello's default orchestration strategy. All forked child Sessions attach directly under the root node (Main Session), forming a fixed two-level tree.

## Behavior

Regardless of which Session initiates the fork, the newly created child Session always attaches under the Main Session:

```
Main Session (root)
├── Session A
├── Session B    ← even if forked from Session A, attaches to root
├── Session C
└── Session D
```

`resolveForkParent` always returns the root node ID, ignoring the source Session.

## Use Cases

The flat strategy is suited for:

- **Multi-topic parallel exploration** -- Each child Session independently explores a topic without interference
- **Consulting advisors** -- Main Session acts as the advisor, each child Session is an independent consulting domain
- **Knowledge maps** -- Each child Session represents a knowledge node, Main Session synthesizes across them
- **Skill inventory** -- Each child Session is a standalone skill, Main Session is the orchestrator

## Configuration Example

```typescript
import { createEngine, MainSessionFlatStrategy } from '@stello-ai/core'

const agent = createEngine({
  orchestration: {
    strategy: new MainSessionFlatStrategy(),
  },
  llm: adapter,
  storage: storage,
  systemPrompt: 'You are a multi-domain knowledge assistant.',
})
```

Since the flat strategy is the default, you can also omit the strategy configuration:

```typescript
const agent = createEngine({
  llm: adapter,
  storage: storage,
  systemPrompt: 'You are a multi-domain knowledge assistant.',
})
```

## How It Works with Integration

Under the flat strategy, all child Session L2s are at the same level. Main Session collects all L2s via `getAllSessionL2s()` for integration. This means the Main Session has equal visibility into all skills with no hierarchical priority.
