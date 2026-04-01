# @stello-ai/core

The core orchestration package providing the StelloAgent top-level object and the Engine / Scheduler / Orchestrator system.

## createStelloAgent

```typescript
function createStelloAgent(config: StelloAgentConfig): StelloAgent
```

Creates a StelloAgent instance. See [Configuration Reference](/en/api-reference/core-configuration) for config details.

## StelloAgent Methods

### enterSession

```typescript
enterSession(sessionId: string): Promise<BootstrapResult>
```

Enter a Session, executing bootstrap (reading context, assembling memory).

```typescript
interface BootstrapResult {
  context: AssembledContext
  session: SessionMeta
}
```

### turn

```typescript
turn(sessionId: string, input: string, options?: TurnRunnerOptions): Promise<EngineTurnResult>
```

Run a full conversation turn on a Session, including the complete tool call loop. Turns on the same Session are serialized (queued); different Sessions run in parallel.

```typescript
interface EngineTurnResult {
  turn: TurnRunnerResult
}

interface TurnRunnerResult {
  finalContent: string | null   // LLM final text output
  toolRoundCount: number         // tool call loop rounds
  toolCallsExecuted: number      // total tool calls executed
  rawResponse: string            // LLM raw response
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
forkSession(
  sessionId: string,
  options: Omit<CreateSessionOptions, 'parentId'>
): Promise<TopologyNode>
```

Fork a child Session. The actual parent node is determined by `OrchestrationStrategy.resolveForkParent()`.

```typescript
interface CreateSessionOptions {
  parentId: string
  label: string
  scope?: string
  metadata?: Record<string, unknown>
  tags?: string[]
}
```

### archiveSession

```typescript
archiveSession(sessionId: string): Promise<{ sessionId: string }>
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

Release a Session runtime holder. Commonly used when a WebSocket disconnects. When the reference count reaches zero, recycling behavior depends on `recyclePolicy.idleTtlMs`.

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

Hot-update runtime configuration without rebuilding the Agent.

```typescript
interface StelloAgentHotConfig {
  runtime?: Partial<RuntimeRecyclePolicy>
  scheduling?: Partial<SchedulerConfig>
  splitGuard?: Partial<{ minTurns: number; cooldownTurns: number }>
}
```

## Public Properties

| Property | Type | Description |
|----------|------|-------------|
| `config` | `StelloAgentConfig` | Normalized top-level configuration |
| `sessions` | `SessionTree` | Topology tree query interface |
| `memory` | `MemoryEngine` | Memory engine read/write interface |

## Core Classes

Beyond StelloAgent, the core package also exports these independently usable classes:

### Scheduler

Controls consolidation / integration trigger timing.

```typescript
class Scheduler {
  constructor(config?: SchedulerConfig)
  updateConfig(config: Partial<SchedulerConfig>): void
  getConfig(): SchedulerConfig
  afterTurn(session, mainSession?, context?): Promise<SchedulerResult>
  onSessionSwitch(session, mainSession?): Promise<SchedulerResult>
  onSessionArchive(session, mainSession?): Promise<SchedulerResult>
  onSessionLeave(session, mainSession?): Promise<SchedulerResult>
}
```

### TurnRunner

Tool call loop executor.

```typescript
class TurnRunner {
  constructor(parser: ToolCallParser)
  run(session, input, tools, options?): Promise<TurnRunnerResult>
  runStream(session, input, tools, options?): TurnRunnerStreamResult
}
```

### SplitGuard

Split protection, prevents Sessions from splitting too early or too frequently.

```typescript
class SplitGuard {
  constructor(sessions: SessionTreeImpl, strategy?: Partial<SplitStrategy>)
  getConfig(): { minTurns: number; cooldownTurns: number }
  updateConfig(patch: Partial<{ minTurns: number; cooldownTurns: number }>): void
  checkCanSplit(sessionId: string): Promise<SplitCheckResult>
  recordSplit(sessionId: string, turnCount: number): void
}
```

### SkillRouterImpl

Skill registry implementation.

```typescript
class SkillRouterImpl implements SkillRouter {
  register(skill: Skill): void
  get(name: string): Skill | undefined
  getAll(): Skill[]
}
```

### SessionTreeImpl

File-system based topology tree implementation.

```typescript
class SessionTreeImpl implements SessionTree {
  constructor(fs: FileSystemAdapter)
  createRoot(label?: string): Promise<TopologyNode>
  createChild(options: CreateSessionOptions): Promise<TopologyNode>
  get(id: string): Promise<SessionMeta | null>
  getRoot(): Promise<SessionMeta>
  listAll(): Promise<SessionMeta[]>
  archive(id: string): Promise<void>
  getNode(id: string): Promise<TopologyNode | null>
  getTree(): Promise<SessionTreeNode>
  getAncestors(id: string): Promise<TopologyNode[]>
  getSiblings(id: string): Promise<TopologyNode[]>
  updateMeta(id, updates): Promise<SessionMeta>
  addRef(fromId, toId): Promise<void>
}
```

### NodeFileSystemAdapter

Node.js file system adapter.

```typescript
class NodeFileSystemAdapter implements FileSystemAdapter {
  constructor(basePath: string)
  readJSON<T>(path): Promise<T | null>
  writeJSON(path, data): Promise<void>
  readFile(path): Promise<string | null>
  writeFile(path, content): Promise<void>
  exists(path): Promise<boolean>
  mkdir(path): Promise<void>
  listDirs(path): Promise<string[]>
  appendLine(path, line): Promise<void>
  readLines(path): Promise<string[]>
}
```

### Orchestration Strategies

```typescript
class MainSessionFlatStrategy implements OrchestrationStrategy {
  resolveForkParent(source, sessions): Promise<string>
}

