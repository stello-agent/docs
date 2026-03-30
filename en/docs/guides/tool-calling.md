# Tool Calling

Stello supports LLM tool calling through an Engine-driven tool call loop for multi-round tool interactions.

## Defining Tools

Use the `tool()` factory function with Zod-based input schemas:

```typescript
import { tool } from '@stello-ai/core'
import { z } from 'zod'

const weatherTool = tool(
  'get_weather',
  'Get weather information for a city',
  z.object({
    city: z.string().describe('City name'),
    unit: z.enum(['celsius', 'fahrenheit']).optional().describe('Temperature unit'),
  }),
  async (input) => {
    const weather = await fetchWeather(input.city, input.unit)
    return {
      content: [{ type: 'text', text: JSON.stringify(weather) }],
    }
  }
)
```

### tool() Parameters

```typescript
function tool<T extends ZodType>(
  name: string,
  description: string,
  inputSchema: T,
  execute: (input: z.infer<T>) => Promise<CallToolResult>,
  extras?: ToolAnnotations
): Tool
```

## Tool Interface

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

Provide additional metadata hints for tools:

```typescript
interface ToolAnnotations {
  /** Whether the tool is read-only (no side effects) */
  readOnlyHint?: boolean
  /** Whether the tool is idempotent (repeated calls yield same result) */
  idempotentHint?: boolean
  /** Display title for the tool */
  title?: string
}
```

## Built-in Tools

### createSessionTool

Stello includes a built-in `stello_create_session` tool that allows the LLM to proactively create new child Sessions (fork):

```typescript
import { createSessionTool } from '@stello-ai/core'

// Register when configuring Engine
const engine = createEngine({
  tools: [createSessionTool, weatherTool],
  // ...
})
```

## EngineToolRuntime

Engine internally manages tool registration and execution via `EngineToolRuntime`:

```typescript
interface EngineToolRuntime {
  /** Get all tool definitions for LLM (passed to LLMAdapter) */
  getToolDefinitions(): ToolDefinition[]
  /** Execute a tool by name */
  executeTool(name: string, args: unknown): Promise<CallToolResult>
}
```

## Tool Call Loop

The Engine's `turn()` method drives the tool call loop:

1. Call `Session.send()` to get LLM response
2. If the response contains `toolCalls`, call `executeTool()` for each tool
3. Feed tool execution results back to the LLM as tool messages
4. Repeat steps 1-3 until the LLM stops requesting tool calls
5. If `maxToolRounds` (default 5) is reached, the loop terminates and returns the last response

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
Session.send() → LLM Response (no toolCalls) → Return
```

## Full Example

```typescript
import { tool, createSessionTool, createEngine, createClaude } from '@stello-ai/core'
import { z } from 'zod'

const searchTool = tool(
  'search_docs',
  'Search the document library',
  z.object({
    query: z.string().describe('Search keywords'),
    limit: z.number().optional().default(5).describe('Number of results'),
  }),
  async (input) => {
    const results = await searchDocuments(input.query, input.limit)
    return {
      content: [{ type: 'text', text: JSON.stringify(results) }],
    }
  },
  { readOnlyHint: true, title: 'Document Search' }
)

const agent = createEngine({
  llm: createClaude({ apiKey: process.env.ANTHROPIC_API_KEY }),
  tools: [searchTool, createSessionTool],
  maxToolRounds: 10,
  // ...
})
```

## Notes

- **Session does not run tool call loops** -- Session only makes a single LLM call; the tool call loop is driven by Engine (orchestration layer)
- **maxToolRounds** defaults to 5 to prevent infinite loops. Adjust based on tool complexity
- **Error handling**: When tool execution fails, return `{ content: [...], isError: true }` so the LLM sees the error and can attempt recovery
