# Server Deployment

`@stello-ai/server` wraps the Stello orchestration engine as an HTTP service with PostgreSQL persistence, multi-tenancy support, and automatic database migration.

## Installation

```bash
pnpm add @stello-ai/server
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Quick Start

```typescript
import { createStelloServer, migrate } from '@stello-ai/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Run database migrations automatically
await migrate(pool)

// Create the server
const server = createStelloServer(pool, {
  buildConfig: (spaceId) => ({
    llm: createClaude({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-sonnet-4-20250514',
    }),
    systemPrompt: 'You are a helpful assistant.',
    tools: [createSessionTool],
    consolidate: myConsolidateFn,
    integrate: myIntegrateFn,
  }),
})

// Start the HTTP server
server.listen(3000, () => {
  console.log('Stello server running on port 3000')
})
```

## Database Migration

`migrate()` automatically creates the required tables and can be safely called on every startup (idempotent):

```typescript
import { migrate } from '@stello-ai/server'

await migrate(pool)
```

## AgentPoolOptions

The second argument to `createStelloServer` is `AgentPoolOptions`, with `buildConfig` as its core:

```typescript
interface AgentPoolOptions {
  /** Build Agent config based on spaceId */
  buildConfig: (spaceId: string) => AgentConfig
}
```

`buildConfig` receives a `spaceId` (tenant identifier) and returns the Agent configuration for that tenant. This allows different LLMs, prompts, or tools per tenant:

```typescript
const server = createStelloServer(pool, {
  buildConfig: (spaceId) => {
    // Different config per tenant
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

## HTTP Endpoints

The server exposes HTTP endpoints for managing Sessions and conversations. See the [API Reference](/en/api/) for complete details.

Key endpoints include:
- Create/get Sessions
- Send messages (turn)
- Get topology tree
- Get conversation history

## Multi-Tenancy via Spaces

Stello Server implements multi-tenancy through the Spaces concept. Each Space is an independent Agent instance with its own Session topology and storage:

```typescript
// Different spaceIds map to different Agent instances
// POST /spaces/tenant-a/sessions → create Session in tenant-a space
// POST /spaces/tenant-b/sessions → create Session in tenant-b space
```

## Docker Compose Deployment

Here is a basic Docker Compose configuration:

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

Corresponding Dockerfile:

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod
COPY dist ./dist
CMD ["node", "dist/server.js"]
```

## Notes

- `migrate()` is idempotent and safe to call on every startup
- `buildConfig` is called each time a new Agent instance is created -- keep it pure
- The PostgreSQL connection pool (`pg.Pool`) is managed by the application, not the server
- In production, configure PostgreSQL pool size and timeout parameters appropriately
