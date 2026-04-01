# @stello-ai/core 配置

StelloAgentConfig 及其所有嵌套接口的完整参考。

## StelloAgentConfig

顶层配置，传入 `createStelloAgent()` 创建 Agent。

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

| 字段 | 必填 | 说明 |
|------|------|------|
| `sessions` | 是 | 拓扑树管理器 |
| `memory` | 是 | 记忆引擎 |
| `session` | 否 | Session 组件接入配置 |
| `capabilities` | 是 | 能力注入配置 |
| `runtime` | 否 | 运行时配置 |
| `orchestration` | 否 | 编排层配置 |

## StelloAgentSessionConfig

将 `@stello-ai/session` 的 Session / MainSession 接入 core 的 Engine 体系。

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

| 字段 | 说明 |
|------|------|
| `sessionResolver` | 按 sessionId 解析真实 Session 实例 |
| `mainSessionResolver` | 解析 MainSession，仅在需要 integration 时提供 |
| `consolidateFn` | Session L3 → L2 的提炼函数 |
| `integrateFn` | MainSession integration 函数 |
| `serializeSendResult` | send() 结果序列化方式，默认 JSON |
| `toolCallParser` | TurnRunner 用的 tool call 解析器，默认 `sessionSendResultParser` |
| `options` | 预留给 Session 组件的透传配置 |

::: tip
如果提供了 `sessionResolver` + `consolidateFn`，core 会自动构建 `runtime.resolver`。如果同时手动提供了 `runtime.resolver`，手动配置优先。
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

| 字段 | 说明 |
|------|------|
| `lifecycle` | 生命周期适配器 |
| `tools` | 工具运行时 |
| `skills` | 技能路由 |
| `confirm` | 确认协议 |

### EngineLifecycleAdapter

```typescript
interface EngineLifecycleAdapter {
  bootstrap(sessionId: string): Promise<BootstrapResult>
  afterTurn(sessionId: string, userMsg: TurnRecord, assistantMsg: TurnRecord): Promise<AfterTurnResult>
  prepareChildSpawn(options: CreateSessionOptions): Promise<TopologyNode>
}
```

| 方法 | 说明 |
|------|------|
| `bootstrap` | 进入 Session 时做初始化，返回组装好的上下文和元数据 |
| `afterTurn` | 每轮结束后处理：提取 L1、更新 memory、追加 L3 |
| `prepareChildSpawn` | fork 子 Session 前准备：创建文件夹、元数据、拓扑节点 |

### EngineToolRuntime

```typescript
interface EngineToolRuntime {
  getToolDefinitions(): ToolDefinition[]
  executeTool(name: string, args: Record<string, unknown>): Promise<ToolExecutionResult>
}
```

| 方法 | 说明 |
|------|------|
| `getToolDefinitions` | 返回所有可用工具的定义（名称、描述、参数 schema） |
| `executeTool` | 执行指定工具 |

### ConfirmProtocol

```typescript
interface ConfirmProtocol {
  confirmSplit(proposal: SplitProposal): Promise<TopologyNode>
  dismissSplit(proposal: SplitProposal): Promise<void>
  confirmUpdate(proposal: UpdateProposal): Promise<void>
  dismissUpdate(proposal: UpdateProposal): Promise<void>
}
```

| 方法 | 说明 |
|------|------|
| `confirmSplit` | 确认拆分建议，创建子 Session |
| `dismissSplit` | 拒绝拆分建议 |
| `confirmUpdate` | 确认 L1 字段更新 |
| `dismissUpdate` | 拒绝 L1 字段更新 |

### SkillRouter / Skill

