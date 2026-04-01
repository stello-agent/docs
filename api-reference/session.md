# @stello-ai/session

Session 层基础包，提供有记忆的对话单元、LLM 适配器、存储接口和工具定义。

> `@stello-ai/core` 已 re-export 本包的常用接口，core 用户无需单独安装。

## Session

有记忆的对话单元。每次调用 `send()` 执行：组装上下文 → 单次 LLM 调用 → 存 L3 → 返回响应。Session 不做 tool call 循环（那是编排层的事）。

### send

```typescript
send(content: string): Promise<SendResult>
```

发送一条消息。上下文按固定规则组装：`system prompt → insight → L3 记录 → 用户消息`。当 token 超过上下文窗口 80% 且已有 L2 时，自动切换为压缩模式：`system prompt → insight → L2 → 近期 L3 → 用户消息`。

```typescript
interface SendResult {
  content: string | null         // LLM 文本响应
  toolCalls?: ToolCall[]          // LLM 返回的工具调用（由上层决定是否执行）
  usage?: { promptTokens: number; completionTokens: number }
}
```

### stream

```typescript
stream(content: string): StreamResult
```

流式版本的 send。返回 `AsyncIterable<string>` 逐 chunk 消费，流结束后通过 `result` 获取完整结果。如果 LLMAdapter 未实现 `stream()`，自动退化为 `complete()` + 单次 yield。

```typescript
interface StreamResult extends AsyncIterable<string> {
  result: Promise<SendResult>
}
```

### messages

```typescript
messages(options?: MessageQueryOptions): Promise<Message[]>
```

读取 L3 对话记录。可按 `limit`、`offset`、`role` 过滤。

### systemPrompt / setSystemPrompt

```typescript
systemPrompt(): Promise<string | null>
setSystemPrompt(content: string): Promise<void>
```

读取/更新系统提示词，持久化到 storage。

### insight / setInsight

```typescript
insight(): Promise<string | null>
setInsight(content: string): Promise<void>
```

读取/写入 insight（由 Main Session 的 integration cycle 推送）。`send()` 消费 insight 后会自动 `clearInsight()`。

### memory

```typescript
memory(): Promise<string | null>
```

读取 L2（技能描述）。初始为 null，由 `consolidate()` 写入。

### consolidate

```typescript
consolidate(fn: ConsolidateFn): Promise<void>
```

执行 L3 → L2 提炼。由上层（Scheduler）在合适时机调用，Session 自身不主动触发。

```typescript
type ConsolidateFn = (currentMemory: string | null, messages: Message[]) => Promise<string>
```

### trimRecords

```typescript
trimRecords(keepRecent: number): Promise<void>
```

裁剪旧 L3 记录，仅保留最近 N 条。通常在 consolidate 后调用。

### fork

```typescript
fork(options: ForkOptions): Promise<Session>
```

派生子 Session。一次性继承父 Session 上下文，之后完全独立。

```typescript
interface ForkOptions {
  label: string
  systemPrompt?: string              // 不提供则继承父 Session
  context?: 'none' | 'inherit' | ForkContextFn  // 上下文策略，默认 'none'
  prompt?: string                    // 子 Session 的第一条 assistant 开场消息
  llm?: LLMAdapter                   // 覆盖父 Session 的 LLM
  tools?: LLMCompleteOptions['tools'] // 覆盖父 Session 的工具列表
  tags?: string[]
  metadata?: Record<string, unknown>
}
```

`context` 选项：
- `'none'`（默认）— 子 Session 从空 L3 开始
- `'inherit'` — 拷贝父 Session 的全部 L3
- 函数 — `(parentRecords: Message[]) => Message[]`，自定义转换

### updateMeta / archive / setLLM

```typescript
updateMeta(updates: SessionMetaUpdate): Promise<void>
archive(): Promise<void>
setLLM(adapter: LLMAdapter): void    // 热更新 LLM，立即生效
```

### meta

```typescript
readonly meta: Readonly<SessionMeta>
```

同步读取元数据（内存缓存，始终最新）。

```typescript
interface SessionMeta {
  readonly id: string
  label: string
  role: 'standard' | 'main'
  status: 'active' | 'archived'
  tags: string[]
  metadata: Record<string, unknown>
  createdAt: string    // ISO 8601
  updatedAt: string    // ISO 8601
}
```

## MainSession

全局意识层。与 Session 的关键区别：上下文中 insight 换成 synthesis，`consolidate()` 换成 `integrate()`。

### 与 Session 相同的方法

`send`、`stream`、`messages`、`systemPrompt`、`setSystemPrompt`、`trimRecords`、`updateMeta`、`archive`、`setLLM` — 签名和行为相同，但上下文组装规则不同：`system prompt → synthesis → L3 → 用户消息`。

### synthesis

```typescript
synthesis(): Promise<string | null>
```

读取 synthesis — integration cycle 的产出，是 Main Session 的"全局视野"。

### integrate

```typescript
integrate(fn: IntegrateFn): Promise<IntegrateResult>
```

执行 integration cycle：通过 `getAllSessionL2s()` 收集所有子 Session 的 L2，调用 IntegrateFn 生成 synthesis + insights，原子写入存储。

