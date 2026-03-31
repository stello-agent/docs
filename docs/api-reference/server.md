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

## createPool

```typescript
function createPool(options: PoolOptions): pg.Pool
```

创建 PostgreSQL 连接池。

### PoolOptions

```typescript
interface PoolOptions {
  connectionString: string
  max?: number
  idleTimeoutMillis?: number
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `connectionString` | `string` | PostgreSQL 连接字符串 |
| `max` | `number` | 最大连接数（默认 20） |
| `idleTimeoutMillis` | `number` | 空闲连接超时毫秒（默认 30000） |

## migrate

```typescript
function migrate(pool: pg.Pool): Promise<void>
```

执行数据库 schema 迁移。`createStelloServer` 默认会在启动时自动调用，除非设置 `skipMigrate: true`。

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

## AgentPool

按 Space 维度懒创建和缓存 StelloAgent 实例，支持空闲自动驱逐。

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `getAgent(spaceId)` | `Promise<StelloAgent>` | 获取或创建指定 Space 的缓存 Agent |
| `evict(spaceId)` | `void` | 手动从缓存中移除 Agent |
| `dispose()` | `void` | 停止驱逐循环，清除所有缓存 Agent |

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `size` | `number` | 当前缓存的 Agent 数量 |

## SpaceManager

管理 Space 生命周期。一个 Space 对应一个 StelloAgent 和一棵 Session 树。

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `createSpace(userId, config)` | `Promise<Space>` | 创建 Space 及其根 Session |
| `getSpace(spaceId)` | `Promise<Space \| null>` | 根据 ID 获取 Space |
| `updateSpace(spaceId, updates)` | `Promise<Space>` | 更新 Space 配置 |
| `listSpaces(userId)` | `Promise<Space[]>` | 列举用户的所有 Space |
| `deleteSpace(spaceId)` | `Promise<void>` | 删除 Space（级联删除所有 Session） |

::: tip
`createSpace()` 会自动创建根 Session（role=main）并写入 system prompt。`updateSpace()` 会自动同步 system prompt 变更到根 Session。
:::

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

## LLM 默认实现

从 `@stello-ai/core` 重导出，方便使用。

### createDefaultConsolidateFn

```typescript
function createDefaultConsolidateFn(prompt: string, llm: LLMCallFn): ConsolidateFn
```

使用指定 prompt 和 LLM 创建默认的 consolidation 函数。

### createDefaultIntegrateFn

```typescript
function createDefaultIntegrateFn(prompt: string, llm: LLMCallFn): IntegrateFn
```

使用指定 prompt 和 LLM 创建默认的 integration 函数。

### LLMCallFn

```typescript
type LLMCallFn = (messages: Message[]) => Promise<string>
```

简单的 LLM 调用函数类型，接收消息数组，返回文本响应。供内置 consolidation/integration 默认实现使用。

## HTTP REST 端点

所有路由挂载在 `/spaces` 前缀下。认证方式为 `X-API-Key` 请求头。

### Space 管理

| 方法 | 路径 | 请求体 | 响应 |
|------|------|--------|------|
| `POST` | `/spaces` | `{ label, systemPrompt?, consolidatePrompt?, integratePrompt? }` | `201` Space |
| `GET` | `/spaces` | — | `200` Space[] |
| `GET` | `/spaces/:spaceId` | — | `200` Space |
| `PATCH` | `/spaces/:spaceId` | `{ label?, systemPrompt?, consolidatePrompt?, integratePrompt? }` | `200` Space |
| `DELETE` | `/spaces/:spaceId` | — | `204` 无内容 |

### Session 操作

| 方法 | 路径 | 请求体 | 响应 |
|------|------|--------|------|
| `GET` | `/:spaceId/sessions` | — | `200` Session 树 |
| `GET` | `/:spaceId/sessions/:id` | — | `200` SessionMeta |
| `GET` | `/:spaceId/sessions/:id/messages` | — | `200` Message[] |
| `POST` | `/:spaceId/sessions/:id/turn` | `{ input: string }` | `200` EngineTurnResult |
| `POST` | `/:spaceId/sessions/:id/fork` | `{ label: string, scope?: string }` | `201` SessionMeta |
| `POST` | `/:spaceId/sessions/:id/archive` | — | `200` SessionMeta |

### Session 数据

| 方法 | 路径 | 请求体 | 响应 |
|------|------|--------|------|
| `GET` | `/:spaceId/sessions/:id/system-prompt` | — | `{ content: string \| null }` |
| `PUT` | `/:spaceId/sessions/:id/system-prompt` | `{ content: string }` | `{ content: string }` |
| `GET` | `/:spaceId/sessions/:id/memory` | — | `{ content: string \| null }` |
| `GET` | `/:spaceId/sessions/:id/insight` | — | `{ content: string \| null }` |
| `GET` | `/:spaceId/sessions/:id/consolidate-prompt` | — | `{ content: string \| null }` |
| `PUT` | `/:spaceId/sessions/:id/consolidate-prompt` | `{ content: string }` | `{ content: string }` |
| `GET` | `/:spaceId/sessions/:id/integrate-prompt` | — | `{ content: string \| null }` |
| `PUT` | `/:spaceId/sessions/:id/integrate-prompt` | `{ content: string }` | `{ content: string }` |

## WebSocket API

### 连接

```
ws://host/spaces/:spaceId/ws
```

通过升级请求的 `X-API-Key` 头进行认证。

### 客户端 → 服务端消息

```typescript
// 进入 Session
{ type: 'session.enter', sessionId: string }