Skill 对齐标准 [Agent Skills](https://agentskills.io/) 模式（lazy-loaded prompt injection）。LLM 通过内置的 `activate_skill` tool 按名称激活 skill，Engine 返回 skill 的 content 作为 tool result。

```typescript
interface SkillRouter {
  register(skill: Skill): void
  get(name: string): Skill | undefined
  getAll(): Skill[]
}

interface Skill {
  name: string          // 唯一名称
  description: string   // LLM 据此判断是否激活
  content: string       // 激活时注入的完整 prompt 内容
}
```

Engine 在有 skill 注册时自动追加 `activate_skill` tool 到 `getToolDefinitions()` 列表，LLM 可通过 tool call 激活 skill。

## StelloAgentRuntimeConfig

```typescript
interface StelloAgentRuntimeConfig {
  resolver: SessionRuntimeResolver
  recyclePolicy?: RuntimeRecyclePolicy
}
```

| 字段 | 说明 |
|------|------|
| `resolver` | Session 运行时解析器 |
| `recyclePolicy` | Engine 回收策略 |

### RuntimeRecyclePolicy

```typescript
interface RuntimeRecyclePolicy {
  idleTtlMs?: number
}
```

| 字段 | 默认值 | 说明 |
|------|-------|------|
| `idleTtlMs` | `0` | 空闲回收延迟（毫秒）。`0` 表示引用归零立即回收；`> 0` 表示延迟回收 |

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

| 字段 | 说明 |
|------|------|
| `strategy` | 编排策略，默认 `MainSessionFlatStrategy` |
| `splitGuard` | 拆分保护守卫 |
| `mainSession` | Scheduler 用的 MainSession，不提供则不做 integration |
| `turnRunner` | 自定义 TurnRunner |
| `scheduler` | 自定义 Scheduler |
| `hooks` | Engine 事件钩子提供者 |

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

所有钩子均为可选，支持同步或异步。

| 钩子 | 上下文 |
|------|--------|
| `onMessageReceived` | `sessionId`、`input` |
| `onAssistantReply` | `sessionId`、`input`、`content`、`rawResponse` |
| `onToolCall` | `sessionId`、`toolCall`（含 name、args） |
| `onToolResult` | `sessionId`、`result`（含 toolName、success、data、error） |
| `onSessionEnter` | `sessionId` |
| `onSessionLeave` | `sessionId` |
| `onRoundStart` | `sessionId`、`input` |
| `onRoundEnd` | `sessionId`、`input`、`turn`（TurnRunnerResult） |
| `onSessionArchive` | `sessionId` |
| `onSessionFork` | `parentId`、`child`（TopologyNode） |
| `onError` | `source`、`error` |

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

**ConsolidationTrigger**：`'manual'` | `'everyNTurns'` | `'onSwitch'` | `'onArchive'` | `'onLeave'`

**IntegrationTrigger**：`'manual'` | `'afterConsolidate'` | `'everyNTurns'` | `'onSwitch'` | `'onArchive'` | `'onLeave'`

### SplitGuard

```typescript
class SplitGuard {
  constructor(sessions: SessionTreeImpl, strategy?: Partial<SplitStrategy>)
  getConfig(): { minTurns: number; cooldownTurns: number }
  updateConfig(patch: Partial<{ minTurns: number; cooldownTurns: number }>): void
  checkCanSplit(sessionId: string): Promise<SplitCheckResult>
}
```

| 参数 | 默认值 | 说明 |
|------|-------|------|
| `minTurns` | `3` | Session 至少对话 N 轮后才允许拆分 |
| `cooldownTurns` | `5` | 两次拆分之间至少间隔 N 轮 |

### TurnRunnerOptions

```typescript
interface TurnRunnerOptions {
  maxToolRounds?: number
  onToolCall?: (toolCall: ToolCall) => Promise<void> | void
  onToolResult?: (result: ToolCallResult) => Promise<void> | void
}
```

| 字段 | 说明 |
|------|------|
| `maxToolRounds` | 最多允许多少轮工具调用 |
| `onToolCall` | 工具调用前的观察回调 |
| `onToolResult` | 工具调用后的观察回调 |

## StelloAgentHotConfig

可通过 `updateConfig()` 在运行时安全修改的配置子集。仅包含值类型字段，不包含函数/对象引用。

```typescript
interface StelloAgentHotConfig {
  runtime?: Partial<RuntimeRecyclePolicy>
  scheduling?: Partial<SchedulerConfig>
  splitGuard?: Partial<{ minTurns: number; cooldownTurns: number }>
}
```
