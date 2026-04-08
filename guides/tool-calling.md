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

const agent = createStelloAgent({
  // ...
  capabilities: {
    tools: toolRegistry,
  },
})
```

Engine 自动在用户注册的工具之上注入内置工具（`stello_create_session`、`activate_skill`），无需手动注册。

### buildSessionToolList

Session 创建时需要告知 LLM 可用工具列表。`buildSessionToolList()` 合并内置工具和用户工具，输出 session 兼容格式：

```typescript
import { buildSessionToolList } from '@stello-ai/core'

const sessionTools = buildSessionToolList(toolRegistry, skillRouter, profiles)
```

## 内置工具：stello_create_session {#stello-create-session}

Engine 自动注入 `stello_create_session` 内置工具，允许 LLM 主动创建子 Session（fork）。无需手动注册。

### LLM 可见参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `label` | string | 是 | 子会话的显示名称 |
| `systemPrompt` | string | 否 | 子会话的系统提示词（与 profile 合成，见下方） |
| `prompt` | string | 否 | 子会话的第一条 assistant 开场消息 |
| `context` | `'none'` \| `'inherit'` | 否 | 上下文继承策略，默认 `'none'` |
| `profile` | string | 否 | 预注册的 Fork Profile 名称（有注册时才出现） |
| `vars` | object | 否 | profile systemPrompt 模板的变量（有注册时才出现） |

### 执行流程

当 LLM 调用 `stello_create_session` 时，Engine 执行以下步骤：

```
1. 解析 profile（如指定）
2. 合成 systemPrompt（profile prompt + LLM prompt，按 mode 决定）
3. 确定 context 策略（profile.contextFn > profile.context > args.context）
4. 调用 Engine.forkSession()
   a. 创建拓扑节点（生成 ID）
   b. 调用 parentSession.fork({ id, systemPrompt, context, prompt, llm, tools })
   c. 触发 onSessionFork 事件
5. 返回 { sessionId, label }
```

### context 参数详解

`context` 决定子 Session 启动时拥有多少父 Session 的对话历史：

| 值 | 行为 | 使用场景 |
|---|------|---------|
| `'none'`（默认） | 子 Session 以空 L3 启动 | 独立主题、全新任务 |
| `'inherit'` | 完整拷贝父 Session 的 L3 记录 | 需要完整上下文的子任务 |
| `ForkContextFn`（仅 profile） | 自定义转换函数处理父 L3 | LLM 压缩摘要、选择性继承 |

LLM 只能选择 `'none'` 或 `'inherit'`。`ForkContextFn` 由开发者通过 profile 预设，LLM 无法直接指定——这是有意的安全设计。

### systemPrompt 参数详解

子 Session 的 systemPrompt 有三种来源，取决于是否使用 profile：

**不使用 profile 时：**
- LLM 提供 `systemPrompt` → 直接使用
- LLM 不提供 → 继承父 Session 的 systemPrompt

**使用 profile 时：** 由 `systemPromptMode` 决定合成方式（见 [Fork Profile](#fork-profile) 章节）。

## Fork Profile {#fork-profile}

Fork Profile 允许开发者预注册 fork 配置模板。LLM 在创建子 Session 时通过 `profile` 参数引用，Engine 自动解析并应用。

### 注册 Profile

```typescript
import { ForkProfileRegistryImpl } from '@stello-ai/core'

const profiles = new ForkProfileRegistryImpl()

profiles.register('research', {
  systemPrompt: '你是深度研究助手，针对给定话题做详细调研和分析。',
  systemPromptMode: 'prepend',
  llm: createClaude({ model: 'claude-sonnet-4-5-20250514' }),
  tools: [webSearchTool, saveNoteTool],
  context: 'inherit',
})

