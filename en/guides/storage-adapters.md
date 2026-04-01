# Storage Adapters

Stello's storage interfaces are layered by consumer responsibility, not by data structure. You can use built-in adapters or implement custom storage.

## SessionStorage Interface

`SessionStorage` provides data access for a single Session -- the most basic storage interface:

```typescript
interface SessionStorage {
  /** Get Session metadata */
  getSessionMeta(sessionId: string): Promise<SessionMeta | null>
  /** Save Session metadata */
  putSessionMeta(sessionId: string, meta: SessionMeta): Promise<void>

  /** Get system prompt */
  getSystemPrompt(sessionId: string): Promise<string | null>
  /** Save system prompt */
  putSystemPrompt(sessionId: string, prompt: string): Promise<void>

  /** Get insight (advice pushed from Main Session) */
  getInsight(sessionId: string): Promise<string | null>
  /** Save insight */
  putInsight(sessionId: string, insight: string): Promise<void>

  /** Append conversation record (L3) */
  appendRecord(sessionId: string, record: Record): Promise<void>
  /** List conversation records */
  listRecords(sessionId: string): Promise<Record[]>

  /** Get memory (child Session stores L2, Main Session stores synthesis) */
  getMemory(sessionId: string): Promise<string | null>
  /** Save memory */
  putMemory(sessionId: string, memory: string): Promise<void>
}
```

## MainStorage Interface

`MainStorage` extends `SessionStorage` with additional capabilities for Main Session and the orchestration layer:

```typescript
interface MainStorage extends SessionStorage {
  /** Batch-collect all child Session L2s (used for integration) */
  getAllSessionL2s(): Promise<Array<{ sessionId: string; l2: string }>>

  /** List all Sessions */
  listSessions(): Promise<SessionMeta[]>

  /** Topology tree operations */
  getTopologyNode(nodeId: string): Promise<TopologyNode | null>
  putTopologyNode(node: TopologyNode): Promise<void>
  getChildren(parentId: string): Promise<TopologyNode[]>
  getRootNode(): Promise<TopologyNode | null>

  /** Global key-value store (L1-structured) */
  getGlobalKV(key: string): Promise<string | null>
  putGlobalKV(key: string, value: string): Promise<void>

  /** Transaction support */
  transaction<T>(fn: (storage: MainStorage) => Promise<T>): Promise<T>
}
```

## InMemoryStorageAdapter

In-memory storage adapter for testing and development:

```typescript
import { InMemoryStorageAdapter } from '@stello-ai/core'

const storage = new InMemoryStorageAdapter()

const agent = createEngine({
  storage,
  // ...
})
```

**Limitations**:
- Data exists only in memory, lost when the process exits
- No multi-process/multi-instance sharing
- Only suitable for testing, prototyping, and local debugging

## PostgreSQL Adapters

`@stello-ai/server` provides production-grade PostgreSQL storage:

```typescript
import { Pool } from 'pg'
import {
  PgSessionStorage,
  PgMainStorage,
  PgSessionTree,
  PgMemoryEngine,
} from '@stello-ai/server'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const sessionStorage = new PgSessionStorage(pool)
const mainStorage = new PgMainStorage(pool)
const sessionTree = new PgSessionTree(pool)
const memoryEngine = new PgMemoryEngine(pool)
```

Each component handles a specific responsibility:
- `PgSessionStorage` -- Single Session conversation records, metadata, prompts, insights, memory
- `PgMainStorage` -- Extends SessionStorage with batch L2 collection, Session listing, global KV
- `PgSessionTree` -- Topology tree node CRUD
- `PgMemoryEngine` -- L2/synthesis read and write

## Implementing Custom Storage

Choose the interface to implement based on your use case:

- **Single Session only**: Implement `SessionStorage`
- **Full orchestration**: Implement `MainStorage`

```typescript
import type { MainStorage, SessionMeta, TopologyNode } from '@stello-ai/core'

class MyStorage implements MainStorage {
  async getSessionMeta(sessionId: string) {
    return await this.db.query('SELECT * FROM sessions WHERE id = $1', [sessionId])
  }

  async transaction<T>(fn: (storage: MainStorage) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const txStorage = new MyStorage(client)
      const result = await fn(txStorage)
      await client.query('COMMIT')
      return result
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }

  // ... implement remaining methods
}
```

## Design Points

- **Session decoupled from topology tree**: SessionMeta has no parentId/depth; topology is maintained independently via TopologyNode
- **Storage layered by responsibility**: SessionStorage serves individual Sessions, MainStorage serves the orchestration layer
- **Flat L2 collection**: `getAllSessionL2s()` collects L2s flat across all Sessions, not through the tree
- **Transaction support**: `transaction()` ensures atomicity of fork operations (creating Session + writing topology node)
