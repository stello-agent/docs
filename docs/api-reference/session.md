# @stello-ai/session

Session 层的基础包，提供有记忆的对话单元、LLM 适配器、存储接口和工具定义。

## Session

有记忆的对话单元。接收消息 → 组装上下文 → 单次 LLM 调用 → 存 L3 → 返回响应。

```typescript
interface Session {
  readonly meta: Readonly<SessionMeta>
  send(content: string): Promise<SendResult>
  stream(content: string): StreamResult
  messages(options?: MessageQueryOptions): Promise<Message[]>
  systemPrompt(): Promise<string | null>
  setSystemPrompt(content: string): Promise<void>
  insight(): Promise<string | null>
  setInsight(content: string): Promise<void>
  memory(): Promise<string | null>
  consolidate(fn: ConsolidateFn): Promise<void>
  trimRecords(keepRecent: number): Promise<void>
  fork(options: ForkOptions): Promise<Session>
  updateMeta(updates: SessionMetaUpdate): Promise<void>
  archive(): Promise<void>
  setLLM(adapter: LLMAdapter): void
}
```

| 方法 | 说明 |
|------|------|
| `send` | 发送消息，组装上下文 → 调 LLM → 存 L3 → 返回结果 |
| `stream` | 流式发送，逐 chunk 输出，流结束后自动存 L3 |
| `messages` | 读取 L3 对话记录，支持分页和按 role 过滤 |
| `systemPrompt` | 读取 system prompt |
| `setSystemPrompt` | 更新 system prompt（持久化） |
| `insight` | 读取 Main Session 通过 integration 推送的 insights |
| `setInsight` | 写入 insights（由 integration cycle 调用） |
| `memory` | 读取 L2（技能描述） |
| `consolidate` | L3 → L2 提炼，由上层在合适时机触发 |
| `trimRecords` | 裁剪旧 L3，保留最近 N 条 |
| `fork` | 派生子 Session，一次性继承上下文后独立 |
| `updateMeta` | 更新元数据（label、tags、metadata） |
| `archive` | 归档当前 Session |
| `setLLM` | 动态替换 LLM adapter，立即对后续调用生效 |

## MainSession

全局意识层对话单元。与 Session 的核心区别：使用 synthesis 而非 insights，通过 integrate 主动推送给子 Session。

```typescript
interface MainSession {
  readonly meta: Readonly<SessionMeta>
  send(content: string): Promise<SendResult>
  stream(content: string): StreamResult
  messages(options?: MessageQueryOptions): Promise<Message[]>
  systemPrompt(): Promise<string | null>
  setSystemPrompt(content: string): Promise<void>
  synthesis(): Promise<string | null>
  integrate(fn: IntegrateFn): Promise<IntegrateResult>
  trimRecords(keepRecent: number): Promise<void>
  updateMeta(updates: SessionMetaUpdate): Promise<void>
  archive(): Promise<void>
  setLLM(adapter: LLMAdapter): void
}
```

| 方法 | 说明 |
|------|------|
| `send` | 组装上下文（system prompt + synthesis + L3 + msg）→ 调 LLM → 存 L3 |
| `stream` | 流式发送 |
| `synthesis` | 读取 synthesis — integration cycle 的产出 |
| `integrate` | 执行 integration：收集子 L2 → IntegrateFn → 保存 synthesis + 推送 insights |

## 工厂函数

```typescript
function createSession(options: CreateSessionOptions): Promise<Session>
function loadSession(id: string, options: LoadSessionOptions): Promise<Session>
function createMainSession(options: CreateMainSessionOptions): Promise<MainSession>
function loadMainSession(id: string, options: LoadMainSessionOptions): Promise<MainSession>
```

### CreateSessionOptions

| 字段 | 类型 | 说明 |
|------|------|------|
| `storage` | `SessionStorage` | 存储适配器（必填） |
| `llm` | `LLMAdapter` | LLM 适配器 |
| `label` | `string` | Session 标签 |
| `systemPrompt` | `string` | 系统提示词 |
| `tags` | `string[]` | 初始标签 |
| `metadata` | `Record<string, unknown>` | 初始元数据 |
| `tools` | `ToolSchema[]` | 可用工具定义 |

### LoadSessionOptions

| 字段 | 类型 | 说明 |
|------|------|------|
| `storage` | `SessionStorage` | 存储适配器（必填） |
| `llm` | `LLMAdapter` | LLM 适配器 |
| `systemPrompt` | `string` | 系统提示词（覆盖已保存的值） |
| `tools` | `ToolSchema[]` | 可用工具定义 |

`CreateMainSessionOptions` 和 `LoadMainSessionOptions` 与上述结构相同，但 `storage` 字段要求 `MainStorage` 类型。

## 类型

### SessionMeta

```typescript
interface SessionMeta {
  readonly id: string
  label: string
  role: 'standard' | 'main'
  status: 'active' | 'archived'
  tags: string[]
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
```

