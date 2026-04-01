# 自定义 LLM 适配器

Stello 通过 `LLMAdapter` 接口抽象 LLM 调用，你可以使用内置适配器或实现自定义适配器。

## LLMAdapter 接口

```typescript
interface LLMAdapter {
  /** 单次补全调用 */
  complete(messages: Message[], options: LLMCompleteOptions): Promise<LLMResult>
  /** 流式补全（可选），未实现时自动降级为 complete */
  stream?(messages: Message[], options: LLMCompleteOptions): AsyncIterable<LLMChunk>
  /** 最大上下文 token 数，用于自动压缩判断 */
  maxContextTokens: number
}
```

## 内置适配器

Stello 提供以下开箱即用的适配器工厂函数：

### Anthropic Claude

```typescript
import { createClaude } from '@stello-ai/core'

const adapter = createClaude({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-20250514', // 默认
})
```

支持的模型：
- `claude-opus-4-20250514`
- `claude-sonnet-4-20250514`
- `claude-haiku-4-5-20251001`

### OpenAI GPT

```typescript
import { createGPT } from '@stello-ai/core'

const adapter = createGPT({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o', // 默认
})
```

支持的模型：
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-4.1`
- 以及其他 OpenAI 兼容模型

### 通用适配器

对于 OpenAI 兼容的第三方服务：

```typescript
import { createOpenAICompatibleAdapter } from '@stello-ai/core'

const adapter = createOpenAICompatibleAdapter({
  baseURL: 'https://your-provider.com/v1',
  apiKey: 'your-key',
  model: 'your-model',
  maxContextTokens: 128000,
})
```

对于 Anthropic 兼容的服务：

```typescript
import { createAnthropicAdapter } from '@stello-ai/core'

const adapter = createAnthropicAdapter({
  baseURL: 'https://your-proxy.com',
  apiKey: 'your-key',
  model: 'claude-sonnet-4-20250514',
})
```

## 实现自定义适配器

实现 `LLMAdapter` 接口即可接入任何 LLM：

```typescript
import type { LLMAdapter, Message, LLMCompleteOptions, LLMResult } from '@stello-ai/core'

const myAdapter: LLMAdapter = {
  maxContextTokens: 32000,

  async complete(messages: Message[], options: LLMCompleteOptions): Promise<LLMResult> {
    const response = await callYourLLM(messages, {
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      tools: options.tools,
    })

    return {
      content: response.text,
      toolCalls: response.toolCalls ?? [],
      usage: {
        inputTokens: response.usage.input,
        outputTokens: response.usage.output,
      },
    }
  },
}
```

## 核心类型

### Message

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  toolCalls?: ToolCall[]
}
```

### LLMResult

```typescript
interface LLMResult {
  content: string
  toolCalls: ToolCall[]
  usage?: { inputTokens: number; outputTokens: number }
}
```

### LLMChunk

```typescript
interface LLMChunk {
  content?: string
  toolCalls?: ToolCall[]
}
```

### LLMCompleteOptions

```typescript
interface LLMCompleteOptions {
  maxTokens?: number
  temperature?: number
  tools?: ToolDefinition[]
}
```

## 使用技巧

- **流式降级**：如果适配器没有实现 `stream()` 方法，Engine 会自动降级使用 `complete()`，不影响功能
- **上下文压缩**：`maxContextTokens` 用于自动压缩判断 -- 当上下文达到 80% 容量时，Engine 会触发 consolidation
- **多适配器场景**：ConsolidateFn 和 IntegrateFn 通过闭包自行选择 LLM，可以使用与主对话不同的模型（例如用 Haiku 做提炼，用 Sonnet 做对话）
