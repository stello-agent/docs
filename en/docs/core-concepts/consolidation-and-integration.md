# Consolidation & Integration

Consolidation and Integration are the two processes that drive Stello's three-layer memory flow. They execute asynchronously and never block conversation.

## Consolidation: L3 → L2

Consolidation distills a Session's raw conversation (L3) into a SKILL description (L2).

```typescript
type ConsolidateFn = (
  currentMemory: string | null,  // current L2 (null on first run)
  messages: Message[],            // full L3 records
) => Promise<string>              // new L2
```

### Design Points

- **Application defines the format** — The framework doesn't dictate what L2 looks like. It can be a summary paragraph, a JSON structure, or whatever fits your scenario
- **fn chooses its own LLM tier** — ConsolidateFn captures LLM call capability via closure, so you can use a cheaper model for summarization
- **Incremental updates** — `currentMemory` passes the previous L2, allowing fn to update incrementally rather than re-distilling from scratch
- **Fire-and-forget** — Consolidation doesn't block the current conversation, triggered in the background by the scheduler

### Default Implementation

`@stello-ai/core` provides `createDefaultConsolidateFn`, accepting a prompt and an LLM call function:

```typescript
import { createDefaultConsolidateFn } from '@stello-ai/core'

const consolidateFn = createDefaultConsolidateFn(
  'Summarize the conversation in 100-150 words.',
  llmCall,
)
```

## Integration: All L2s → Synthesis + Insights

Integration is Main Session's core operation: collect all child Session L2s, generate a global synthesis and per-session insights.

```typescript
type IntegrateFn = (
  children: ChildL2Summary[],      // all child Session L2s
  currentSynthesis: string | null,  // current synthesis
) => Promise<IntegrateResult>

interface ChildL2Summary {
  sessionId: string
  label: string
  l2: string
}

interface IntegrateResult {
  synthesis: string
  insights: Array<{ sessionId: string; content: string }>
}
```

### Design Points

- **Synthesis** — Main Session's comprehensive understanding of all child Sessions, injected into its own LLM context
- **Insights** — Targeted advice for each child Session. Each insight replaces (not appends to) the Session's previous insight — every integration provides a fresh, complete judgment
- **Atomic write** — Synthesis and insights are written in the same transaction, ensuring consistency
- **ConsolidateFn and IntegrateFn are paired** — ConsolidateFn produces L2 in some format, IntegrateFn reads that format. Both are designed together by the application layer

### Default Implementation

```typescript
import { createDefaultIntegrateFn } from '@stello-ai/core'

const integrateFn = createDefaultIntegrateFn(
  'Synthesize all session summaries into global insights and targeted advice.',
  llmCall,
)
```

## Scheduling

Consolidation and Integration triggers are controlled by the `Scheduler`:

### Consolidation Triggers

| Trigger | Description |
|---------|-------------|
| `manual` | Only via explicit call |
| `everyNTurns` | After every N conversation turns |
| `onSwitch` | When switching to another Session |
| `onArchive` | When archiving a Session |
| `onLeave` | When leaving a Session |

### Integration Triggers

| Trigger | Description |
|---------|-------------|
| `manual` | Only via explicit call |
| `afterConsolidate` | Automatically after each Consolidation completes |
| `everyNTurns` | After every N conversation turns |
| `onSwitch` | When switching Sessions |
| `onArchive` | When archiving |
| `onLeave` | When leaving |

### Configuration Example

```typescript
import { Scheduler } from '@stello-ai/core'

const scheduler = new Scheduler({
  consolidation: { trigger: 'everyNTurns', everyNTurns: 3 },
  integration: { trigger: 'afterConsolidate' },
})
```

This is the most common configuration: consolidate L2 every 3 turns, then automatically run global integration after each consolidation.

## Information Flow Overview

- **Upward reporting**: Each child Session distills L3 into L2 via Consolidation. Main Session collects all L2s via `getAllSessionL2s()`, then Integration generates synthesis
- **Downward push**: Integration also generates a targeted insight for each child Session, written to that Session's insight slot and automatically injected into context on the next conversation turn
- **Horizontal isolation**: No direct communication between child Sessions — all cross-branch information is relayed through Main Session