### Message

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  toolCallId?: string
  timestamp?: string
}
```

### SendResult

```typescript
interface SendResult {
  content: string | null
  toolCalls?: ToolCall[]
  usage?: { promptTokens: number; completionTokens: number }
}
```

### StreamResult

```typescript
interface StreamResult extends AsyncIterable<string> {
  result: Promise<SendResult>
}
```

### ConsolidateFn / IntegrateFn

```typescript
type ConsolidateFn = (currentMemory: string | null, messages: Message[]) => Promise<string>

type IntegrateFn = (
  children: ChildL2Summary[],
  currentSynthesis: string | null
) => Promise<IntegrateResult>

interface IntegrateResult {
  synthesis: string
  insights: Array<{ sessionId: string; content: string }>
}

interface ChildL2Summary {
  sessionId: string
  label: string
  l2: string
}
```

## LLM 适配器

### 高层工厂（推荐）

```typescript
function createClaude(options: ClaudeOptions): LLMAdapter
function createGPT(options: GPTOptions): LLMAdapter
```

| 工厂 | 支持的模型 |
|------|-----------|
| `createClaude` | `claude-opus-4-20250514`、`claude-sonnet-4-20250514`、`claude-haiku-4-5-20251001` |
| `createGPT` | `gpt-4o`、`gpt-4o-mini`、`gpt-4.1`、`gpt-4.1-mini`、`gpt-4.1-nano`、`o3`、`o3-mini`、`o4-mini` |

### 底层工厂（自定义模型）

```typescript
function createOpenAICompatibleAdapter(options: OpenAICompatibleOptions): LLMAdapter
function createAnthropicAdapter(options: AnthropicAdapterOptions): LLMAdapter
```

| 选项 | 共通字段 |
|------|---------|
| `apiKey` | API 密钥 |
| `model` | 模型名称 |
| `maxContextTokens` | 上下文窗口大小（token 数） |
| `baseURL` | API 端点 |

`OpenAICompatibleOptions` 额外支持 `extraBody` 字段，用于传递提供方特有参数。

### LLMAdapter 接口

```typescript
interface LLMAdapter {
  complete(messages: Message[], options?: LLMCompleteOptions): Promise<LLMResult>
  stream?(messages: Message[], options?: LLMCompleteOptions): AsyncIterable<LLMChunk>
  maxContextTokens: number
}
```

## 存储接口

### SessionStorage

单个 Session 的数据操作接口。详细说明参阅[存储指南](/docs/guide/storage)。

```typescript
interface SessionStorage {
  getSession(id: string): Promise<SessionMeta | null>
  putSession(session: SessionMeta): Promise<void>
  appendRecord(sessionId: string, record: Message): Promise<void>
  listRecords(sessionId: string, options?: ListRecordsOptions): Promise<Message[]>
  trimRecords(sessionId: string, keepRecent: number): Promise<void>
  getSystemPrompt(sessionId: string): Promise<string | null>
  putSystemPrompt(sessionId: string, content: string): Promise<void>
  getInsight(sessionId: string): Promise<string | null>
  putInsight(sessionId: string, content: string): Promise<void>
  clearInsight(sessionId: string): Promise<void>
  getMemory(sessionId: string): Promise<string | null>
  putMemory(sessionId: string, content: string): Promise<void>
  transaction<T>(fn: (tx: SessionStorage) => Promise<T>): Promise<T>
}
```

### MainStorage

继承 SessionStorage，额外提供批量 L2 收集、拓扑树操作、Session 列举和全局键值。

```typescript
interface MainStorage extends SessionStorage {
  getAllSessionL2s(): Promise<ChildL2Summary[]>
  listSessions(filter?: SessionFilter): Promise<SessionMeta[]>
  putNode(node: TopologyNode): Promise<void>
  getChildren(parentId: string): Promise<TopologyNode[]>
  removeNode(nodeId: string): Promise<void>
  getGlobal(key: string): Promise<unknown>
  putGlobal(key: string, value: unknown): Promise<void>
}
```

## InMemoryStorageAdapter

内存版存储实现，同时满足 `MainStorage` 接口。适用于测试和快速原型开发。

```typescript
import { InMemoryStorageAdapter } from '@stello-ai/session'

const storage = new InMemoryStorageAdapter()
```

## 工具定义

### tool() 工厂

通过 Zod schema 定义类型安全的工具。

```typescript
import { z } from 'zod'
import { tool } from '@stello-ai/session'

const myTool = tool(
  'my_tool',
  'Tool description',
  { input: z.string() },
  async (args) => ({ output: args.input })
)
```

### createSessionTool

创建内置的 Session 管理工具。

```typescript
import { createSessionTool } from '@stello-ai/session'
```

### Tool 接口

```typescript
interface Tool<S extends ZodRawShape = ZodRawShape> {
  name: string
  description: string
  inputSchema: z.ZodObject<S>
  execute: (input: z.infer<z.ZodObject<S>>) => Promise<CallToolResult>
  annotations?: ToolAnnotations
}

interface CallToolResult<T = unknown> {
  output: T
  isError?: boolean
}
```
