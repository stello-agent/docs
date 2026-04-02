# @stello-ai/devtools

开发调试工具包，为 StelloAgent 提供可视化调试界面，支持实时修改 LLM 配置、提示词、工具开关等。

## startDevtools

```typescript
function startDevtools(agent: StelloAgent, options?: DevtoolsOptions): Promise<DevtoolsInstance>
```

启动 DevTools 服务，绑定到指定的 StelloAgent 实例。

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

| 字段 | 默认值 | 说明 |
|------|-------|------|
| `port` | `4800` | 监听端口 |
| `open` | `true` | 是否自动打开浏览器 |
| `llm` | - | LLM 配置提供者 |
| `prompts` | - | Consolidation/Integration 提示词提供者 |
| `sessionAccess` | - | Session 级别访问能力 |
| `tools` | - | Tools 动态开关提供者 |
| `skills` | - | Skills 动态开关提供者 |
| `skillDirs` | - | 从文件系统加载 SKILL.md 的目录列表，支持 `~` 展开 |
| `integration` | - | 手动触发 integration 的回调 |
| `reset` | - | 清空数据并重新初始化的回调 |
| `stateStore` | - | 全局 DevTools 状态持久化 |

### DevtoolsInstance

```typescript
interface DevtoolsInstance {
  port: number
  close(): Promise<void>
}
```

| 字段 | 说明 |
|------|------|
| `port` | 实际监听端口 |
| `close` | 关闭 DevTools 服务 |

## Provider 接口

DevTools 通过 Provider 模式实现各功能面板。每个 Provider 独立可选，未提供的 Provider 对应的面板将被禁用。

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

LLM 配置的 getter/setter，由调用方实现具体的 adapter 切换逻辑。

### PromptProvider

```typescript
interface PromptProvider {
  getPrompts(): { consolidate: string; integrate: string }
  setPrompts(prompts: { consolidate?: string; integrate?: string }): void
}
```

Consolidation 和 Integration 提示词的读写。

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

Session 级别的数据访问。带 `?` 的方法为可选扩展。

### ToolsProvider

```typescript
interface ToolsProvider {
  getTools(): Array<{ name: string; description: string; parameters?: Record<string, unknown>; enabled: boolean }>
  setEnabled(toolName: string, enabled: boolean): void
}
```

工具列表和动态开关。

### SkillsProvider

```typescript
interface SkillsProvider {
  getSkills(): Array<{ name: string; description: string; enabled: boolean }>
  setEnabled(skillName: string, enabled: boolean): void
}
```

技能列表和动态开关。

### IntegrationProvider

```typescript
interface IntegrationProvider {
  trigger(): Promise<{ synthesis: string; insightCount: number }>
}
```

手动触发一次 integration cycle，返回 synthesis 和推送的 insight 数量。

### ResetProvider

```typescript
interface ResetProvider {
  reset(): Promise<void>
  getDataDir?(): string
}
```

| 方法 | 说明 |
|------|------|
| `reset` | 清空数据并重新初始化运行时 |
| `getDataDir` | 返回数据目录的绝对路径，供前端展示 |

## DevtoolsStateStore

```typescript
interface DevtoolsStateStore {
  load(): Promise<DevtoolsPersistedState | null>
  save(state: DevtoolsPersistedState): Promise<void>
  reset?(): Promise<void>
}
```

DevTools 全局状态的持久化存储接口。启动时调用 `load()` 恢复上次状态，变更时调用 `save()` 保存。

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

| 字段 | 说明 |
|------|------|
| `hotConfig` | 运行时热更新配置 |
| `llm` | LLM 配置快照 |
| `prompts` | 提示词快照 |
| `disabledTools` | 被禁用的工具名称列表 |
| `disabledSkills` | 被禁用的技能名称列表 |
