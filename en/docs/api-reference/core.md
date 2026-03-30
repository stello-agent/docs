# @stello-ai/core

The core orchestration package providing the StelloAgent top-level object and the Engine / Scheduler / Orchestrator system.

## createStelloAgent

```typescript
function createStelloAgent(config: StelloAgentConfig): StelloAgent
```

Creates a StelloAgent instance. See [Configuration Reference](/en/docs/api-reference/core-configuration) for config details.

## StelloAgent Methods

### enterSession

```typescript
enterSession(sessionId: string): Promise<BootstrapResult>
```

Enter a Session, executing bootstrap (reading context, assembling memory).

### turn

```typescript
turn(sessionId: string, input: string, options?: TurnRunnerOptions): Promise<EngineTurnResult>
```

Run a full conversation turn on a Session, including the complete tool call loop.

| Parameter | Description |
|-----------|-------------|
| `sessionId` | Target Session ID |
| `input` | User input |
| `options.maxToolRounds` | Maximum number of tool call rounds |

Return value:

```typescript
interface EngineTurnResult {
  turn: TurnRunnerResult
}

interface TurnRunnerResult {
  finalContent: string | null
  toolRoundCount: number
  toolCallsExecuted: number
  rawResponse: string
}
```

### stream

```typescript
stream(sessionId: string, input: string, options?: TurnRunnerOptions): Promise<EngineStreamResult>
```

Run a streaming conversation turn. Returns an `AsyncIterable<string>` for chunk-by-chunk consumption, with a `result` property for the final result.

```typescript
interface EngineStreamResult extends AsyncIterable<string> {
  result: Promise<EngineTurnResult>
}
```

### leaveSession

```typescript
leaveSession(sessionId: string): Promise<{ sessionId: string }>
```

Leave a Session, triggering scheduling (e.g., onLeave consolidation).

### forkSession

```typescript
forkSession(sessionId: string, options: Omit<CreateSessionOptions, 'parentId'>): Promise<TopologyNode>
```

Fork a child Session from the specified Session, creating a topology tree node.

### archiveSession

```typescript
archiveSession(sessionId: string): Promise<void>
```

Archive a Session, triggering scheduling (e.g., onArchive consolidation).

### attachSession

```typescript
attachSession(sessionId: string, holderId: RuntimeHolderId): Promise<OrchestratorEngine>
```

Explicitly attach a Session runtime. Commonly used when a WebSocket connection is established to keep the Engine active.

### detachSession

```typescript
detachSession(sessionId: string, holderId: RuntimeHolderId): Promise<void>
```

Release a Session runtime holder. Commonly used when a WebSocket disconnects. When the reference count reaches zero, recycling behavior depends on the recyclePolicy.

### hasActiveEngine

```typescript
hasActiveEngine(sessionId: string): boolean
```

Check whether an Engine is currently active for a Session.

### getEngineRefCount

```typescript
getEngineRefCount(sessionId: string): number
```

Get the Engine reference count for a Session.

### updateConfig

```typescript
updateConfig(patch: StelloAgentHotConfig): void
```

Hot-update runtime configuration. See [Capabilities - Hot Config](/en/docs/capabilities/#hot-config) for supported fields.

## Public Properties

| Property | Type | Description |
|----------|------|-------------|
| `config` | `StelloAgentConfig` | Normalized top-level configuration |
| `sessions` | `SessionTree` | Topology tree query interface |
| `memory` | `MemoryEngine` | Data read/write interface |

## Re-exports from @stello-ai/session

`@stello-ai/core` re-exports commonly used interfaces from the session package, so core users do not need to install `@stello-ai/session` separately:

- Factory functions: `createSession`, `loadSession`, `createMainSession`, `loadMainSession`
- LLM adapters: `createClaude`, `createGPT`, `createOpenAICompatibleAdapter`, `createAnthropicAdapter`
- Storage: `InMemoryStorageAdapter`
- Tools: `tool`, `createSessionTool`
- All related types: `Session`, `MainSession`, `SendResult`, `StreamResult`, `Message`, `LLMAdapter`, etc.