const agent = createStelloAgent({
  capabilities: {
    profiles,
    // ...
  },
})
```

注册 profile 后，`stello_create_session` 工具的参数列表中会自动出现 `profile`（枚举所有已注册名）和 `vars`。

### Profile 配置字段

```typescript
interface ForkProfile {
  /** 系统提示词模板；字符串或接收 vars 的函数 */
  systemPrompt?: string | ((vars: Record<string, string>) => string)
  /** systemPrompt 合成策略，默认 'prepend' */
  systemPromptMode?: 'preset' | 'prepend' | 'append'
  /** 覆盖子 Session 的 LLM 适配器 */
  llm?: LLMAdapter
  /** 覆盖子 Session 的工具列表 */
  tools?: LLMCompleteOptions['tools']
  /** 上下文继承策略（字符串值） */
  context?: 'none' | 'inherit'
  /** 自定义上下文转换函数（优先于 context 字段） */
  contextFn?: ForkContextFn
  /** 可用 skill 白名单；不传 = 全部可用，空数组 = 禁用 activate_skill */
  skills?: string[]
}
```

### systemPromptMode：三种合成策略

当 profile 定义了 `systemPrompt`，它需要与 LLM 调用时提供的 `systemPrompt` 合成。`systemPromptMode` 决定合成方式：

#### `prepend`（默认）— profile 在前，LLM 在后

```
最终 systemPrompt = [profile prompt] + "\n\n" + [LLM prompt]
```

适用场景：profile 定义角色骨架，LLM 根据当前对话补充具体上下文。

```typescript
profiles.register('research', {
  systemPrompt: '你是深度研究助手。',
  systemPromptMode: 'prepend',  // 默认值
})
```

LLM 调用 `stello_create_session({ profile: 'research', systemPrompt: '当前话题是量子计算' })`

→ 最终 systemPrompt：`"你是深度研究助手。\n\n当前话题是量子计算"`

#### `append` — LLM 在前，profile 在后

```
最终 systemPrompt = [LLM prompt] + "\n\n" + [profile prompt]
```

适用场景：LLM 写主体内容，profile 在末尾追加固定约束（格式要求、安全规则等）。

```typescript
profiles.register('strict-format', {
  systemPrompt: '所有回复必须使用 JSON 格式。',
  systemPromptMode: 'append',
})
```

#### `preset` — 完全使用 profile，忽略 LLM

```
最终 systemPrompt = [profile prompt]（LLM 提供的被丢弃）
```

适用场景：严格控制子 Session 角色，不允许 LLM 修改。

```typescript
profiles.register('region-expert', {
  systemPrompt: (vars) => `你是${vars.region}留学专家，只负责${vars.region}地区的咨询。`,
  systemPromptMode: 'preset',
})
```

LLM 调用 `stello_create_session({ profile: 'region-expert', vars: { region: '美国' } })`

→ 最终 systemPrompt：`"你是美国留学专家，只负责美国地区的咨询。"`（LLM 的 systemPrompt 被忽略）

### contextFn：自定义上下文转换

`contextFn` 是最灵活的上下文继承方式。它接收父 Session 的完整 L3 记录，返回写入子 Session 的记录。

```typescript
type ForkContextFn = (parentRecords: Message[]) => Message[] | Promise<Message[]>
```

优先级：`contextFn` > `context` 字段。如果 profile 同时定义了 `contextFn` 和 `context`，使用 `contextFn`。

#### 示例：LLM 压缩上下文

```typescript
profiles.register('us-child', {
  systemPrompt: '你是美国留学选校专家...',
  systemPromptMode: 'preset',
  contextFn: async (parentRecords) => {
    // 用 LLM 将完整对话压缩为摘要
    const result = await llm.complete([
      { role: 'system', content: '将以下对话压缩为关键信息摘要，保留重要决策和偏好。' },
      { role: 'user', content: parentRecords.map(r => `${r.role}: ${r.content}`).join('\n') },
    ])
    return [{ role: 'assistant', content: result.content! }]
  },
})
```

#### 示例：过滤特定角色

```typescript
profiles.register('user-only-context', {
  contextFn: (parentRecords) => parentRecords.filter(r => r.role === 'user'),
})
```

#### 示例：截取最近 N 条

```typescript
profiles.register('recent-context', {
  context: 'inherit',  // 被 contextFn 覆盖
  contextFn: (parentRecords) => parentRecords.slice(-10),
})
```

### 不使用 Profile

不注册任何 profile 时，`stello_create_session` 的行为与之前完全一致——LLM 自由指定 `systemPrompt`、`prompt`、`context`，工具参数列表中不出现 `profile` 和 `vars`。

### Profile 与 Skill 配合

Profile 定义技术能力（LLM、工具、上下文策略），Skill 定义行为指导（prompt injection）。两者配合使用效果最佳：

```typescript
// Profile：技术配置
profiles.register('us-child', {
  systemPrompt: '你是美国留学选校专家...',
  systemPromptMode: 'preset',
  contextFn: compressWithLLM,
})

