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

## HTTP REST Endpoints

All routes are mounted under the `/spaces` prefix.

### Space Management

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/` | Create a Space |
| `GET` | `/` | List all Spaces |
| `GET` | `/:spaceId` | Get Space details |
| `PATCH` | `/:spaceId` | Update a Space |
| `DELETE` | `/:spaceId` | Delete a Space |

### Session Operations

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/:spaceId/sessions` | List Sessions |
| `GET` | `/:spaceId/sessions/:id` | Get Session details |
| `GET` | `/:spaceId/sessions/:id/messages` | Get conversation records |
| `POST` | `/:spaceId/sessions/:id/turn` | Run a conversation turn |
| `POST` | `/:spaceId/sessions/:id/fork` | Fork a child Session |
| `POST` | `/:spaceId/sessions/:id/archive` | Archive a Session |
| `GET` | `/:spaceId/sessions/:id/system-prompt` | Get system prompt |
| `PUT` | `/:spaceId/sessions/:id/system-prompt` | Update system prompt |
| `GET` | `/:spaceId/sessions/:id/memory` | Get L2/synthesis |
| `GET` | `/:spaceId/sessions/:id/insight` | Get insight |
| `GET` | `/:spaceId/sessions/:id/consolidate-prompt` | Get consolidate prompt |
| `PUT` | `/:spaceId/sessions/:id/consolidate-prompt` | Update consolidate prompt |
| `GET` | `/:spaceId/sessions/:id/integrate-prompt` | Get integrate prompt |
| `PUT` | `/:spaceId/sessions/:id/integrate-prompt` | Update integrate prompt |

## migrate

```typescript
function migrate(pool: pg.Pool): Promise<void>
```

Execute database schema migration. `createStelloServer` calls this automatically on startup unless `skipMigrate: true` is set.

## PG Storage Classes

PostgreSQL storage adapter implementations used internally by the server.

| Class | Implements | Description |
|-------|-----------|-------------|
| `PgSessionStorage` | `SessionStorage` | PG storage for a single Session |
| `PgMainStorage` | `MainStorage` | PG storage for Main Session |
| `PgSessionTree` | `SessionTree` | PG storage for the topology tree |
| `PgMemoryEngine` | `MemoryEngine` | PG storage for the memory engine |
