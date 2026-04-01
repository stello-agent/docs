# Custom LLM Adapter

Stello abstracts LLM calls through the `LLMAdapter` interface. You can use built-in adapters or implement your own.

## LLMAdapter Interface

```typescript
interface LLMAdapter {
  /** Single completion call */
  complete(messages: Message[], options: LLMCompleteOptions): Promise<LLMResult>
  /** Streaming completion (optional), falls back to complete if not implemented */
  stream?(messages: Message[], options: LLMCompleteOptions): AsyncIterable<LLMChunk>
  /** Max context tokens, used for auto-compression threshold */
  maxContextTokens: number
}
```

## Built-in Adapters

Stello provides the following ready-to-use adapter factories:

### Anthropic Claude

```typescript
import { createClaude } from '@stello-ai/core'

const adapter = createClaude({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-20250514', // default
})
```

Supported models:
- `claude-opus-4-20250514`
- `claude-sonnet-4-20250514`
- `claude-haiku-4-5-20251001`

### OpenAI GPT

```typescript
import { createGPT } from '@stello-ai/core'

const adapter = createGPT({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o', // default
})
```

Supported models:
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-4.1`
- And other OpenAI-compatible models

### Generic Adapters

For OpenAI-compatible third-party services:

```typescript
import { createOpenAICompatibleAdapter } from '@stello-ai/core'

const adapter = createOpenAICompatibleAdapter({
  baseURL: 'https://your-provider.com/v1',
  apiKey: 'your-key',
  model: 'your-model',
  maxContextTokens: 128000,
})
```

For Anthropic-compatible services:

```typescript
import { createAnthropicAdapter } from '@stello-ai/core'

const adapter = createAnthropicAdapter({
  baseURL: 'https://your-proxy.com',
  apiKey: 'your-key',
  model: 'claude-sonnet-4-20250514',
})
```

## Implementing a Custom Adapter

Implement the `LLMAdapter` interface to connect any LLM:

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

## Core Types

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

## Tips

- **Stream fallback**: If the adapter does not implement `stream()`, Engine automatically falls back to `complete()` with no functional impact
- **Context compression**: `maxContextTokens` drives auto-compression -- when context reaches 80% capacity, Engine triggers consolidation
- **Multi-adapter scenarios**: ConsolidateFn and IntegrateFn choose their own LLM via closures, allowing different models for different tasks (e.g., Haiku for summarization, Sonnet for conversation)
