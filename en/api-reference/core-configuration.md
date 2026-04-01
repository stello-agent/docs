# @stello-ai/core Configuration

Complete reference for StelloAgentConfig and all its nested interfaces.

## StelloAgentConfig

Top-level configuration passed to `createStelloAgent()`.

```typescript
interface StelloAgentConfig {
  sessions: SessionTree
  memory: MemoryEngine
  session?: StelloAgentSessionConfig
  capabilities: StelloAgentCapabilitiesConfig
  runtime?: StelloAgentRuntimeConfig
  orchestration?: StelloAgentOrchestrationConfig
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `sessions` | Yes | Topology tree manager |
| `memory` | Yes | Memory engine |
| `session` | No | Session component integration config |
| `capabilities` | Yes | Capability injection config |
| `runtime` | No | Runtime config |
| `orchestration` | No | Orchestration layer config |

## StelloAgentSessionConfig

Connect `@stello-ai/session` Session / MainSession into the core Engine system.

```typescript
interface StelloAgentSessionConfig {
  sessionResolver?: (sessionId: string) => Promise<SessionCompatible>
  mainSessionResolver?: () => Promise<MainSessionCompatible | null>
  consolidateFn?: SessionCompatibleConsolidateFn
  integrateFn?: SessionCompatibleIntegrateFn
  serializeSendResult?: (result: SessionCompatibleSendResult) => string
  toolCallParser?: ToolCallParser
  options?: Record<string, unknown>
}
```

| Field | Description |
|-------|-------------|
| `sessionResolver` | Resolve a real Session instance by sessionId |
| `mainSessionResolver` | Resolve the MainSession; only needed when integration is required |
| `consolidateFn` | Session L3 to L2 distillation function |
| `integrateFn` | MainSession integration function |
| `serializeSendResult` | Serialization for send() results, defaults to JSON |
| `toolCallParser` | Tool call parser for TurnRunner, defaults to `sessionSendResultParser` |
| `options` | Pass-through config reserved for the Session component |

::: tip
If `sessionResolver` + `consolidateFn` are provided, core will automatically build `runtime.resolver`. If `runtime.resolver` is also provided manually, the manual config takes precedence.
:::

## StelloAgentCapabilitiesConfig

```typescript
interface StelloAgentCapabilitiesConfig {
  lifecycle: EngineLifecycleAdapter
  tools: EngineToolRuntime
  skills: SkillRouter
  confirm: ConfirmProtocol
}
```

| Field | Description |
|-------|-------------|
| `lifecycle` | Lifecycle adapter |
| `tools` | Tool runtime |
| `skills` | Skill router |
| `confirm` | Confirm protocol |

### EngineLifecycleAdapter

```typescript
interface EngineLifecycleAdapter {
  bootstrap(sessionId: string): Promise<BootstrapResult>
  afterTurn(sessionId: string, userMsg: TurnRecord, assistantMsg: TurnRecord): Promise<AfterTurnResult>
  prepareChildSpawn(options: CreateSessionOptions): Promise<TopologyNode>
}
```

| Method | Description |
|--------|-------------|
| `bootstrap` | Initialize when entering a Session; returns assembled context and metadata |
| `afterTurn` | Post-turn processing: extract L1, update memory, append L3 |
| `prepareChildSpawn` | Prepare before forking: create folder, metadata, topology node |

### EngineToolRuntime

```typescript
interface EngineToolRuntime {
  getToolDefinitions(): ToolDefinition[]
  executeTool(name: string, args: Record<string, unknown>): Promise<ToolExecutionResult>
}
```

| Method | Description |
|--------|-------------|
| `getToolDefinitions` | Return all available tool definitions (name, description, parameter schema) |
| `executeTool` | Execute a named tool |

### ConfirmProtocol

```typescript
interface ConfirmProtocol {
  confirmSplit(proposal: SplitProposal): Promise<TopologyNode>
  dismissSplit(proposal: SplitProposal): Promise<void>
  confirmUpdate(proposal: UpdateProposal): Promise<void>
  dismissUpdate(proposal: UpdateProposal): Promise<void>
}
```

| Method | Description |
|--------|-------------|
| `confirmSplit` | Confirm a split proposal, creating a child Session |
| `dismissSplit` | Dismiss a split proposal |
| `confirmUpdate` | Confirm an L1 field update |
| `dismissUpdate` | Dismiss an L1 field update |

### SkillRouter / Skill

Skills follow the standard [Agent Skills](https://agentskills.io/) pattern (lazy-loaded prompt injection). The LLM activates a skill by name via the built-in `activate_skill` tool, and the Engine returns the skill's content as the tool result.

```typescript
interface SkillRouter {
  register(skill: Skill): void
  get(name: string): Skill | undefined
  getAll(): Skill[]
}

