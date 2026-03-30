# Orchestration Strategy

The orchestration layer is an execution cycle manager on top of Session primitives — it doesn't create new capabilities, but schedules the ones Session layer already provides.

## Engine: Execution Cycle

Engine manages a single Session's conversation cycle:

- **turn()** — `Session.send()` × N (tool call loop) + scheduling decisions
- After each turn, Engine asks Scheduler whether consolidation / integration is needed
- All async side effects (consolidation, integration) are **fire-and-forget**, never blocking turn() return

Engine is unaware of tree structure and other Sessions. It only manages the conversation loop for the Session it's responsible for.

## Strategy: How to Organize the Session Tree

The Session tree can be organized with different strategies. Strategies implement the `OrchestrationStrategy` interface, with the core method `resolveForkParent()` — deciding which node a newly forked Session should attach to.

### Flat Strategy (Currently Adopted)

`MainSessionFlatStrategy`: All child Sessions hang directly under Main Session.

```
Main Session
├── Market Research
├── Product Design
├── Fundraising
└── Team Building
```

No matter which Session initiates a fork, the new Session becomes a direct child of Main Session. The tree is always 2 levels.

**Best for**: Parallel multi-topic exploration, consulting apps, knowledge map building.

### Hierarchical Strategy

`HierarchicalOkrStrategy`: Sessions can have child Sessions, forming a multi-level tree.

```
Main Session
├── Q1 Goals
│   ├── Product Iteration
│   └── User Growth
└── Q2 Goals
    ├── Internationalization
    └── Revenue
```

When forking, the new Session attaches under the Session that initiated the fork, naturally forming a hierarchy.

**Best for**: OKR decomposition, project management, course systems, multi-level organizations.

## Scheduler: Scheduling Configuration

Scheduler controls consolidation and integration trigger timing. See [Consolidation & Integration](/en/docs/core-concepts/consolidation-and-integration) for details.

Common configuration patterns:

| Pattern | Consolidation | Integration | Use Case |
|---------|---------------|-------------|----------|
| **Automatic** | `everyNTurns: 3` | `afterConsolidate` | Most scenarios |
| **On switch** | `onSwitch` | `afterConsolidate` | Frequent Session switching |
| **Manual** | `manual` | `manual` | When precise control is needed |

## Position in the Four-Layer Architecture

Bottom to top: **Session layer** (`@stello-ai/session` — send / consolidate / fork / context assembly) → **Orchestration layer** (`@stello-ai/core` — Engine / Scheduler / Strategy / fork management) → **Application layer** (developer provides StorageAdapter, LLMAdapter, ConsolidateFn, IntegrateFn, tool definitions) → **HTTP / SDK layer** (`@stello-ai/server`).

The orchestration layer depends on the Session layer, but the Session layer is unaware of the orchestration layer. This one-way dependency lets both layers be tested and used independently.
