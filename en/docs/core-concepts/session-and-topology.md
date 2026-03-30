# Session & Topology

## Session: Independent Conversation Unit

A Session is Stello's smallest conversation unit. Each Session is independent: it has its own conversation history (L3), system prompt, and memory (L2), but **doesn't know where it sits in the tree**.

### SessionMeta

Each Session's metadata contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `label` | string | Human-readable name |
| `role` | `'standard' \| 'main'` | Regular Session or Main Session |
| `status` | `'active' \| 'archived'` | Lifecycle state |
| `tags` | string[] | Organizational labels |
| `metadata` | Record | Custom extension data |

Note that SessionMeta has **no `parentId` or `depth`** fields — Sessions are completely unaware of tree structure.

### Session Capabilities

- `send(content)` — Assemble context → single LLM call → store L3 → return response
- `stream(content)` — Streaming version of send
- `consolidate(fn)` — Exposed to upper layer for L3→L2 distillation
- `fork(options)` — One-time context inheritance, creates an independent new Session
- `archive()` — Archive, no more messages accepted

Sessions make **single LLM calls** — tool call loops are driven by the orchestration layer, not by Sessions themselves.

## Main Session: Global Awareness Layer

Main Session is the topology tree's root node. Its role is **SKILL Caller**: reading all child Session L2s and maintaining global perspective.

Key differences from regular Sessions:

| | Session (child) | MainSession |
|--|--------------|-------------|
| Context | system prompt + insight + L3 | system prompt + **synthesis** + L3 |
| Memory | `memory()` → L2 | `synthesis()` → integration product |
| Distillation | `consolidate(fn)` L3→L2 | `integrate(fn)` all L2s→synthesis+insights |
| Insight | Receives passively | Pushes actively |
| Fork | Yes | No |

Main Session **only reads L2, never reads child Session L3**. This is a core constraint — the Caller sees interfaces, not implementations.

## Topology Tree: TopologyNode

Sessions don't know about the tree — so who maintains it? The answer is **TopologyNode**, a lightweight data structure independent of Sessions:

```typescript
interface TopologyNode {
  id: string              // equals sessionId
  parentId: string | null // null = root (Main Session)
  label: string           // redundant field, avoids loading full Session for rendering
}
```

The topology tree is managed by `MainStorage`:
- `putNode(node)` — Write a node
- `getChildren(parentId)` — Lazy-load child nodes
- `removeNode(nodeId)` — Remove a node

### Why Decouple?

Decoupling Sessions from the topology tree brings three benefits:

1. **Sessions are independently testable** — No tree context needed to run
2. **Topology renders independently** — Frontend only needs TopologyNodes to draw the star map, no Session data loading required
3. **Fork is two separate operations** — Orchestration layer creates a Session (Session layer) + writes a TopologyNode (storage layer), clean separation of concerns

## Storage Interface Layering

Storage is split not by data structure, but by **consumer responsibility**:

| Interface | Injected Into | Responsibility |
|-----------|--------------|----------------|
| **SessionStorage** | Regular Session | Single Session data: L3, system prompt, insight, L2 |
| **MainStorage** | Main Session + orchestration | Additional: `getAllSessionL2s()` bulk collection, topology tree, session enumeration, global key-value |

MainStorage extends SessionStorage — Main Session has all capabilities of a regular Session, plus global operations.