// Skill：行为指导
skills.register({
  name: 'us-study-abroad',
  description: '美国留学选校助手',
  content: `你是美国留学助手。当用户讨论美国相关话题时：
1. 使用 profile "us-child" 创建子会话
2. 在 label 中包含具体学校或地区名称
3. 不要在 systemPrompt 中重复 profile 已定义的角色（preset 模式会忽略）`,
})
```

LLM 流程：
1. 激活 skill `us-study-abroad` → 获得行为指导
2. 调用 `stello_create_session({ label: '美国选校-MIT', profile: 'us-child' })`
3. Engine 解析 profile → preset systemPrompt + contextFn 压缩上下文
4. 子 Session 以专家角色 + 压缩上下文启动

### Per-Session Skills：控制子 Session 的能力边界 {#per-session-skills}

`ForkProfile.skills` 白名单控制 fork 出的子 Session 能使用哪些 skill。这让你可以精确限定每种子 Session 的能力范围。

| `skills` 值 | 行为 |
|-------------|------|
| `undefined`（不传） | 继承全局所有 skills |
| `['a', 'b']` | 只能 `activate_skill` 白名单内的 skills |
| `[]`（空数组） | 完全禁用 `activate_skill` 工具 |

#### 示例：留学咨询系统 — 用 Skill 控制子 Session 的 fork 种类

一个留学咨询 Agent，Main Session 是总顾问，可以创建不同国家的子 Session。每个国家的子 Session 只能创建属于该国的更细分 Session（如选校、文书），不能跨国创建。

```typescript
// ─── Skills：定义各种创建子 Session 的行为指导 ───

skills.register({
  name: 'create-us-session',
  description: '创建美国留学相关的子会话（选校、文书、签证）',
  content: `当需要深入讨论美国留学的具体方向时，创建子会话：
- 选校方向：stello_create_session({ label: '美国选校-...', profile: 'us-child' })
- 文书方向：stello_create_session({ label: '美国文书-...', profile: 'us-child' })
确保 label 包含具体学校或方向名称。`,
})

skills.register({
  name: 'create-uk-session',
  description: '创建英国留学相关的子会话（选校、文书、签证）',
  content: `当需要深入讨论英国留学的具体方向时，创建子会话：
- 选校方向：stello_create_session({ label: '英国选校-...', profile: 'uk-child' })
- 文书方向：stello_create_session({ label: '英国文书-...', profile: 'uk-child' })
确保 label 包含具体学校或方向名称。`,
})

skills.register({
  name: 'general-research',
  description: '通用调研助手',
  content: '使用搜索工具深入调研用户关心的话题，提供结构化报告。',
})

// ─── Profiles：定义技术配置 + skills 白名单 ───

// 美国方向：只能用 create-us-session 和 general-research
profiles.register('us-region', {
  systemPrompt: '你是美国留学专家，负责美国方向的所有咨询。',
  systemPromptMode: 'preset',
  skills: ['create-us-session', 'general-research'],
})

// 英国方向：只能用 create-uk-session 和 general-research
profiles.register('uk-region', {
  systemPrompt: '你是英国留学专家，负责英国方向的所有咨询。',
  systemPromptMode: 'preset',
  skills: ['create-uk-session', 'general-research'],
})

// 美国子任务：不需要继续 fork，禁用所有 skills
profiles.register('us-child', {
  systemPrompt: '你是美国留学选校顾问，专注于具体的选校分析。',
  systemPromptMode: 'preset',
  skills: [],  // 叶子节点，不需要 activate_skill
})