// 离开当前 Session
{ type: 'session.leave' }

// 非流式对话
{ type: 'session.message', input: string }

// 流式对话
{ type: 'session.stream', input: string }

// 派生子 Session
{ type: 'session.fork', options: { label: string, scope?: string } }
```

### 服务端 → 客户端消息

| 类型 | 载荷 | 说明 |
|------|------|------|
| `session.entered` | `{ sessionId, bootstrap }` | 成功进入 Session |
| `session.left` | `{ sessionId }` | 已离开 Session |
| `turn.complete` | `{ result }` | 非流式对话结果 |
| `stream.delta` | `{ chunk }` | 流式片段（多次） |
| `stream.end` | `{ result }` | 流式完成 |
| `session.forked` | `{ child }` | 子 Session 已创建 |
| `error` | `{ message, code? }` | 错误响应 |

### 错误码

| 错误码 | 说明 |
|--------|------|
| `PARSE_ERROR` | JSON 解析失败 |
| `UNKNOWN_TYPE` | 未知消息类型 |
| `ALREADY_ENTERED` | 已在 Session 中（需先离开） |
| `NOT_ENTERED` | 操作需要先进入 Session |
| `HANDLER_ERROR` | 处理器内部错误 |

## ConnectionManager

纯内存的 WebSocket 连接态管理。

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `bind(connectionId, userId, spaceId)` | `void` | 注册新连接 |
| `getState(connectionId)` | `ConnectionState \| null` | 获取连接状态 |
| `attachSession(connectionId, sessionId)` | `void` | 将连接附着到 Session |
| `detachSession(connectionId)` | `string \| null` | 从 Session 断开，返回之前的 sessionId |
| `unbind(connectionId)` | `ConnectionState \| null` | 移除连接，返回最终状态 |

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `size` | `number` | 当前连接数 |

### ConnectionState

```typescript
interface ConnectionState {
  connectionId: string
  userId: string
  spaceId: string
  sessionId: string | null   // null 表示未进入任何 Session
}
```

## PG 存储类

PostgreSQL 存储适配器实现。可直接使用，也会由 `AgentPool` 通过 `AgentBuildContext` 自动创建。

| 类 | 实现接口 | 说明 |
|----|---------|------|
| `PgSessionStorage` | `SessionStorage` | 单 Session 的 PG 存储 |
| `PgMainStorage` | `MainStorage` | Main Session 的 PG 存储 |
| `PgSessionTree` | `SessionTree` | 拓扑树的 PG 存储 |
| `PgMemoryEngine` | `MemoryEngine` | 记忆引擎的 PG 存储 |

所有构造函数签名为 `(client: pg.Pool | pg.PoolClient, spaceId: string)`。接口详情参阅 [@stello-ai/session](/docs/api-reference/session)。
