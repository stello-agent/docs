# @stello-ai/session

The foundational session package providing memory-aware conversation units, LLM adapters, storage interfaces, and tool definitions.

> `@stello-ai/core` re-exports commonly used interfaces from this package. Core users don't need to install this separately.

## Session

A memory-aware conversation unit. Each `send()` call: assembles context → single LLM call → stores L3 → returns response. Sessions don't do tool call loops (that's the orchestration layer's job).

### send

```typescript
send(content: string): Promise<SendResult>
```

Send a message. Context is assembled by fixed rules: `system prompt → insight → L3 records → user message`. When tokens exceed 80% of the context window and L2 exists, auto-compression kicks in: `system prompt → insight → L2 → recent L3 → user message`.

```typescript
interface SendResult {
  content: string | null         // LLM text response
  toolCalls?: ToolCall[]          // tool calls returned by LLM (upper layer decides execution)
  usage?: { promptTokens: number; completionTokens: number }
}
```

### stream

```typescript
stream(content: string): StreamResult
```

Streaming version of send. Returns `AsyncIterable<string>` for chunk-by-chunk consumption. Get the full result via `result` after the stream ends. If LLMAdapter doesn't implement `stream()`, degrades to `complete()` + single yield.

```typescript
interface StreamResult extends AsyncIterable<string> {
  result: Promise<SendResult>
}
```

### messages

```typescript
messages(options?: MessageQueryOptions): Promise<Message[]>
```

Read L3 conversation records. Filter by `limit`, `offset`, `role`.

### systemPrompt / setSystemPrompt

```typescript
systemPrompt(): Promise<string | null>
setSystemPrompt(content: string): Promise<void>
```

Read/update system prompt, persisted to storage.

### insight / setInsight

```typescript
insight(): Promise<string | null>
setInsight(content: string): Promise<void>
```

