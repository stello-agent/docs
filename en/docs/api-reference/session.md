# @stello-ai/session

The foundational session package providing memory-aware conversation units, LLM adapters, storage interfaces, and tool definitions.

## Session

A memory-aware conversation unit. Receives a message, assembles context, makes a single LLM call, stores L3, and returns the response.

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

| Method | Description |
|--------|-------------|
| `send` | Send a message: assemble context, call LLM, store L3, return result |
| `stream` | Stream send: outputs chunks incrementally, auto-stores L3 when done |
| `messages` | Read L3 conversation records with pagination and role filtering |
| `systemPrompt` | Read the system prompt |
| `setSystemPrompt` | Update system prompt (persisted to storage) |
| `insight` | Read insights pushed by Main Session via integration |
| `setInsight` | Write insights (called by the integration cycle) |
| `memory` | Read L2 (skill description) |
| `consolidate` | L3 to L2 distillation, triggered by the orchestration layer |
| `trimRecords` | Trim old L3 records, keeping the most recent N |
| `fork` | Derive a child Session with one-time context inheritance |
| `updateMeta` | Update metadata (label, tags, metadata) |
| `archive` | Archive the current Session |
| `setLLM` | Dynamically replace the LLM adapter, takes effect immediately |

## MainSession

The global awareness layer conversation unit. Key differences from Session: uses synthesis instead of insights, and actively pushes to child Sessions via integrate.

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

| Method | Description |
|--------|-------------|
| `send` | Assemble context (system prompt + synthesis + L3 + msg), call LLM, store L3 |
| `stream` | Stream send |
| `synthesis` | Read synthesis -- the output of the integration cycle |
| `integrate` | Execute integration: collect child L2s, run IntegrateFn, save synthesis + push insights |

## Factory Functions

```typescript
function createSession(options: CreateSessionOptions): Promise<Session>
function loadSession(id: string, options: LoadSessionOptions): Promise<Session>
function createMainSession(options: CreateMainSessionOptions): Promise<MainSession>
function loadMainSession(id: string, options: LoadMainSessionOptions): Promise<MainSession>
```

### CreateSessionOptions

| Field | Type | Description |
|-------|------|-------------|
| `storage` | `SessionStorage` | Storage adapter (required) |
| `llm` | `LLMAdapter` | LLM adapter |
| `label` | `string` | Session label |
| `systemPrompt` | `string` | System prompt |
| `tags` | `string[]` | Initial tags |
| `metadata` | `Record<string, unknown>` | Initial metadata |
| `tools` | `ToolSchema[]` | Available tool definitions |

### LoadSessionOptions

| Field | Type | Description |
|-------|------|-------------|
| `storage` | `SessionStorage` | Storage adapter (required) |
| `llm` | `LLMAdapter` | LLM adapter |
| `systemPrompt` | `string` | System prompt (overrides saved value) |
| `tools` | `ToolSchema[]` | Available tool definitions |

`CreateMainSessionOptions` and `LoadMainSessionOptions` share the same structure, but the `storage` field requires the `MainStorage` type.

## Types

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

## LLM Adapters

### High-level Factories (Recommended)

```typescript
function createClaude(options: ClaudeOptions): LLMAdapter
function createGPT(options: GPTOptions): LLMAdapter
```

| Factory | Supported Models |
|---------|-----------------|
| `createClaude` | `claude-opus-4-20250514`, `claude-sonnet-4-20250514`, `claude-haiku-4-5-20251001` |
| `createGPT` | `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `o3`, `o3-mini`, `o4-mini` |

### Low-level Factories (Custom Models)

```typescript
function createOpenAICompatibleAdapter(options: OpenAICompatibleOptions): LLMAdapter
function createAnthropicAdapter(options: AnthropicAdapterOptions): LLMAdapter
```

| Option | Common Fields |
|--------|--------------|
| `apiKey` | API key |
| `model` | Model name |
| `maxContextTokens` | Context window size (in tokens) |
| `baseURL` | API endpoint |

`OpenAICompatibleOptions` additionally supports `extraBody` for provider-specific parameters.

### LLMAdapter Interface

```typescript
interface LLMAdapter {
  complete(messages: Message[], options?: LLMCompleteOptions): Promise<LLMResult>
  stream?(messages: Message[], options?: LLMCompleteOptions): AsyncIterable<LLMChunk>
  maxContextTokens: number
}
```

## Storage Interfaces

### SessionStorage

Data operations interface for a single Session. See the [Storage Adapters](/en/docs/guides/storage-adapters) for details.

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

Extends SessionStorage with batch L2 collection, topology tree operations, Session listing, and global key-value storage.

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

In-memory storage implementation satisfying the `MainStorage` interface. Suitable for testing and rapid prototyping.

```typescript
import { InMemoryStorageAdapter } from '@stello-ai/session'

const storage = new InMemoryStorageAdapter()
```

## Tool Definition

### tool() Factory

Define type-safe tools using Zod schemas.

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

Create the built-in Session management tool.

```typescript
import { createSessionTool } from '@stello-ai/session'
```

### Tool Interface

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
