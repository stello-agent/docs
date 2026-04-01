# @stello-ai/server

Server package providing HTTP/WebSocket service, PostgreSQL persistence, and multi-tenant Space management.

## createStelloServer

```typescript
function createStelloServer(options: StelloServerOptions): Promise<StelloServer>
```

Create and initialize a Stello server instance (including database migration).

### StelloServerOptions

```typescript
interface StelloServerOptions {
  pool: pg.Pool
  agentPoolOptions: AgentPoolOptions
  skipMigrate?: boolean
}
```

| Field | Type | Description |
|-------|------|-------------|
| `pool` | `pg.Pool` | PostgreSQL connection pool |
| `agentPoolOptions` | `AgentPoolOptions` | Agent pool configuration |
| `skipMigrate` | `boolean` | Skip database migration (for tests or pre-migrated databases) |

### StelloServer

```typescript
interface StelloServer {
  app: Hono<AuthEnv>
  listen(port?: number): Promise<{ port: number; close: () => Promise<void> }>
  spaceManager: SpaceManager
  agentPool: AgentPool
  pool: pg.Pool
}
```

| Property/Method | Description |
|-----------------|-------------|
| `app` | Hono app instance, testable via `app.request()` |
| `listen` | Start HTTP + WebSocket service, returns port and close function |
| `spaceManager` | Space CRUD manager |
| `agentPool` | Lazily-created StelloAgent pool keyed by spaceId |
| `pool` | PG connection pool reference |

## createPool

```typescript
function createPool(options: PoolOptions): pg.Pool
```

Create a PostgreSQL connection pool.

### PoolOptions

```typescript
interface PoolOptions {
  connectionString: string
  max?: number
  idleTimeoutMillis?: number
}
```

| Field | Type | Description |
|-------|------|-------------|
| `connectionString` | `string` | PostgreSQL connection string |
| `max` | `number` | Maximum number of connections (default: 20) |
| `idleTimeoutMillis` | `number` | Idle connection timeout in milliseconds (default: 30000) |

## migrate

```typescript
function migrate(pool: pg.Pool): Promise<void>
```

Execute database schema migration. `createStelloServer` calls this automatically on startup unless `skipMigrate: true` is set.

## AgentPoolOptions

```typescript
interface AgentPoolOptions {
  buildConfig: (ctx: AgentBuildContext) => Omit<StelloAgentConfig, 'sessions' | 'memory'>
  llm?: LLMCallFn
  idleTtlMs?: number
}
```

| Field | Description |
|-------|-------------|
| `buildConfig` | Build StelloAgentConfig for each Space (sessions and memory are auto-provided by the pool) |
| `llm` | LLM call function for built-in consolidation/integration defaults |
| `idleTtlMs` | Idle eviction time (ms, defaults to 5 minutes) |

### AgentBuildContext

```typescript
interface AgentBuildContext {
  spaceId: string
  space: Space
  pool: pg.Pool
  sessionStorage: PgSessionStorage
  mainStorage: PgMainStorage
  sessionTree: PgSessionTree
  memoryEngine: PgMemoryEngine
}
```

| Field | Description |
|-------|-------------|
| `spaceId` | Space identifier |
| `space` | Full Space data (including consolidatePrompt / integratePrompt) |
| `pool` | PG connection pool |
| `sessionStorage` | PG Session storage for this Space |
| `mainStorage` | PG Main storage for this Space |
| `sessionTree` | PG topology tree for this Space |
| `memoryEngine` | PG memory engine for this Space |

## AgentPool

Manages lazy creation and caching of StelloAgent instances per Space, with automatic idle eviction.

### Methods

| Method | Return | Description |
|--------|--------|-------------|
| `getAgent(spaceId)` | `Promise<StelloAgent>` | Get or create a cached agent for the given Space |
| `evict(spaceId)` | `void` | Manually remove an agent from the cache |
| `dispose()` | `void` | Stop the eviction loop and clear all cached agents |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `size` | `number` | Current number of cached agents |

## SpaceManager

Manages Space lifecycle. One Space corresponds to one StelloAgent and one session tree.

### Methods

| Method | Return | Description |
|--------|--------|-------------|
| `createSpace(userId, config)` | `Promise<Space>` | Create a Space and its root session |
| `getSpace(spaceId)` | `Promise<Space \| null>` | Get Space by ID |
| `updateSpace(spaceId, updates)` | `Promise<Space>` | Update Space configuration |
| `listSpaces(userId)` | `Promise<Space[]>` | List all Spaces for a user |
| `deleteSpace(spaceId)` | `Promise<void>` | Delete Space (cascades to all sessions) |

::: tip
`createSpace()` automatically creates a root session (role=main) and writes the system prompt to it. `updateSpace()` syncs system prompt changes to the root session automatically.
:::

## Space Types

### SpaceConfig

```typescript
interface SpaceConfig {
  label: string
  systemPrompt?: string
  consolidatePrompt?: string
  integratePrompt?: string
  config?: Record<string, unknown>
}
```

### Space

```typescript
interface Space {
  id: string
  userId: string
  label: string
  systemPrompt: string | null
  consolidatePrompt: string | null
  integratePrompt: string | null
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
```

## LLM Defaults

Re-exported from `@stello-ai/core` for convenience.

### createDefaultConsolidateFn

```typescript
function createDefaultConsolidateFn(prompt: string, llm: LLMCallFn): ConsolidateFn
```

Create a default consolidation function using the provided prompt and LLM.

