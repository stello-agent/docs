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

### createSessionTool

Stello 内置了 `stello_create_session` 工具，允许 LLM 主动创建新的子 Session（fork）：

```typescript
import { createSessionTool } from '@stello-ai/core'

// 在配置 Engine 时注册
const engine = createEngine({
  tools: [createSessionTool, weatherTool],
  // ...
})
```

## EngineToolRuntime

Engine 内部通过 `EngineToolRuntime` 管理工具的注册和执行：

```typescript
interface EngineToolRuntime {
  /** 获取所有工具的 LLM 定义（用于传递给 LLMAdapter） */
  getToolDefinitions(): ToolDefinition[]
  /** 执行指定工具 */
  executeTool(name: string, args: unknown): Promise<CallToolResult>
}
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
import { tool, createSessionTool, createEngine, createClaude } from '@stello-ai/core'
import { z } from 'zod'

const searchTool = tool(
  'search_docs',
  '搜索文档库',
  z.object({
    query: z.string().describe('搜索关键词'),
    limit: z.number().optional().default(5).describe('返回结果数量'),
  }),
  async (input) => {
    const results = await searchDocuments(input.query, input.limit)
    return {
      content: [{ type: 'text', text: JSON.stringify(results) }],
    }
  },
  { readOnlyHint: true, title: '文档搜索' }
)

const agent = createEngine({
  llm: createClaude({ apiKey: process.env.ANTHROPIC_API_KEY }),
  tools: [searchTool, createSessionTool],
  maxToolRounds: 10,
  // ...
})
```

## 注意事项

- **Session 不做 tool call 循环** -- Session 只做单次 LLM 调用，tool call 循环由 Engine（编排层）驱动
- **maxToolRounds** 默认为 5，防止无限循环。根据工具复杂度适当调整
- **错误处理**：工具执行出错时，返回 `{ content: [...], isError: true }`，LLM 会看到错误信息并尝试恢复