```typescript
type IntegrateFn = (
  children: ChildL2Summary[],
  currentSynthesis: string | null,
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

### MainSession 没有的方法

- 没有 `insight()` / `setInsight()` — Main Session 是 insight 的推送方，不是接收方
- 没有 `memory()` — 取而代之的是 `synthesis()`
- 没有 `consolidate()` — 取而代之的是 `integrate()`
- 没有 `fork()` — 子 Session 的创建由编排层通过 `forkSession()` 完成

## 工厂函数

### createSession

```typescript
async function createSession(options: CreateSessionOptions): Promise<Session>
```

创建新 Session，自动生成 ID 并写入 storage。

```typescript
interface CreateSessionOptions {
  storage: SessionStorage     // 必填
  llm?: LLMAdapter
  label?: string
  systemPrompt?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  tools?: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>
}
```

### loadSession

```typescript
async function loadSession(id: string, options: LoadSessionOptions): Promise<Session | null>
```

从 storage 加载已有 Session。不存在返回 null。

```typescript
interface LoadSessionOptions {
  storage: SessionStorage     // 必填
  llm?: LLMAdapter
  systemPrompt?: string
  tools?: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>
}
```

### createMainSession

```typescript
async function createMainSession(options: CreateMainSessionOptions): Promise<MainSession>
```

创建 Main Session。需要 `MainStorage`（而非 `SessionStorage`）。

### loadMainSession

```typescript
async function loadMainSession(id: string, options: LoadMainSessionOptions): Promise<MainSession | null>
```

从 storage 加载已有 Main Session。

## LLM 适配器

### LLMAdapter 接口

```typescript
interface LLMAdapter {
  complete(messages: Message[], options?: LLMCompleteOptions): Promise<LLMResult>
  stream?(messages: Message[], options?: LLMCompleteOptions): AsyncIterable<LLMChunk>
  maxContextTokens: number
}
```

- `complete` — 必须实现。发送消息数组，返回完整响应
- `stream` — 可选。未实现时 Session 自动退化为 complete + 单次 yield
- `maxContextTokens` — 用于自动压缩判断（80% 阈值）

### createClaude

```typescript
function createClaude(options: ClaudeOptions): LLMAdapter
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `model` | `ClaudeModel` | `'claude-opus-4-20250514'` \| `'claude-sonnet-4-20250514'` \| `'claude-haiku-4-5-20251001'` |
| `apiKey` | string | Anthropic API Key |
| `baseURL` | string? | 自定义端点 |

所有模型的 maxContextTokens 自动设为 200,000。需要安装 `@anthropic-ai/sdk`。

### createGPT

```typescript
function createGPT(options: GPTOptions): LLMAdapter
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `model` | `GPTModel` | `'gpt-4o'` \| `'gpt-4o-mini'` \| `'gpt-4.1'` \| `'gpt-4.1-mini'` \| `'gpt-4.1-nano'` \| `'o3'` \| `'o3-mini'` \| `'o4-mini'` |
| `apiKey` | string | OpenAI API Key |
| `baseURL` | string? | 自定义端点 |

maxContextTokens 按模型自动设置（gpt-4o: 128K, gpt-4.1 系列: ~1M, o3/o4: 200K）。需要安装 `openai`。

### createOpenAICompatibleAdapter

```typescript
function createOpenAICompatibleAdapter(options: OpenAICompatibleOptions): LLMAdapter
```

通用 OpenAI 协议适配器，可对接 MiniMax、DeepSeek 等。需要手动指定 `maxContextTokens` 和 `baseURL`。支持 `extraBody` 传递供应商特有参数。

### createAnthropicAdapter

```typescript
function createAnthropicAdapter(options: AnthropicAdapterOptions): LLMAdapter
```

底层 Anthropic 协议适配器。与 `createClaude` 的区别：需要手动指定 `model` 和 `maxContextTokens`，适合自定义模型名。

## Message

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: ToolCall[]      // 仅 assistant 消息
  toolCallId?: string         // 仅 tool 消息
  timestamp?: string          // ISO 8601
}

interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}
```

## 存储接口

### SessionStorage

普通 Session 使用的存储接口。

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

Main Session + 编排层使用的存储接口，extends SessionStorage。

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

### InMemoryStorageAdapter

```typescript
class InMemoryStorageAdapter implements MainStorage
```

完整的内存存储实现，实现了 MainStorage 全部方法。适合快速上手和测试，重启后数据丢失。生产环境请使用 `@stello-ai/server` 的 PostgreSQL 实现。

## 工具定义

### tool

```typescript
function tool<S extends ZodRawShape>(
  name: string,
  description: string,
  inputSchema: S,
  execute: (input: z.infer<z.ZodObject<S>>) => Promise<CallToolResult>,
  extras?: { annotations?: ToolAnnotations },
): Tool<S>
```

基于 Zod schema 的工具定义工厂。示例：

```typescript
import { tool } from '@stello-ai/session'
import { z } from 'zod'

const searchTool = tool(
  'search',
  '搜索知识库',
  { query: z.string().describe('搜索关键词') },
  async (input) => {
    const results = await search(input.query)
    return { output: results }
  },
)
```

### createSessionTool

```typescript
function createSessionTool(getParent: () => Session): Tool
```

内置的 `stello_create_session` 工具。调用 `session.fork()` 创建子 Session。

输入参数：`{ label: string, systemPrompt?: string, prompt?: string }`

返回：`{ sessionId: string, label: string }`

## 错误类型

```typescript
class SessionArchivedError extends Error  // 向已归档 Session 发送消息时抛出
class NotImplementedError extends Error    // 调用未实现的方法时抛出
```