### createDefaultIntegrateFn

```typescript
function createDefaultIntegrateFn(prompt: string, llm: LLMCallFn): IntegrateFn
```

Create a default integration function using the provided prompt and LLM.

### LLMCallFn

```typescript
type LLMCallFn = (messages: Message[]) => Promise<string>
```

A simple LLM call function that takes a message array and returns the text response. Used by the built-in consolidation/integration defaults.

## HTTP REST Endpoints

All routes are mounted under the `/spaces` prefix. Authentication via `X-API-Key` header.

### Space Management

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| `POST` | `/spaces` | `{ label, systemPrompt?, consolidatePrompt?, integratePrompt? }` | `201` Space |
| `GET` | `/spaces` | — | `200` Space[] |
| `GET` | `/spaces/:spaceId` | — | `200` Space |
| `PATCH` | `/spaces/:spaceId` | `{ label?, systemPrompt?, consolidatePrompt?, integratePrompt? }` | `200` Space |
| `DELETE` | `/spaces/:spaceId` | — | `204` No Content |

### Session Operations

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| `GET` | `/:spaceId/sessions` | — | `200` Session tree |
| `GET` | `/:spaceId/sessions/:id` | — | `200` SessionMeta |
| `GET` | `/:spaceId/sessions/:id/messages` | — | `200` Message[] |
| `POST` | `/:spaceId/sessions/:id/turn` | `{ input: string }` | `200` EngineTurnResult |
| `POST` | `/:spaceId/sessions/:id/fork` | `{ label: string, scope?: string }` | `201` SessionMeta |
| `POST` | `/:spaceId/sessions/:id/archive` | — | `200` SessionMeta |

### Session Data

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| `GET` | `/:spaceId/sessions/:id/system-prompt` | — | `{ content: string \| null }` |
| `PUT` | `/:spaceId/sessions/:id/system-prompt` | `{ content: string }` | `{ content: string }` |
| `GET` | `/:spaceId/sessions/:id/memory` | — | `{ content: string \| null }` |
| `GET` | `/:spaceId/sessions/:id/insight` | — | `{ content: string \| null }` |
| `GET` | `/:spaceId/sessions/:id/consolidate-prompt` | — | `{ content: string \| null }` |
| `PUT` | `/:spaceId/sessions/:id/consolidate-prompt` | `{ content: string }` | `{ content: string }` |
| `GET` | `/:spaceId/sessions/:id/integrate-prompt` | — | `{ content: string \| null }` |
| `PUT` | `/:spaceId/sessions/:id/integrate-prompt` | `{ content: string }` | `{ content: string }` |

## WebSocket API

### Connection

```
ws://host/spaces/:spaceId/ws
```

Authentication via `X-API-Key` header in the upgrade request.

### Client → Server Messages

```typescript
// Enter a session
{ type: 'session.enter', sessionId: string }

// Leave current session
{ type: 'session.leave' }

// Non-streaming turn
{ type: 'session.message', input: string }

// Streaming turn
{ type: 'session.stream', input: string }

// Fork a child session
{ type: 'session.fork', options: { label: string, scope?: string } }
```

### Server → Client Messages

| Type | Payload | Description |
|------|---------|-------------|
| `session.entered` | `{ sessionId, bootstrap }` | Session entered successfully |
| `session.left` | `{ sessionId }` | Session left |
| `turn.complete` | `{ result }` | Non-streaming turn result |
| `stream.delta` | `{ chunk }` | Streaming chunk (multiple) |
| `stream.end` | `{ result }` | Streaming complete |
| `session.forked` | `{ child }` | Child session created |
| `error` | `{ message, code? }` | Error response |

### Error Codes

| Code | Description |
|------|-------------|
| `PARSE_ERROR` | Invalid JSON |
| `UNKNOWN_TYPE` | Unknown message type |
| `ALREADY_ENTERED` | Already in a session (need to leave first) |
| `NOT_ENTERED` | Operation requires being in a session |
| `HANDLER_ERROR` | Handler internal error |

## ConnectionManager

In-memory WebSocket connection state management.

### Methods

| Method | Return | Description |
|--------|--------|-------------|
| `bind(connectionId, userId, spaceId)` | `void` | Register a new connection |
| `getState(connectionId)` | `ConnectionState \| null` | Get connection state |
| `attachSession(connectionId, sessionId)` | `void` | Attach connection to a session |
| `detachSession(connectionId)` | `string \| null` | Detach from session, returns previous sessionId |
| `unbind(connectionId)` | `ConnectionState \| null` | Remove connection, returns final state |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `size` | `number` | Current connection count |

### ConnectionState

```typescript
interface ConnectionState {
  connectionId: string
  userId: string
  spaceId: string
  sessionId: string | null   // null when not in any session
}
```

## PG Storage Classes

PostgreSQL storage adapter implementations. These are available for direct use but are also auto-created by `AgentPool` via `AgentBuildContext`.

| Class | Implements | Description |
|-------|-----------|-------------|
| `PgSessionStorage` | `SessionStorage` | PG storage for a single Session |
| `PgMainStorage` | `MainStorage` | PG storage for Main Session |
| `PgSessionTree` | `SessionTree` | PG storage for the topology tree |
| `PgMemoryEngine` | `MemoryEngine` | PG storage for the memory engine |

All constructors take `(client: pg.Pool | pg.PoolClient, spaceId: string)`. For interface details, see [@stello-ai/session](/en/api-reference/session).
