# @stello-ai/server

服务端包，提供 HTTP/WebSocket 服务、PostgreSQL 持久化和多租户 Space 管理。

## createStelloServer

```typescript
function createStelloServer(options: StelloServerOptions): Promise<StelloServer>
```

创建并初始化 Stello 服务端实例（含数据库迁移）。

### StelloServerOptions

```typescript
interface StelloServerOptions {
  pool: pg.Pool
  agentPoolOptions: AgentPoolOptions
  skipMigrate?: boolean
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `pool` | `pg.Pool` | PostgreSQL 连接池 |
| `agentPoolOptions` | `AgentPoolOptions` | Agent 池配置 |
| `skipMigrate` | `boolean` | 跳过数据库迁移（测试或已迁移场景） |

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

| 属性/方法 | 说明 |
|----------|------|
| `app` | Hono 应用实例，可用 `app.request()` 做测试 |
| `listen` | 启动 HTTP + WebSocket 服务，返回端口和关闭函数 |
| `spaceManager` | Space CRUD 管理器 |
| `agentPool` | 按 spaceId 懒创建的 StelloAgent 池 |
| `pool` | PG 连接池引用 |

## AgentPoolOptions

```typescript
interface AgentPoolOptions {
  buildConfig: (ctx: AgentBuildContext) => Omit<StelloAgentConfig, 'sessions' | 'memory'>
  llm?: LLMCallFn
  idleTtlMs?: number
}
```

| 字段 | 说明 |
|------|------|
| `buildConfig` | 为每个 Space 构建 StelloAgentConfig（sessions 和 memory 由 pool 自动提供） |
| `llm` | 内置 consolidation/integration 默认实现的 LLM 调用函数 |
| `idleTtlMs` | 空闲驱逐时间（毫秒，默认 5 分钟） |

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

| 字段 | 说明 |
|------|------|
| `spaceId` | Space 标识 |
| `space` | Space 完整数据（含 consolidatePrompt / integratePrompt） |
| `pool` | PG 连接池 |
| `sessionStorage` | 该 Space 的 PG Session 存储 |
| `mainStorage` | 该 Space 的 PG Main 存储 |
| `sessionTree` | 该 Space 的 PG 拓扑树 |
| `memoryEngine` | 该 Space 的 PG 记忆引擎 |

## Space 类型

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

## HTTP REST 端点

所有路由挂载在 `/spaces` 前缀下。

### Space 管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/` | 创建 Space |
| `GET` | `/` | 列举所有 Space |
| `GET` | `/:spaceId` | 获取 Space 详情 |
| `PATCH` | `/:spaceId` | 更新 Space |
| `DELETE` | `/:spaceId` | 删除 Space |

### Session 操作

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/:spaceId/sessions` | 列举 Session |
| `GET` | `/:spaceId/sessions/:id` | 获取 Session 详情 |
| `GET` | `/:spaceId/sessions/:id/messages` | 获取对话记录 |
| `POST` | `/:spaceId/sessions/:id/turn` | 运行一轮对话 |
| `POST` | `/:spaceId/sessions/:id/fork` | 派生子 Session |
| `POST` | `/:spaceId/sessions/:id/archive` | 归档 Session |
| `GET` | `/:spaceId/sessions/:id/system-prompt` | 获取 system prompt |
| `PUT` | `/:spaceId/sessions/:id/system-prompt` | 更新 system prompt |
| `GET` | `/:spaceId/sessions/:id/memory` | 获取 L2/synthesis |
| `GET` | `/:spaceId/sessions/:id/insight` | 获取 insight |
| `GET` | `/:spaceId/sessions/:id/consolidate-prompt` | 获取 consolidate prompt |
| `PUT` | `/:spaceId/sessions/:id/consolidate-prompt` | 更新 consolidate prompt |
| `GET` | `/:spaceId/sessions/:id/integrate-prompt` | 获取 integrate prompt |
| `PUT` | `/:spaceId/sessions/:id/integrate-prompt` | 更新 integrate prompt |

## migrate

```typescript
function migrate(pool: pg.Pool): Promise<void>
```

执行数据库 schema 迁移。`createStelloServer` 默认会在启动时自动调用，除非设置 `skipMigrate: true`。

## PG 存储类

PostgreSQL 实现的存储适配器，server 内部使用。

| 类 | 实现接口 | 说明 |
|----|---------|------|
| `PgSessionStorage` | `SessionStorage` | 单 Session 的 PG 存储 |
| `PgMainStorage` | `MainStorage` | Main Session 的 PG 存储 |
| `PgSessionTree` | `SessionTree` | 拓扑树的 PG 存储 |
| `PgMemoryEngine` | `MemoryEngine` | 记忆引擎的 PG 存储 |
