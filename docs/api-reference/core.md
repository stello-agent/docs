# @stello-ai/core

编排层核心包，提供 StelloAgent 顶层对象和 Engine / Scheduler / Orchestrator 体系。

## createStelloAgent

```typescript
function createStelloAgent(config: StelloAgentConfig): StelloAgent
```

创建 StelloAgent 实例。配置详情参阅[配置参考](/docs/api-reference/core-configuration)。

## StelloAgent 方法

### enterSession

```typescript
enterSession(sessionId: string): Promise<BootstrapResult>
```

进入指定 Session，执行 bootstrap（读取上下文、组装记忆）。

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

在指定 Session 上运行一轮对话，包含完整的 tool call 循环。同一 Session 的 turn 调用是串行的（排队执行），不同 Session 之间并行。

```typescript
interface EngineTurnResult {
  turn: TurnRunnerResult
}

interface TurnRunnerResult {
  finalContent: string | null   // LLM 最终文本输出
  toolRoundCount: number         // tool call 循环轮数
  toolCallsExecuted: number      // 执行的 tool call 总数
  rawResponse: string            // LLM 原始响应
}
```

### stream

```typescript
stream(sessionId: string, input: string, options?: TurnRunnerOptions): Promise<EngineStreamResult>
```

流式运行一轮对话。返回 `AsyncIterable<string>` 用于逐 chunk 消费，通过 `result` 属性获取最终结果。

```typescript
interface EngineStreamResult extends AsyncIterable<string> {
  result: Promise<EngineTurnResult>
}
```

### leaveSession

```typescript
leaveSession(sessionId: string): Promise<{ sessionId: string }>
```

离开指定 Session，触发调度（如 onLeave consolidation）。

### forkSession

```typescript
forkSession(
  sessionId: string,
  options: Omit<CreateSessionOptions, 'parentId'>
): Promise<TopologyNode>
```

从指定 Session 派生子 Session。实际挂载位置由 `OrchestrationStrategy.resolveForkParent()` 决定。

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

归档指定 Session，触发调度（如 onArchive consolidation）。

### attachSession

```typescript
attachSession(sessionId: string, holderId: RuntimeHolderId): Promise<OrchestratorEngine>
```

显式附着一个 Session runtime。常用于 WebSocket 连接建立时，保持 Engine 活跃不被回收。

### detachSession

```typescript
detachSession(sessionId: string, holderId: RuntimeHolderId): Promise<void>
```

释放一个 Session runtime 持有者。常用于 WebSocket 断开时。引用归零后根据 `recyclePolicy.idleTtlMs` 决定是否回收。

### hasActiveEngine

```typescript
hasActiveEngine(sessionId: string): boolean
```

检查当前是否已激活某个 Session 的 Engine。

### getEngineRefCount

```typescript
getEngineRefCount(sessionId: string): number
```

获取某个 Session 的 Engine 引用计数。

### updateConfig

```typescript
updateConfig(patch: StelloAgentHotConfig): void
```

热更新运行时配置，无需重建 Agent。

```typescript
interface StelloAgentHotConfig {
  runtime?: Partial<RuntimeRecyclePolicy>
  scheduling?: Partial<SchedulerConfig>
  splitGuard?: Partial<{ minTurns: number; cooldownTurns: number }>
}
```

## 公开属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `config` | `StelloAgentConfig` | 归一化后的顶层配置 |
| `sessions` | `SessionTree` | 拓扑树查询接口 |
| `memory` | `MemoryEngine` | 记忆引擎读写接口 |

## 核心类

除 StelloAgent 外，core 包还导出以下可独立使用的类：

### Scheduler

调度器，控制 consolidation / integration 的触发时机。

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

Tool call 循环执行器。

```typescript
class TurnRunner {
  constructor(parser: ToolCallParser)
  run(session, input, tools, options?): Promise<TurnRunnerResult>
  runStream(session, input, tools, options?): TurnRunnerStreamResult
}
```

### SplitGuard

拆分保护，防止 Session 过早或过频繁地拆分。

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

Skill 注册表实现。

```typescript
class SkillRouterImpl implements SkillRouter {
  register(skill: Skill): void
  get(name: string): Skill | undefined
  getAll(): Skill[]
}
```

### SessionTreeImpl

文件系统上的拓扑树实现。

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

Node.js 文件系统适配器。

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

### 编排策略

```typescript
class MainSessionFlatStrategy implements OrchestrationStrategy {
  resolveForkParent(source, sessions): Promise<string>
}

class HierarchicalOkrStrategy implements OrchestrationStrategy {
  resolveForkParent(): Promise<string>  // 尚未实现
}
```

### Skill Tool 工具函数

Engine 在有 skill 注册时自动使用这些函数，通常不需要手动调用。

```typescript
// 根据已注册 skills 生成 activate_skill tool 定义
function createSkillToolDefinition(router: SkillRouter): ToolDefinition

// 执行 skill 激活：按 name 查找并返回 content
function executeSkillTool(router: SkillRouter, args: { name: string }): ToolExecutionResult
```

### LLM 默认实现

```typescript
function createDefaultConsolidateFn(prompt: string, llm: LLMCallFn): SessionCompatibleConsolidateFn
function createDefaultIntegrateFn(prompt: string, llm: LLMCallFn): SessionCompatibleIntegrateFn

type LLMCallFn = (messages: Array<{ role: string; content: string }>) => Promise<string>

const DEFAULT_CONSOLIDATE_PROMPT: string
const DEFAULT_INTEGRATE_PROMPT: string
```

### Session Runtime 适配器

将 `@stello-ai/session` 的 Session / MainSession 适配为 core Engine 可消费的接口。

```typescript
// 适配 Session → EngineRuntimeSession
function adaptSessionToEngineRuntime(
  session: SessionCompatible,
  options: SessionRuntimeAdapterOptions,
): Promise<EngineRuntimeSession>

// 适配 MainSession → SchedulerMainSession
function adaptMainSessionToSchedulerMainSession(
  mainSession: MainSessionCompatible,
  options: MainSessionAdapterOptions,
): SchedulerMainSession

// Session send 结果的默认序列化器
function serializeSessionSendResult(result: SessionCompatibleSendResult): string

// Session send 结果的默认 ToolCallParser
const sessionSendResultParser: ToolCallParser

// SessionCompatible tool calls → core ToolCall 格式转换
function toCoreToolCalls(toolCalls): Array<{ id: string; name: string; args: Record<string, unknown> }>
```

## 从 @stello-ai/session 重新导出

`@stello-ai/core` 重新导出了 session 包的常用接口，core 用户无需额外安装 `@stello-ai/session`。

完整的接口说明和用法请参阅 [@stello-ai/session API 参考](/docs/api-reference/session)。

**工厂函数**：`createSession`、`loadSession`、`createMainSession`、`loadMainSession`

**LLM 适配器**：`createClaude`、`createGPT`、`createOpenAICompatibleAdapter`、`createAnthropicAdapter`

**存储**：`InMemoryStorageAdapter`

**工具**：`tool`、`createSessionTool`

**类型**：`Session`、`MainSession`、`SendResult`、`StreamResult`、`Message`、`ToolCall`、`LLMAdapter`、`LLMResult`、`LLMChunk`、`LLMCompleteOptions`、`SessionStorage`、`MainStorage`、`ConsolidateFn`、`IntegrateFn`、`IntegrateResult`、`ChildL2Summary` 等