profiles.register('uk-child', {
  systemPrompt: '你是英国留学选校顾问，专注于具体的选校分析。',
  systemPromptMode: 'preset',
  skills: [],
})
```

运行时效果：

```
Main Session（全局所有 skills）
├─ 美国方向 session（profile: 'us-region'）
│  ├─ activate_skill 可见：create-us-session, general-research
│  ├─ activate_skill 不可见：create-uk-session ← 无法创建英国子会话
│  └─ 美国选校-MIT session（profile: 'us-child', skills: []）
│     └─ 无 activate_skill 工具 ← 叶子节点，专注执行
├─ 英国方向 session（profile: 'uk-region'）
│  ├─ activate_skill 可见：create-uk-session, general-research
│  └─ activate_skill 不可见：create-us-session
```

关键设计点：

- **Skill 定义"怎么 fork"**：skill content 告诉 LLM 用哪个 profile、如何填写参数
- **Profile.skills 定义"能用哪些 skill"**：白名单控制子 Session 的能力边界
- **两者组合形成 skill → fork → skill 链路**：Main Session 的 skill 引导创建子 Session，子 Session 的 skills 白名单又限定了它能做什么

::: tip
`skills` 白名单只影响 `activate_skill` 工具的可见范围，不影响 `stello_create_session` 工具本身。即使 `skills: []` 的子 Session 仍然可以通过 `stello_create_session` 直接创建子 Session（如果 LLM 自行决定），但它没有 skill 来指导如何创建。通常 LLM 在没有相关 skill 的情况下不会主动 fork。
:::

## 内置工具：activate_skill

当 `SkillRouter` 中注册了 skill 时，Engine 自动在 tool 列表中追加一个 `activate_skill` 工具。LLM 看到所有已注册 skill 的 name + description，通过 tool call 按名称激活，Engine 返回 skill 的 content 作为 tool result 注入上下文。

```typescript
import { SkillRouterImpl } from '@stello-ai/core'

const skills = new SkillRouterImpl()

skills.register({
  name: 'code-review',
  description: '代码审查专家，提供详细的代码质量分析',
  content: `你是代码审查专家。请从以下维度分析代码：
  - 正确性：逻辑是否正确
  - 可维护性：命名、结构、注释
  - 安全性：输入验证、注入风险
  - 性能：不必要的计算、内存泄漏`,
})

const agent = createStelloAgent({
  capabilities: { skills },
})
```

无需手动注册 `activate_skill` tool——Engine 检测到有 skill 时自动处理。

### 从文件系统加载 Skill

```typescript
import { SkillRouterImpl, loadSkillsFromDirectory } from '@stello-ai/core'

const skills = new SkillRouterImpl()
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
import {
  ToolRegistryImpl,
  SkillRouterImpl,
  ForkProfileRegistryImpl,
  buildSessionToolList,
  createStelloAgent,
} from '@stello-ai/core'

// 注册自定义工具
const toolRegistry = new ToolRegistryImpl()
toolRegistry.register({
  name: 'search_docs',
  description: '搜索文档库',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索关键词' },
    },
    required: ['query'],
  },
  execute: async (args) => {
    const results = await searchDocuments(args.query as string)
    return { success: true, data: results }
  },
})

// 注册 Fork Profile
const profiles = new ForkProfileRegistryImpl()
profiles.register('deep-research', {
  systemPrompt: '你是深度研究助手，针对给定话题做详细调研。',
  systemPromptMode: 'prepend',
  llm: createClaude({ model: 'claude-sonnet-4-5-20250514' }),
  tools: [webSearchTool],
  contextFn: async (records) => records.slice(-20),
  skills: ['research-mode'],  // 研究子 Session 只能用研究相关的 skill
})

// 注册 Skill
const skills = new SkillRouterImpl()
skills.register({
  name: 'research-mode',
  description: '深度研究模式',
  content: '当需要深入调研时，使用 profile "deep-research" 创建子会话。',
})

// 创建 Agent
const agent = createStelloAgent({
  capabilities: {
    tools: toolRegistry,
    skills,
    profiles,
    // ...
  },
})
```

## 注意事项

- **Session 不做 tool call 循环** -- Session 只做单次 LLM 调用，tool call 循环由 Engine（编排层）驱动
- **maxToolRounds** 默认为 5，防止无限循环。根据工具复杂度适当调整
- **错误处理**：工具执行出错时，返回 `{ content: [...], isError: true }`，LLM 会看到错误信息并尝试恢复
- **内置工具优先**：如果用户注册了同名工具（如 `stello_create_session`），Engine 内置版优先，用户版被过滤
