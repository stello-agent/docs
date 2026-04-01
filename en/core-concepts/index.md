# Core Concepts

## From Line to Tree

Traditional AI conversation is a line — you say something, AI responds, context keeps growing until the window overflows. But human thinking isn't linear: when planning a startup, you're simultaneously considering market, product, funding, and team — each direction needs depth, yet they all need to connect.

Stello explodes that line into a tree. Whenever AI detects a topic fork, it creates a new **Session** (an independent conversation unit) to explore that branch in depth. All Sessions are organized via a **topology tree** that describes their parent-child and sibling relationships.

## The Skill Metaphor

Stello uses an intuitive metaphor to understand this tree: **each child Session is a [SKILL](https://agentskills.io/), and Main Session is the skill caller.**

Like a team leader who doesn't need to know every member's work details — just "what can you do" and "how's it going." Main Session doesn't read child Sessions' raw conversations, only their summary descriptions. Child Sessions are also unaware of each other — the only cross-branch information comes from Main Session's targeted insights.

## Three-Layer Memory

This metaphor naturally leads to Stello's **three-layer memory model**:

- **L3 (SKILL body)** — Complete chat history within each Session, consumed only by that Session's own LLM
- **L2 (SKILL description)** — A distilled summary of L3, the Session's "external interface" that Main Session reads
- **L1 (SKILL caller)** — Main Session's synthesis of all L2s into a global perspective, plus application-level key-value storage

Memory flows across layers: upward reporting (L3→L2→Main Session), downward push (Main Session insights→child Sessions).

## Consolidation & Integration

Memory doesn't flow automatically — two async processes drive it:

- **Consolidation** — Distills a Session's L3 into L2 ("what has this skill learned")
- **Integration** — Collects all child Session L2s, generates a global synthesis ("the big picture") and per-session insights ("advice for each branch")

Both are **fire-and-forget** — they never block conversation, scheduled by the orchestration layer at appropriate moments (e.g., every N turns, on session switch).

## Orchestration Strategy

The Session tree can be organized with different strategies:

- **Flat Strategy** — All child Sessions hang directly under Main Session, ideal for parallel multi-topic exploration (currently adopted)
- **Hierarchical Strategy** — Sessions can have child Sessions, forming a multi-level tree, ideal for OKR-style goal decomposition

The orchestration layer handles all of this: driving tool call loops, deciding when to consolidate/integrate, and managing Session lifecycles.

## Deep Dive

| Topic | Description |
|-------|-------------|
| [Three-Layer Memory](/en/core-concepts/three-layer-memory) | Detailed L3/L2/L1 semantics, context assembly rules, zero-conversation-overhead design |
| [Session & Topology](/en/core-concepts/session-and-topology) | Session independence, decoupling from topology, MainSession's special role |
| [Consolidation & Integration](/en/core-concepts/consolidation-and-integration) | Consolidation function design, scheduling triggers, ConsolidateFn/IntegrateFn pairing |
| [Orchestration Strategy](/en/core-concepts/orchestration-strategy) | Flat vs hierarchical trade-offs, scheduler configuration, Engine responsibilities |
