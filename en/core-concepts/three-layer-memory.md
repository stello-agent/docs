# Three-Layer Memory

Stello's memory system has three layers, each with a clear consumer and semantics. This layering lets information flow efficiently between Sessions without sharing raw conversations.

## Overview

| Layer | Content | Consumer | When Generated |
|-------|---------|----------|---------------|
| **L3** | Raw conversation records | The Session's own LLM | Appended automatically each turn |
| **L2** | SKILL description (external view) | Main Session (via integration) | Batch-generated during Consolidation |
| **L1** | Global cognition | Main Session itself + application layer | Integration generates synthesis; app layer reads/writes key-value directly |

## L3: SKILL Body

L3 is the complete conversation history within a Session. Each message contains `role`, `content`, `timestamp`, and optional `toolCalls` / `toolCallId`.

- **Storage**: Appended via `SessionStorage.appendRecord()`
- **Consumption**: Sent as part of the LLM context when Session calls the model
- **Lifecycle**: Can be truncated via `trimRecords(keepRecent)`

L3 is **only visible to that Session**. Main Session never reads a child Session's L3 — this is one of the core constraints.

## L2: SKILL Description

L2 is a distilled summary of L3, representing the Session's "external interface" — what it has learned.

- **Generation**: Produced by `ConsolidateFn` during Consolidation
- **Storage**: Written via `SessionStorage.putMemory()`
- **Consumption**: Main Session collects all child L2s via `MainStorage.getAllSessionL2s()`

Key design: **L2 is invisible to the child Session itself**. L2 is an external description written for Main Session, not self-use memory. However, when the context window approaches overflow, L2 is injected into the Session's own context as compressed memory.

```
ConsolidateFn signature:
(currentMemory: string | null, messages: Message[]) => Promise<string>

Input: current L2 (null on first run) + full L3 records
Output: new L2 text
```

The framework is completely agnostic to L2's content format — ConsolidateFn and IntegrateFn are paired functions, and the application layer defines L2's structure.

## L1: SKILL Caller

L1 has two parts:

### Synthesis (Emergent Layer)

When Main Session calls `integrate()`, IntegrateFn reads all child Session L2s and produces:
- **synthesis**: A comprehensive distillation of all L2s — Main Session's "global perspective"
- **insights**: Targeted suggestions pushed to each child Session

Synthesis is stored in Main Session's memory slot and injected into its LLM context.

### Global Key-Value (Structured Layer)

Key-value data directly read/written by the application layer via `MainStorage.getGlobal()` / `putGlobal()`. No LLM involved — managed by application code.

## Context Assembly

Context assembly rules are fixed for each Session type:

### Child Session Context

```
system prompt → insight (advice from Main Session) → L3 records → user message
```

When tokens exceed 80% of the context window and L2 exists, auto-compression kicks in:

```
system prompt → insight → L2 (as compressed memory) → recent L3 → user message
```

### Main Session Context

```
system prompt → synthesis (global perspective) → L3 records → user message
```

Note: Main Session has no insight (it's the insight pusher) — synthesis takes its place.

## Zero Conversation Overhead

L2 is batch-generated during Consolidation, not updated every turn. An in-progress Session has no L2 and is temporarily invisible to Main Session — this is an intentional trade-off ensuring no extra LLM calls during active conversation.
