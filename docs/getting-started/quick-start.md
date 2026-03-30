# 快速上手

本指南带你用 `@stello-ai/core` 创建一个完整的 StelloAgent——具备对话分裂、记忆提炼和星空图可视化的认知拓扑。

## 1. 准备 LLM 适配器

`@stello-ai/core` 内置了多种 LLM 适配器（re-export 自 `@stello-ai/session`）：

::: code-group

```typescript [Claude]
import { createClaude } from '@stello-ai/core'

const llm = createClaude({
  model: 'claude-sonnet-4-20250514',
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
```

```typescript [GPT]
import { createGPT } from '@stello-ai/core'

const llm = createGPT({
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY!,
})
```

```typescript [OpenAI 兼容]
import { createOpenAICompatibleAdapter } from '@stello-ai/core'

const llm = createOpenAICompatibleAdapter({
  model: 'your-model',
  apiKey: process.env.API_KEY!,
  baseURL: 'https://your-provider.com/v1',
  maxContextTokens: 128_000,
})
```

:::

## 2. 初始化核心依赖

StelloAgent 需要三个核心依赖：**SessionTree**（拓扑树存储）、**MemoryEngine**（记忆引擎）和 **Session 组件**（对话单元）。

```typescript
import {
  NodeFileSystemAdapter,
  SessionTreeImpl,
  createStelloAgent,
  Scheduler,
  SkillRouterImpl,
  createDefaultConsolidateFn,
  createDefaultIntegrateFn,
  InMemoryStorageAdapter,
  loadSession,
  loadMainSession,
} from '@stello-ai/core'

// 文件系统适配器：拓扑树和记忆持久化到本地目录
const fs = new NodeFileSystemAdapter('./my-stello-data')
const sessions = new SessionTreeImpl(fs)

// Session 层的内存存储（运行时对话记录）
const sessionStorage = new InMemoryStorageAdapter()
```

## 3. 创建 StelloAgent

StelloAgent 是 Stello 的核心对象，它编排 Session 树、驱动 tool call 循环、调度记忆提炼。

```typescript
// 创建拓扑树根节点（Main Session）
const root = await sessions.createRoot('我的助手')

// LLM 调用函数，供 consolidation / integration 使用
const llmCall = async (messages) => {
  const result = await llm.complete(messages)
  return result.content ?? ''
}

const agent = createStelloAgent({
  // 拓扑树存储
  sessions,

  // 记忆引擎（管理 L2、scope、对话记录的持久化）
  memory: createFileMemoryEngine(fs, sessions),

  // Session 层集成
  session: {
    // Agent 需要对话时，通过 resolver 获取 Session 实例
    sessionResolver: async (sessionId) => {
      // 加载并返回 Session 或 MainSession
      // 具体实现见下方完整示例
    },
    // L3 → L2 提炼函数
    consolidateFn: createDefaultConsolidateFn(
      '请将对话提炼为简洁摘要，100-150 字。',
      llmCall,
    ),
    // 所有 L2 → synthesis + insights
    integrateFn: createDefaultIntegrateFn(
      '请综合所有子会话的摘要，生成全局分析和定向建议。',
      llmCall,
    ),
  },

  // 能力配置
  capabilities: {
    lifecycle: { /* 生命周期钩子 */ },
    tools: { /* 工具定义与执行 */ },
    skills: new SkillRouterImpl(),
    confirm: { /* 分裂确认协议 */ },
  },

  // 调度策略：每 3 轮自动 consolidation，consolidation 后自动 integration
  orchestration: {
    scheduler: new Scheduler({
      consolidation: { trigger: 'everyNTurns', everyNTurns: 3 },
      integration: { trigger: 'afterConsolidate' },
    }),
  },
})
```

## 4. 与 Agent 对话

```typescript
// 进入 root session
await agent.enterSession(root.id)

// 发送消息，Agent 自动驱动 tool call 循环
const turn = await agent.turn(root.id, '帮我规划一个创业项目')
console.log(turn.finalContent)

// AI 识别到新话题时，会通过 stello_create_session 工具自动创建子 Session
// 你也可以手动 fork
const child = await agent.forkSession(root.id, {
  label: '市场调研',
  scope: 'market-research',
})

// 在子 Session 中对话
await agent.enterSession(child.id)
const childTurn = await agent.turn(child.id, '分析目标市场的竞争格局')
console.log(childTurn.finalContent)
```

## 5. 启动 DevTools 可视化

一行代码接入星空图调试面板：

```typescript
import { startDevtools } from '@stello-ai/devtools'

await startDevtools(agent, {
  port: 4800,
  open: true,  // 自动打开浏览器
})

// 浏览器访问 http://localhost:4800
// 看到：星空图拓扑 + 对话面板 + 实时事件流
```

DevTools 提供：
- **星空图** — 拖拽缩放，实时展示 Session 拓扑
- **对话面板** — 查看每个 Session 的对话历史
- **事件监控** — 实时追踪 consolidation、integration、fork 事件
- **配置面板** — 运行时调整 LLM、提示词、工具开关

## 下一步

接下来建议阅读 [核心概念](/docs/core-concepts/)，理解 Stello 的设计理念和架构。
