# @stello-ai/devtools

Development debugging toolkit providing a visual debugging interface for StelloAgent, with runtime modification of LLM config, prompts, tool toggles, and more.

## startDevtools

```typescript
function startDevtools(agent: StelloAgent, options?: DevtoolsOptions): Promise<DevtoolsInstance>
```

Start the DevTools server, bound to a StelloAgent instance.

### DevtoolsOptions

```typescript
interface DevtoolsOptions {
  port?: number
  open?: boolean
  llm?: LLMConfigProvider
  prompts?: PromptProvider
  sessionAccess?: SessionAccessProvider
  tools?: ToolsProvider
  skills?: SkillsProvider
  skillDirs?: string[]
  integration?: IntegrationProvider
  reset?: ResetProvider
  stateStore?: DevtoolsStateStore
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `port` | `4800` | Listening port |
| `open` | `true` | Whether to auto-open the browser |
| `llm` | - | LLM configuration provider |
| `prompts` | - | Consolidation/Integration prompt provider |
| `sessionAccess` | - | Session-level access capabilities |
| `tools` | - | Tool toggle provider |
| `skills` | - | Skill toggle provider |
| `skillDirs` | - | Directories to load SKILL.md files from, supports `~` expansion |
| `integration` | - | Callback to manually trigger integration |
| `reset` | - | Callback to clear data and reinitialize |
| `stateStore` | - | Global DevTools state persistence |

### DevtoolsInstance

```typescript
interface DevtoolsInstance {
  port: number
  close(): Promise<void>
}
```

| Field | Description |
|-------|-------------|
| `port` | Actual listening port |
| `close` | Shut down the DevTools server |

## Provider Interfaces

DevTools uses a Provider pattern for each feature panel. Each Provider is independently optional; panels for missing Providers are disabled.

### LLMConfigProvider

```typescript
interface LLMConfigProvider {
  getConfig(): {
    model: string
    baseURL: string
    apiKey?: string
    temperature?: number
    maxTokens?: number
  }
  setConfig(config: {
    model: string
    baseURL: string
    apiKey?: string
    temperature?: number
    maxTokens?: number
  }): void
}
```

Getter/setter for LLM configuration. The caller implements the actual adapter switching logic.

### PromptProvider

```typescript
interface PromptProvider {
  getPrompts(): { consolidate: string; integrate: string }
  setPrompts(prompts: { consolidate?: string; integrate?: string }): void
}
```

Read and write consolidation and integration prompts.

### SessionAccessProvider

```typescript
interface SessionAccessProvider {
  getSystemPrompt(sessionId: string): Promise<string | null>
  setSystemPrompt(sessionId: string, content: string): Promise<void>
  getConsolidatePrompt?(sessionId: string): Promise<string | null>
  setConsolidatePrompt?(sessionId: string, content: string): Promise<void>
  getIntegratePrompt?(sessionId: string): Promise<string | null>
  setIntegratePrompt?(sessionId: string, content: string): Promise<void>
  getScope?(sessionId: string): Promise<string | null>
  setScope?(sessionId: string, content: string): Promise<void>
  injectRecord?(sessionId: string, record: { role: string; content: string }): Promise<void>
}
```

Session-level data access. Methods marked with `?` are optional extensions.

### ToolsProvider

```typescript
interface ToolsProvider {
  getTools(): Array<{ name: string; description: string; parameters?: Record<string, unknown>; enabled: boolean }>
  setEnabled(toolName: string, enabled: boolean): void
}
```

Tool listing and dynamic toggles.

### SkillsProvider

```typescript
interface SkillsProvider {
  getSkills(): Array<{ name: string; description: string; enabled: boolean }>
  setEnabled(skillName: string, enabled: boolean): void
}
```

Skill listing and dynamic toggles.

### IntegrationProvider

```typescript
interface IntegrationProvider {
  trigger(): Promise<{ synthesis: string; insightCount: number }>
}
```

Manually trigger an integration cycle, returning the synthesis and the number of pushed insights.

### ResetProvider

```typescript
interface ResetProvider {
  reset(): Promise<void>
  getDataDir?(): string
}
```

| Method | Description |
|--------|-------------|
| `reset` | Clear data and reinitialize the runtime |
| `getDataDir` | Return the absolute path of the data directory for UI display |

## DevtoolsStateStore

```typescript
interface DevtoolsStateStore {
  load(): Promise<DevtoolsPersistedState | null>
  save(state: DevtoolsPersistedState): Promise<void>
  reset?(): Promise<void>
}
```

Persistence interface for global DevTools state. Calls `load()` on startup to restore the previous state, and `save()` on changes.

### DevtoolsPersistedState

```typescript
interface DevtoolsPersistedState {
  hotConfig?: StelloAgentHotConfig
  llm?: {
    model: string
    baseURL: string
    apiKey?: string
    temperature?: number
    maxTokens?: number
  }
  prompts?: {
    consolidate?: string
    integrate?: string
  }
  disabledTools?: string[]
  disabledSkills?: string[]
}
```

| Field | Description |
|-------|-------------|
| `hotConfig` | Runtime hot-update configuration |
| `llm` | LLM configuration snapshot |
| `prompts` | Prompt snapshot |
| `disabledTools` | List of disabled tool names |
| `disabledSkills` | List of disabled skill names |
