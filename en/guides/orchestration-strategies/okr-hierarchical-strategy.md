# OKR Hierarchical Strategy

`HierarchicalOkrStrategy` is a planned orchestration strategy where forked child Sessions attach under the source Session, forming a multi-level nested tree.

::: warning Not Yet Implemented
This strategy is currently a placeholder that throws a TODO error when called. Contributions are welcome.
:::

## Planned Behavior

Unlike the flat strategy, the hierarchical strategy attaches new Sessions under the Session that initiated the fork:

```
Main Session (root)
├── Objective A
│   ├── Key Result A.1
│   └── Key Result A.2
│       ├── Task A.2.1
│       └── Task A.2.2
└── Objective B
    ├── Key Result B.1
    └── Key Result B.2
```

`resolveForkParent` would return the source Session's ID, causing the topology tree to naturally form a hierarchy.

## Use Cases

The hierarchical strategy is suited for scenarios requiring natural decomposition:

- **OKR decomposition** -- Objectives → Key Results → Tasks, broken down level by level
- **Project management** -- Project → Modules → Subtasks in a tree structure
- **Course systems** -- Course → Chapters → Topics in hierarchical organization
- **Organizational structure** -- Departments → Teams → Members in hierarchical mapping

## Expected Configuration

```typescript
import { createEngine, HierarchicalOkrStrategy } from '@stello-ai/core'

// Note: currently throws a TODO error
const agent = createEngine({
  orchestration: {
    strategy: new HierarchicalOkrStrategy(),
  },
  // ...
})
```

## Current Status

The `HierarchicalOkrStrategy` implementation is currently:

```typescript
class HierarchicalOkrStrategy implements OrchestrationStrategy {
  resolveForkParent(source: { sessionId: string }): string {
    throw new Error('TODO: HierarchicalOkrStrategy not yet implemented')
  }
}
```

If your use case requires hierarchical structure, you can achieve similar results by implementing a custom `OrchestrationStrategy` -- see [Orchestration Strategies Overview](./index).