Read/write insight (pushed by Main Session's integration cycle). `send()` auto-clears insight after consuming it.

### memory

```typescript
memory(): Promise<string | null>
```

Read L2 (skill description). Initially null, written by `consolidate()`.

### consolidate

```typescript
consolidate(fn: ConsolidateFn): Promise<void>
```

Execute L3 → L2 distillation. Called by the upper layer (Scheduler) at appropriate times — Session itself doesn't trigger this.

```typescript
type ConsolidateFn = (currentMemory: string | null, messages: Message[]) => Promise<string>
```

### trimRecords

```typescript
trimRecords(keepRecent: number): Promise<void>
```

Trim old L3 records, keeping only the most recent N. Typically called after consolidate.

### fork

```typescript
fork(options: ForkOptions): Promise<Session>
```

Fork a child Session. One-time context inheritance from parent, fully independent afterward.

```typescript
interface ForkOptions {
  label: string
  systemPrompt?: string              // omit to inherit from parent
  context?: 'none' | 'inherit' | ForkContextFn  // context strategy, default 'none'
  prompt?: string                    // first assistant message in child Session
  llm?: LLMAdapter                   // override parent's LLM
  tools?: LLMCompleteOptions['tools'] // override parent's tool list
  tags?: string[]
  metadata?: Record<string, unknown>
}
```

`context` options:
- `'none'` (default) — child starts with empty L3
- `'inherit'` — copy all parent L3 records
- function — `(parentRecords: Message[]) => Message[]`, custom transform

### updateMeta / archive / setLLM

```typescript
updateMeta(updates: SessionMetaUpdate): Promise<void>
archive(): Promise<void>
setLLM(adapter: LLMAdapter): void    // hot-swap LLM, takes effect immediately
```

### meta

```typescript
readonly meta: Readonly<SessionMeta>
```

Synchronously read metadata (in-memory cache, always up-to-date).

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

The global awareness layer. Key differences from Session: insight is replaced by synthesis in context, `consolidate()` is replaced by `integrate()`.

### Methods shared with Session

`send`, `stream`, `messages`, `systemPrompt`, `setSystemPrompt`, `trimRecords`, `updateMeta`, `archive`, `setLLM` — same signatures and behavior, but context assembly uses: `system prompt → synthesis → L3 → user message`.

### synthesis

```typescript
synthesis(): Promise<string | null>
```

Read synthesis — the product of the integration cycle, Main Session's "global perspective".

### integrate

```typescript
integrate(fn: IntegrateFn): Promise<IntegrateResult>
```

Execute integration cycle: collect all child Session L2s via `getAllSessionL2s()`, call IntegrateFn to generate synthesis + insights, atomically write to storage.

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

### Methods MainSession does NOT have

- No `insight()` / `setInsight()` — Main Session pushes insights, doesn't receive them
- No `memory()` — replaced by `synthesis()`
- No `consolidate()` — replaced by `integrate()`
- No `fork()` — child Session creation is handled by the orchestration layer via `forkSession()`

## Factory Functions

### createSession

```typescript
async function createSession(options: CreateSessionOptions): Promise<Session>
```

Create a new Session, auto-generating an ID and writing to storage.

```typescript
interface CreateSessionOptions {
  storage: SessionStorage     // required
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

Load an existing Session from storage. Returns null if not found.

```typescript
interface LoadSessionOptions {
  storage: SessionStorage     // required
  llm?: LLMAdapter
  systemPrompt?: string
  tools?: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>
}
```

### createMainSession

```typescript
async function createMainSession(options: CreateMainSessionOptions): Promise<MainSession>
```

Create a Main Session. Requires `MainStorage` (not `SessionStorage`).

### loadMainSession

```typescript
async function loadMainSession(id: string, options: LoadMainSessionOptions): Promise<MainSession | null>
```

Load an existing Main Session from storage.

## LLM Adapters

### LLMAdapter Interface

```typescript
interface LLMAdapter {
  complete(messages: Message[], options?: LLMCompleteOptions): Promise<LLMResult>
  stream?(messages: Message[], options?: LLMCompleteOptions): AsyncIterable<LLMChunk>
  maxContextTokens: number
}
```

- `complete` — Required. Send message array, return full response
- `stream` — Optional. Session auto-degrades to complete + single yield if not implemented
- `maxContextTokens` — Used for auto-compression decisions (80% threshold)

### createClaude

```typescript
function createClaude(options: ClaudeOptions): LLMAdapter
```

| Param | Type | Description |
|-------|------|-------------|
| `model` | `ClaudeModel` | `'claude-opus-4-20250514'` \| `'claude-sonnet-4-20250514'` \| `'claude-haiku-4-5-20251001'` |
| `apiKey` | string | Anthropic API Key |
| `baseURL` | string? | Custom endpoint |

All models auto-set maxContextTokens to 200,000. Requires `@anthropic-ai/sdk`.

### createGPT

```typescript
function createGPT(options: GPTOptions): LLMAdapter
```

| Param | Type | Description |
|-------|------|-------------|
| `model` | `GPTModel` | `'gpt-4o'` \| `'gpt-4o-mini'` \| `'gpt-4.1'` \| `'gpt-4.1-mini'` \| `'gpt-4.1-nano'` \| `'o3'` \| `'o3-mini'` \| `'o4-mini'` |
| `apiKey` | string | OpenAI API Key |
| `baseURL` | string? | Custom endpoint |

maxContextTokens auto-set by model (gpt-4o: 128K, gpt-4.1 series: ~1M, o3/o4: 200K). Requires `openai`.

### createOpenAICompatibleAdapter

```typescript
function createOpenAICompatibleAdapter(options: OpenAICompatibleOptions): LLMAdapter
```

Generic OpenAI-protocol adapter for MiniMax, DeepSeek, etc. Requires manual `maxContextTokens` and `baseURL`. Supports `extraBody` for vendor-specific parameters.

### createAnthropicAdapter

```typescript
function createAnthropicAdapter(options: AnthropicAdapterOptions): LLMAdapter
```

Low-level Anthropic protocol adapter. Unlike `createClaude`, requires manual `model` and `maxContextTokens` — suitable for custom model names.

## Message

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: ToolCall[]      // assistant messages only
  toolCallId?: string         // tool messages only
  timestamp?: string          // ISO 8601
}

interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}
```

## Storage Interfaces

### SessionStorage

Storage interface for regular Sessions.

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

Storage interface for Main Session + orchestration layer, extends SessionStorage.

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

Complete in-memory storage implementation with all MainStorage methods. Great for getting started and testing — data is lost on restart. Use `@stello-ai/server`'s PostgreSQL implementation for production.

## Tool Definition

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

Zod-schema-based tool definition factory. Example:

```typescript
import { tool } from '@stello-ai/session'
import { z } from 'zod'

const searchTool = tool(
  'search',
  'Search the knowledge base',
  { query: z.string().describe('Search keywords') },
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

Built-in `stello_create_session` tool. Calls `session.fork()` to create a child Session.

Input: `{ label: string, systemPrompt?: string, prompt?: string }`

Output: `{ sessionId: string, label: string }`

## Error Types

```typescript
class SessionArchivedError extends Error  // thrown when sending to an archived Session
class NotImplementedError extends Error    // thrown when calling an unimplemented method
```