class HierarchicalOkrStrategy implements OrchestrationStrategy {
  resolveForkParent(): Promise<string>  // not yet implemented
}
```

### Skill Tool Functions

Engine automatically uses these when skills are registered. Typically not called manually.

```typescript
// Generate activate_skill tool definition from registered skills
function createSkillToolDefinition(router: SkillRouter): ToolDefinition

// Execute skill activation: find by name and return content
function executeSkillTool(router: SkillRouter, args: { name: string }): ToolExecutionResult
```

### LLM Defaults

```typescript
function createDefaultConsolidateFn(prompt: string, llm: LLMCallFn): SessionCompatibleConsolidateFn
function createDefaultIntegrateFn(prompt: string, llm: LLMCallFn): SessionCompatibleIntegrateFn

type LLMCallFn = (messages: Array<{ role: string; content: string }>) => Promise<string>

const DEFAULT_CONSOLIDATE_PROMPT: string
const DEFAULT_INTEGRATE_PROMPT: string
```

### Session Runtime Adapters

Adapt `@stello-ai/session` Session / MainSession into core Engine-consumable interfaces.

```typescript
// Adapt Session → EngineRuntimeSession
function adaptSessionToEngineRuntime(
  session: SessionCompatible,
  options: SessionRuntimeAdapterOptions,
): Promise<EngineRuntimeSession>

// Adapt MainSession → SchedulerMainSession
function adaptMainSessionToSchedulerMainSession(
  mainSession: MainSessionCompatible,
  options: MainSessionAdapterOptions,
): SchedulerMainSession

// Default serializer for Session send results
function serializeSessionSendResult(result: SessionCompatibleSendResult): string

// Default ToolCallParser for Session send results
const sessionSendResultParser: ToolCallParser

// Convert SessionCompatible tool calls to core ToolCall format
function toCoreToolCalls(toolCalls): Array<{ id: string; name: string; args: Record<string, unknown> }>
```

## Re-exports from @stello-ai/session

`@stello-ai/core` re-exports commonly used interfaces from the session package. Core users don't need to install `@stello-ai/session` separately.

For complete interface documentation and usage, see the [@stello-ai/session API Reference](/en/api-reference/session).

**Factory functions**: `createSession`, `loadSession`, `createMainSession`, `loadMainSession`

**LLM adapters**: `createClaude`, `createGPT`, `createOpenAICompatibleAdapter`, `createAnthropicAdapter`

**Storage**: `InMemoryStorageAdapter`

**Tools**: `tool`, `createSessionTool`

**Types**: `Session`, `MainSession`, `SendResult`, `StreamResult`, `Message`, `ToolCall`, `LLMAdapter`, `LLMResult`, `LLMChunk`, `LLMCompleteOptions`, `SessionStorage`, `MainStorage`, `ConsolidateFn`, `IntegrateFn`, `IntegrateResult`, `ChildL2Summary`, etc.
