# 服务端部署

`@stello-ai/server` 将 Stello 编排引擎包装为 HTTP 服务，提供 PostgreSQL 持久化、多租户支持和自动数据库迁移。

## 安装

```bash
pnpm add @stello-ai/server
```

## 前置要求

- Node.js 18+
- PostgreSQL 14+

## 快速开始

```typescript
import { createStelloServer, migrate } from '@stello-ai/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// 自动执行数据库迁移
await migrate(pool)

// 创建服务器
const server = createStelloServer(pool, {
  buildConfig: (spaceId) => ({
    llm: createClaude({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-sonnet-4-20250514',
    }),
    systemPrompt: '你是一个智能助手。',
    tools: [createSessionTool],
    consolidate: myConsolidateFn,
    integrate: myIntegrateFn,
  }),
})

// 启动 HTTP 服务
server.listen(3000, () => {
  console.log('Stello server running on port 3000')
})
```

## 数据库迁移

`migrate()` 会自动创建所需的数据表，可在应用启动时安全调用（幂等操作）：

```typescript
import { migrate } from '@stello-ai/server'

await migrate(pool)
```

## AgentPoolOptions

`createStelloServer` 的第二个参数是 `AgentPoolOptions`，核心是 `buildConfig` 函数：

```typescript
interface AgentPoolOptions {
  /** 根据 spaceId 构建 Agent 配置 */
  buildConfig: (spaceId: string) => AgentConfig
}
```

`buildConfig` 接收 `spaceId`（租户标识），返回该租户的 Agent 配置。这允许你为不同租户使用不同的 LLM、prompt 或工具：

```typescript
const server = createStelloServer(pool, {
  buildConfig: (spaceId) => {
    // 根据租户选择不同配置
    if (spaceId === 'premium') {
      return {
        llm: createClaude({ model: 'claude-opus-4-20250514' }),
        // ...
      }
    }
    return {
      llm: createClaude({ model: 'claude-haiku-4-5-20251001' }),
      // ...
    }
  },
})
```

## HTTP 端点

Server 暴露的 HTTP 端点用于管理 Session 和对话。详细的 API 参考请参见 [API 参考](/api-reference/server)。

主要端点包括：
- 创建/获取 Session
- 发送消息（turn）
- 获取拓扑树
- 获取对话历史

## 多租户（Spaces）

Stello Server 通过 Spaces 概念实现多租户。每个 Space 是一个独立的 Agent 实例，拥有独立的 Session 拓扑和存储空间：

```typescript
// 不同的 spaceId 对应不同的 Agent 实例
// POST /spaces/tenant-a/sessions → 在 tenant-a 空间创建 Session
// POST /spaces/tenant-b/sessions → 在 tenant-b 空间创建 Session
```

## Docker Compose 部署

以下是一个基础的 Docker Compose 配置示例：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: stello
      POSTGRES_USER: stello
      POSTGRES_PASSWORD: stello_password
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  stello:
    build: .
    environment:
      DATABASE_URL: postgresql://stello:stello_password@postgres:5432/stello
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    ports:
      - '3000:3000'
    depends_on:
      - postgres

volumes:
  pgdata:
```

对应的 Dockerfile：

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod
COPY dist ./dist
CMD ["node", "dist/server.js"]
```

## 注意事项

- `migrate()` 是幂等的，可以在每次启动时安全调用
- `buildConfig` 在每次创建新 Agent 实例时调用，保持函数纯净
- PostgreSQL 连接池（`pg.Pool`）由应用层管理，Server 不负责生命周期
- 生产环境建议配置 PostgreSQL 连接池大小和超时参数