interface Skill {
  name: string          // unique name
  description: string   // LLM uses this to decide whether to activate
  content: string       // full prompt content injected on activation
}
```

When skills are registered, the Engine automatically appends an `activate_skill` tool to `getToolDefinitions()`, allowing the LLM to activate skills via tool calls.

## StelloAgentRuntimeConfig

```typescript
interface StelloAgentRuntimeConfig {
  resolver: SessionRuntimeResolver
  recyclePolicy?: RuntimeRecyclePolicy
}
```

| Field | Description |
|-------|-------------|
| `resolver` | Session runtime resolver |
| `recyclePolicy` | Engine recycling policy |

### RuntimeRecyclePolicy

```typescript
interface RuntimeRecyclePolicy {
  idleTtlMs?: number
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `idleTtlMs` | `0` | Idle recycling delay (ms). `0` means immediate recycling when ref count reaches zero; `> 0` means delayed recycling |

## StelloAgentOrchestrationConfig

```typescript
interface StelloAgentOrchestrationConfig {
  strategy?: OrchestrationStrategy
  splitGuard?: SplitGuard
  mainSession?: SchedulerMainSession | null
  turnRunner?: TurnRunner
  scheduler?: Scheduler
  hooks?: EngineHookProvider
}
```

| Field | Description |
|-------|-------------|
| `strategy` | Orchestration strategy, defaults to `MainSessionFlatStrategy` |
| `splitGuard` | Split protection guard |
| `mainSession` | MainSession for the Scheduler; omit to skip integration |
| `turnRunner` | Custom TurnRunner |
| `scheduler` | Custom Scheduler |
| `hooks` | Engine event hook provider |

### EngineHooks

```typescript
interface EngineHooks {
  onMessageReceived(ctx: { sessionId: string; input: string }): Promise<void> | void
  onAssistantReply(ctx: { sessionId: string; input: string; content: string | null; rawResponse: string }): Promise<void> | void
  onToolCall(ctx: { sessionId: string; toolCall: ToolCall }): Promise<void> | void
  onToolResult(ctx: { sessionId: string; result: ToolCallResult }): Promise<void> | void
  onSessionEnter(ctx: { sessionId: string }): Promise<void> | void
  onSessionLeave(ctx: { sessionId: string }): Promise<void> | void
  onRoundStart(ctx: EngineRoundContext): Promise<void> | void
  onRoundEnd(ctx: EngineRoundResultContext): Promise<void> | void
  onSessionArchive(ctx: { sessionId: string }): Promise<void> | void
  onSessionFork(ctx: { parentId: string; child: TopologyNode }): Promise<void> | void
  onError(ctx: { source: string; error: Error }): Promise<void> | void
}
```

All hooks are optional and support both synchronous and asynchronous execution.

| Hook | Context |
|------|---------|
| `onMessageReceived` | `sessionId`, `input` |
| `onAssistantReply` | `sessionId`, `input`, `content`, `rawResponse` |
| `onToolCall` | `sessionId`, `toolCall` (with name, args) |
| `onToolResult` | `sessionId`, `result` (with toolName, success, data, error) |
| `onSessionEnter` | `sessionId` |
| `onSessionLeave` | `sessionId` |
| `onRoundStart` | `sessionId`, `input` |
| `onRoundEnd` | `sessionId`, `input`, `turn` (TurnRunnerResult) |
| `onSessionArchive` | `sessionId` |
| `onSessionFork` | `parentId`, `child` (TopologyNode) |
| `onError` | `source`, `error` |

### SchedulerConfig

```typescript
interface SchedulerConfig {
  consolidation?: ConsolidationPolicy
  integration?: IntegrationPolicy
}

interface ConsolidationPolicy {
  trigger: ConsolidationTrigger
  everyNTurns?: number
}

interface IntegrationPolicy {
  trigger: IntegrationTrigger
  everyNTurns?: number
}
```

**ConsolidationTrigger**: `'manual'` | `'everyNTurns'` | `'onSwitch'` | `'onArchive'` | `'onLeave'`

**IntegrationTrigger**: `'manual'` | `'afterConsolidate'` | `'everyNTurns'` | `'onSwitch'` | `'onArchive'` | `'onLeave'`

### SplitGuard

```typescript
class SplitGuard {
  constructor(sessions: SessionTreeImpl, strategy?: Partial<SplitStrategy>)
  getConfig(): { minTurns: number; cooldownTurns: number }
  updateConfig(patch: Partial<{ minTurns: number; cooldownTurns: number }>): void
  checkCanSplit(sessionId: string): Promise<SplitCheckResult>
}
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `minTurns` | `3` | Minimum turns before a Session can split |
| `cooldownTurns` | `5` | Minimum turns between two splits |

### TurnRunnerOptions

```typescript
interface TurnRunnerOptions {
  maxToolRounds?: number
  onToolCall?: (toolCall: ToolCall) => Promise<void> | void
  onToolResult?: (result: ToolCallResult) => Promise<void> | void
}
```

| Field | Description |
|-------|-------------|
| `maxToolRounds` | Maximum number of tool call rounds |
| `onToolCall` | Observer callback before each tool call |
| `onToolResult` | Observer callback after each tool call |

## StelloAgentHotConfig

Configuration subset that can be safely modified at runtime via `updateConfig()`. Only includes value-type fields, not function/object references.

```typescript
interface StelloAgentHotConfig {
  runtime?: Partial<RuntimeRecyclePolicy>
  scheduling?: Partial<SchedulerConfig>
  splitGuard?: Partial<{ minTurns: number; cooldownTurns: number }>
}
```
