# 存储适配器

Stello 的存储接口按消费者职责分层，而非按数据结构划分。你可以使用内置适配器或实现自定义存储。

## SessionStorage 接口

`SessionStorage` 为单个 Session 提供数据存取，是最基础的存储接口：

```typescript
interface SessionStorage {
  /** 获取 Session 元数据 */
  getSessionMeta(sessionId: string): Promise<SessionMeta | null>
  /** 保存 Session 元数据 */
  putSessionMeta(sessionId: string, meta: SessionMeta): Promise<void>

  /** 获取 system prompt */
  getSystemPrompt(sessionId: string): Promise<string | null>
  /** 保存 system prompt */
  putSystemPrompt(sessionId: string, prompt: string): Promise<void>

  /** 获取 insight（Main Session 推送的建议） */
  getInsight(sessionId: string): Promise<string | null>
  /** 保存 insight */
  putInsight(sessionId: string, insight: string): Promise<void>

  /** 追加对话记录（L3） */
  appendRecord(sessionId: string, record: Record): Promise<void>
  /** 列出对话记录 */
  listRecords(sessionId: string): Promise<Record[]>

  /** 获取记忆（子 Session 存 L2，Main Session 存 synthesis） */
  getMemory(sessionId: string): Promise<string | null>
  /** 保存记忆 */
  putMemory(sessionId: string, memory: string): Promise<void>
}
```

## MainStorage 接口

`MainStorage` 扩展 `SessionStorage`，为 Main Session 和编排层提供额外能力：

```typescript
interface MainStorage extends SessionStorage {
  /** 批量获取所有子 Session 的 L2（用于 integration） */
  getAllSessionL2s(): Promise<Array<{ sessionId: string; l2: string }>>

  /** 列出所有 Session */
  listSessions(): Promise<SessionMeta[]>

  /** 拓扑树操作 */
  getTopologyNode(nodeId: string): Promise<TopologyNode | null>
  putTopologyNode(node: TopologyNode): Promise<void>
  getChildren(parentId: string): Promise<TopologyNode[]>
  getRootNode(): Promise<TopologyNode | null>

  /** 全局键值存储（L1-structured） */
  getGlobalKV(key: string): Promise<string | null>
  putGlobalKV(key: string, value: string): Promise<void>

  /** 事务支持 */
  transaction<T>(fn: (storage: MainStorage) => Promise<T>): Promise<T>
}
```

## InMemoryStorageAdapter

内存存储适配器，适用于测试和开发：

```typescript
import { InMemoryStorageAdapter } from '@stello-ai/core'

const storage = new InMemoryStorageAdapter()

const agent = createEngine({
  storage,
  // ...
})
```

**限制**：
- 数据仅存在于内存中，进程退出后丢失
- 不支持多进程/多实例共享
- 仅适合测试、原型开发和本地调试

## PostgreSQL 适配器

`@stello-ai/server` 提供生产级 PostgreSQL 存储实现：

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

这些组件各自负责：
- `PgSessionStorage` -- 单 Session 的对话记录、元数据、prompt、insight、memory
- `PgMainStorage` -- 扩展 SessionStorage，增加批量 L2 收集、Session 列举、全局 KV
- `PgSessionTree` -- 拓扑树节点的 CRUD
- `PgMemoryEngine` -- L2/synthesis 的读写

## 实现自定义存储

根据使用场景选择要实现的接口：

- **只需单 Session 功能**：实现 `SessionStorage`
- **需要完整编排**：实现 `MainStorage`

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

  // ... 实现其他方法
}
```

## 设计要点

- **Session 与拓扑树解耦**：SessionMeta 不包含 parentId/depth，拓扑关系由 TopologyNode 独立维护
- **存储按职责分层**：SessionStorage 服务于单个 Session，MainStorage 服务于编排层
- **L2 扁平收集**：`getAllSessionL2s()` 不走树结构，而是扁平收集所有 Session 的 L2
- **事务支持**：`transaction()` 确保 fork 操作（创建 Session + 写入拓扑节点）的原子性
