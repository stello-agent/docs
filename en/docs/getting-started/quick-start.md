# Quick Start

This guide walks you through creating a complete StelloAgent with `@stello-ai/core` — featuring conversation splitting, memory consolidation, and starfield visualization.

## 1. Prepare an LLM Adapter

`@stello-ai/core` ships with built-in LLM adapters (re-exported from `@stello-ai/session`):

::: code-group

```typescript [Claude]
import { createClaude } from '@stello-ai/core'

const llm = createClaude({
  model: 'claude-sonnet-4-20250514',
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
```

```typescript [GPT]
import { createGPT } from '@stello-ai/core'

const llm = createGPT({
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY!,
})
```

```typescript [OpenAI Compatible]
import { createOpenAICompatibleAdapter } from '@stello-ai/core'

const llm = createOpenAICompatibleAdapter({
  model: 'your-model',
  apiKey: process.env.API_KEY!,
  baseURL: 'https://your-provider.com/v1',
  maxContextTokens: 128_000,
})
```

:::

## 2. Initialize Core Dependencies

StelloAgent requires three core dependencies: **SessionTree** (topology storage), **MemoryEngine** (memory persistence), and **Session components** (conversation units).

```typescript
import {
  NodeFileSystemAdapter,
  SessionTreeImpl,
  createStelloAgent,
  Scheduler,
  SkillRouterImpl,
  createDefaultConsolidateFn,
  createDefaultIntegrateFn,
  InMemoryStorageAdapter,
  loadSession,
  loadMainSession,
} from '@stello-ai/core'

// File system adapter: persists topology and memory to a local directory
const fs = new NodeFileSystemAdapter('./my-stello-data')
const sessions = new SessionTreeImpl(fs)

// In-memory storage for runtime conversation records
const sessionStorage = new InMemoryStorageAdapter()
```

## 3. Create a StelloAgent

StelloAgent is the core object in Stello — it orchestrates the Session tree, drives tool call loops, and schedules memory consolidation.

```typescript
// Create the topology root (Main Session)
const root = await sessions.createRoot('My Assistant')

// LLM call function for consolidation / integration
const llmCall = async (messages) => {
  const result = await llm.complete(messages)
  return result.content ?? ''
}

const agent = createStelloAgent({
  // Topology tree storage
  sessions,

  // Memory engine (manages L2, scope, and record persistence)
  memory: createFileMemoryEngine(fs, sessions),

  // Session layer integration
  session: {
    // Agent resolves Session instances on demand
    sessionResolver: async (sessionId) => {
      // Load and return Session or MainSession
      // See full example below for implementation details
    },
    // L3 → L2 consolidation function
    consolidateFn: createDefaultConsolidateFn(
      'Summarize the conversation in 100-150 words.',
      llmCall,
    ),
    // All L2s → synthesis + insights
    integrateFn: createDefaultIntegrateFn(
      'Synthesize all session summaries into a global analysis with targeted insights.',
      llmCall,
    ),
  },

  // Capabilities
  capabilities: {
    lifecycle: { /* lifecycle hooks */ },
    tools: { /* tool definitions & execution */ },
    skills: new SkillRouterImpl(),
    confirm: { /* split confirmation protocol */ },
  },

  // Scheduling: auto-consolidate every 3 turns, integrate after each consolidation
  orchestration: {
    scheduler: new Scheduler({
      consolidation: { trigger: 'everyNTurns', everyNTurns: 3 },
      integration: { trigger: 'afterConsolidate' },
    }),
  },
})
```

## 4. Chat with the Agent

```typescript
// Enter the root session
await agent.enterSession(root.id)

// Send a message — the Agent drives the tool call loop automatically
const turn = await agent.turn(root.id, 'Help me plan a startup')
console.log(turn.finalContent)

// When AI detects a new topic, it creates a child Session via stello_create_session
// You can also fork manually
const child = await agent.forkSession(root.id, {
  label: 'Market Research',
  scope: 'market-research',
})

// Chat in the child session
await agent.enterSession(child.id)
const childTurn = await agent.turn(child.id, 'Analyze the competitive landscape')
console.log(childTurn.finalContent)
```

## 5. Launch DevTools Visualization

One line to enable the starfield debug panel:

```typescript
import { startDevtools } from '@stello-ai/devtools'

await startDevtools(agent, {
  port: 4800,
  open: true,  // auto-open browser
})

// Browser opens http://localhost:4800
// See: starfield topology + conversation panels + live event stream
```

DevTools provides:
- **Star Map** — drag & zoom, real-time Session topology visualization
- **Conversation Panel** — browse each Session's chat history
- **Event Monitor** — track consolidation, integration, and fork events in real time
- **Config Panel** — adjust LLM, prompts, and tool toggles at runtime

## Next Steps

Continue to [Core Concepts](/en/docs/core-concepts/) to understand Stello's design philosophy and architecture.
