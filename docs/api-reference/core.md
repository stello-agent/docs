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

### turn

```typescript
turn(sessionId: string, input: string, options?: TurnRunnerOptions): Promise<EngineTurnResult>
```

在指定 Session 上运行一轮对话，包含完整的 tool call 循环。

| 参数 | 说明 |
|------|------|
| `sessionId` | 目标 Session ID |
| `input` | 用户输入 |
| `options.maxToolRounds` | 最多允许多少轮工具调用 |

返回值：

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
forkSession(sessionId: string, options: Omit<CreateSessionOptions, 'parentId'>): Promise<TopologyNode>
```

从指定 Session 派生子 Session，创建拓扑树节点。

### archiveSession

```typescript
archiveSession(sessionId: string): Promise<void>
```

归档指定 Session，触发调度（如 onArchive consolidation）。

### attachSession

```typescript
attachSession(sessionId: string, holderId: RuntimeHolderId): Promise<OrchestratorEngine>
```

显式附着一个 Session runtime。常用于 WebSocket 连接建立时，保持 Engine 活跃。

### detachSession

```typescript
detachSession(sessionId: string, holderId: RuntimeHolderId): Promise<void>
```

释放一个 Session runtime 持有者。常用于 WebSocket 断开时。引用归零后根据 recyclePolicy 决定是否回收。

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

热更新运行时配置。支持的字段参阅[核心能力 - 热更新](/docs/capabilities/#热更新)。

## 公开属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `config` | `StelloAgentConfig` | 归一化后的顶层配置 |
| `sessions` | `SessionTree` | 拓扑树查询接口 |
| `memory` | `MemoryEngine` | 数据读写接口 |

## 从 @stello-ai/session 重新导出

`@stello-ai/core` 重新导出了 session 包的常用接口，core 用户无需额外安装 `@stello-ai/session`：

- 工厂函数：`createSession`、`loadSession`、`createMainSession`、`loadMainSession`
- LLM 适配器：`createClaude`、`createGPT`、`createOpenAICompatibleAdapter`、`createAnthropicAdapter`
- 存储：`InMemoryStorageAdapter`
- 工具：`tool`、`createSessionTool`
- 所有相关类型：`Session`、`MainSession`、`SendResult`、`StreamResult`、`Message`、`LLMAdapter` 等
