# Using DevTools

Stello DevTools provides a visual debugging interface with star map topology visualization, conversation panel, event monitoring, and configuration panel.

## Installation

```bash
pnpm add -D @stello-ai/devtools
```

## Basic Usage

```typescript
import { startDevtools } from '@stello-ai/devtools'

const agent = createEngine({
  // ... your agent config
})

// Start the DevTools dev server
await startDevtools(agent, {
  port: 4800, // default port
  open: true, // auto-open browser
})
```

Visit `http://localhost:4800` to access the DevTools interface.

## DevtoolsOptions

```typescript
interface DevtoolsOptions {
  /** DevTools server port, default 4800 */
  port?: number
  /** Whether to auto-open browser, default true */
  open?: boolean
}
```

## Optional Providers

The second argument to `startDevtools` supports optional providers to enhance DevTools functionality:

```typescript
await startDevtools(agent, {
  port: 4800,

  /** LLM adapter for sending test messages in DevTools */
  llm: adapter,

  /** Prompt management */
  prompts: promptProvider,

  /** Session access interface */
  sessionAccess: sessionAccessProvider,

  /** Tool list display */
  tools: toolProvider,

  /** Skills list display */
  skills: skillProvider,

  /** Integration status viewing */
  integration: integrationProvider,

  /** Reset functionality */
  reset: resetProvider,

  /** State persistence store */
  stateStore: myStateStore,
})
```

## Features

### Star Map Visualization

Displays the Session topology as an interactive star map. Each Session is a "star" with the Main Session at the center and child Sessions radiating outward. Supports:
- Click nodes to view Session details
- Drag nodes to adjust layout
- Persistent node position saving

### Conversation Panel

Select a Session to view its full conversation history (L3) and send test messages directly.

### Event Monitor

Real-time display of Engine event stream, including:
- Session creation/switching
- Consolidation/Integration triggers
- Tool call execution
- Error events

### Configuration Panel

View and modify runtime configuration including system prompt, tool list, scheduling strategy, and more.

## State Persistence

DevTools supports persisting UI state (such as node positions) via `DevtoolsStateStore`:

```typescript
interface DevtoolsStateStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
}
```

Pass a custom implementation to restore UI state across restarts:

```typescript
const stateStore: DevtoolsStateStore = {
  async get(key) {
    return localStorage.getItem(`devtools:${key}`)
  },
  async set(key, value) {
    localStorage.setItem(`devtools:${key}`, value)
  },
}

await startDevtools(agent, { stateStore })
```

## Notes

- DevTools is for development only -- do not enable in production
- Install as `devDependencies` (the `-D` flag)
- Default port is 4800; change it with the `port` option if occupied
