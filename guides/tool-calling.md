# 工具调用

Stello 支持 LLM 工具调用（tool calling），通过 Engine 驱动的 tool call 循环实现多轮工具交互。

## 定义工具

使用 `tool()` 工厂函数定义工具，输入参数基于 Zod schema：

```typescript
import { tool } from '@stello-ai/core'
import { z } from 'zod'

const weatherTool = tool(
  'get_weather',
  '获取指定城市的天气信息',
  z.object({
    city: z.string().describe('城市名称'),
    unit: z.enum(['celsius', 'fahrenheit']).optional().describe('温度单位'),
  }),
  async (input) => {
    const weather = await fetchWeather(input.city, input.unit)
    return {
      content: [{ type: 'text', text: JSON.stringify(weather) }],
    }
  }
)
```

### tool() 参数

```typescript
function tool<T extends ZodType>(
  name: string,
  description: string,
  inputSchema: T,
  execute: (input: z.infer<T>) => Promise<CallToolResult>,
  extras?: ToolAnnotations
): Tool
```

## Tool 接口

```typescript
interface Tool {
  name: string
  description: string
  inputSchema: ZodType
  execute: (input: unknown) => Promise<CallToolResult>
  annotations?: ToolAnnotations
}
```

### CallToolResult

```typescript
interface CallToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}
```

### ToolAnnotations

为工具提供额外的元数据提示：

```typescript
interface ToolAnnotations {
  /** 工具是否只读（不产生副作用） */
  readOnlyHint?: boolean
  /** 工具是否幂等（重复调用结果相同） */
  idempotentHint?: boolean
  /** 工具的显示标题 */
  title?: string
}
```

## 内置工具

### stello_create_session

Engine 自动注入 `stello_create_session` 内置工具，允许 LLM 主动创建子 Session（fork）。无需手动注册。

LLM 可用参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `label` | string | 是 | 子会话的显示名称 |
| `systemPrompt` | string | 否 | 子会话的系统提示词，不提供则继承父会话 |
| `prompt` | string | 否 | 子会话的第一条 assistant 开场消息 |
| `context` | `'none'` \| `'inherit'` | 否 | 上下文继承策略，默认 `'none'` |
| `profile` | string | 否 | 预注册的 Fork Profile 名称（见下方） |
| `vars` | object | 否 | profile systemPrompt 模板的变量 |

### Fork Profile

Fork Profile 允许开发者预注册 fork 配置模板（LLM 适配器、工具集、systemPrompt 模板、上下文策略），LLM 在创建子 Session 时通过 `profile` 参数引用。

#### 注册 Profile

```typescript
import { ForkProfileRegistryImpl, createClaude } from '@stello-ai/core'

const profiles = new ForkProfileRegistryImpl()

// 研究型：强 LLM + 搜索工具 + 继承上下文
profiles.register('research', {
  systemPrompt: '你是深度研究助手，针对给定话题做详细调研和分析。',
  systemPromptMode: 'prepend',
  llm: createClaude({ model: 'claude-sonnet-4-5-20250514' }),
  tools: [webSearchTool, saveNoteTool],
  context: 'inherit',
})

// 轻量型：快速 LLM + 空上下文
profiles.register('lightweight', {
  llm: createClaude({ model: 'claude-haiku-4-5-20251001' }),
  context: 'none',
})

// 严格型：固定角色，LLM 不能覆盖 systemPrompt
profiles.register('region-expert', {
  systemPrompt: (vars) => `你是${vars.region}留学专家，只负责${vars.region}地区。`,
  systemPromptMode: 'preset',
})

// 注入 agent
const agent = createStelloAgent({
  // ...
  capabilities: {
    // ...
    profiles,
  },
})
```

注册 profile 后，`stello_create_session` 工具的参数中会自动出现 `profile` 和 `vars` 选项。

#### systemPrompt 合成策略

Profile 的 `systemPromptMode` 决定 profile prompt 与 LLM prompt 的叠加方式：

| 模式 | 行为 | 适用场景 |
|------|------|---------|
| `prepend`（默认） | profile prompt + LLM prompt | profile 定义角色骨架，LLM 补充上下文 |
| `append` | LLM prompt + profile prompt | LLM 写主体，profile 追加约束 |
| `preset` | 只用 profile prompt，忽略 LLM prompt | 严格控制角色定义 |

#### 不使用 Profile

不注册任何 profile 时，`stello_create_session` 的行为与之前完全一致——LLM 自由指定 `systemPrompt`、`prompt`、`context`。

## 注册工具：ToolRegistry

`ToolRegistryImpl` 是注册自定义工具的推荐方式。它实现了 `EngineToolRuntime` 接口，可直接作为 `capabilities.tools` 传入：

```typescript
import { ToolRegistryImpl } from '@stello-ai/core'

const toolRegistry = new ToolRegistryImpl()

toolRegistry.register({
  name: 'save_note',
  description: '保存调研结论',
  parameters: {
    type: 'object',
    properties: {
      note: { type: 'string', description: '要保存的内容' },
    },
    required: ['note'],
  },
  execute: async (args) => {
    await saveNote(args.note as string)
    return { success: true, data: { saved: true } }
  },
})

// 传入 StelloAgent
const agent = createStelloAgent({
  // ...
  capabilities: {
    tools: toolRegistry,  // 直接使用
    // ...
  },
})
```

Engine 自动在用户注册的工具之上注入内置工具（`stello_create_session`、`activate_skill`），无需手动注册。

### buildSessionToolList

Session 创建时需要告知 LLM 可用工具列表。`buildSessionToolList()` 合并内置工具和用户工具，输出 session 兼容格式：

```typescript
import { buildSessionToolList } from '@stello-ai/core'

const sessionTools = buildSessionToolList(toolRegistry, skillRouter, profiles)
// 传入 loadSession({ tools: sessionTools }) 或 createSession({ tools: sessionTools })
```

## Tool Call 循环

Engine 的 `turn()` 方法驱动 tool call 循环，流程如下：

1. 调用 `Session.send()` 获取 LLM 响应
2. 如果响应包含 `toolCalls`，调用 `executeTool()` 执行每个工具
3. 将工具执行结果作为 tool message 反馈给 LLM
4. 重复步骤 1-3，直到 LLM 不再请求工具调用
5. 如果达到 `maxToolRounds`（默认 5），循环终止并返回最后的响应

```
User Message
    ↓
Session.send() → LLM Response (with toolCalls)
    ↓
executeTool() → Tool Results
    ↓
Session.send() → LLM Response (with toolCalls)
    ↓
executeTool() → Tool Results
    ↓
Session.send() → LLM Response (no toolCalls) → 返回
```

## 完整示例

```typescript
import { ToolRegistryImpl, createStelloAgent } from '@stello-ai/core'
import { z } from 'zod'

// 注册自定义工具
const toolRegistry = new ToolRegistryImpl()

toolRegistry.register({
  name: 'search_docs',
  description: '搜索文档库',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索关键词' },
      limit: { type: 'number', description: '返回结果数量' },
    },
    required: ['query'],
  },
  execute: async (args) => {
    const results = await searchDocuments(args.query as string, args.limit as number)
    return { success: true, data: results }
  },
})

// Engine 自动注入 stello_create_session + activate_skill
const agent = createStelloAgent({
  // ...
  capabilities: {
    tools: toolRegistry,
    // ...
  },
})
```

## 内置工具：activate_skill

当 `SkillRouter` 中注册了 skill 时，Engine 自动在 tool 列表中追加一个 `activate_skill` 工具。LLM 看到所有已注册 skill 的 name + description，通过 tool call 按名称激活，Engine 返回 skill 的 content 作为 tool result 注入上下文。

```typescript
import { SkillRouterImpl } from '@stello-ai/core'

const skills = new SkillRouterImpl()

// 注册 skill：name + description 对 LLM 始终可见，content 在激活时注入
skills.register({
  name: 'code-review',
  description: '代码审查专家，提供详细的代码质量分析',
  content: `你是代码审查专家。请从以下维度分析代码：
  - 正确性：逻辑是否正确
  - 可维护性：命名、结构、注释
  - 安全性：输入验证、注入风险
  - 性能：不必要的计算、内存泄漏`,
})

// 传入 capabilities.skills
const agent = createStelloAgent({
  // ...
  capabilities: {
    // ...
    skills,
  },
})
```

无需手动注册 `activate_skill` tool——Engine 检测到有 skill 时自动处理。

### 从文件系统加载 Skill

除了代码注册，还可以从目录批量加载标准 SKILL.md 文件：

```typescript
import { SkillRouterImpl, loadSkillsFromDirectory } from '@stello-ai/core'

const skills = new SkillRouterImpl()

// 加载 ~/my-skills/skill-a/SKILL.md, ~/my-skills/skill-b/SKILL.md, ...
const loaded = await loadSkillsFromDirectory('~/my-skills')
for (const skill of loaded) skills.register(skill)
```

SKILL.md 使用 YAML frontmatter + markdown content：

```yaml
---
name: code-review
description: 代码审查专家
---
你是代码审查专家。请分析代码的正确性、可维护性和安全性。
```

DevTools 也支持通过 `skillDirs` 选项在启动时加载：

```typescript
await startDevtools(agent, {
  skillDirs: ['./skills', '~/.shared-skills'],
})

## 注意事项

- **Session 不做 tool call 循环** -- Session 只做单次 LLM 调用，tool call 循环由 Engine（编排层）驱动
- **maxToolRounds** 默认为 5，防止无限循环。根据工具复杂度适当调整
- **错误处理**：工具执行出错时，返回 `{ content: [...], isError: true }`，LLM 会看到错误信息并尝试恢复
