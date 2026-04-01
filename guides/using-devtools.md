# 使用 DevTools

Stello DevTools 提供可视化调试界面，包括星空图拓扑可视化、对话面板、事件监控和配置面板。

## 安装

```bash
pnpm add -D @stello-ai/devtools
```

## 基本使用

```typescript
import { startDevtools } from '@stello-ai/devtools'

const agent = createEngine({
  // ... 你的 agent 配置
})

// 启动 DevTools 开发服务器
await startDevtools(agent, {
  port: 4800, // 默认端口
  open: true, // 自动打开浏览器
})
```

访问 `http://localhost:4800` 即可看到 DevTools 界面。

## DevtoolsOptions

```typescript
interface DevtoolsOptions {
  /** DevTools 服务端口，默认 4800 */
  port?: number
  /** 是否自动打开浏览器，默认 true */
  open?: boolean
}
```

## 可选 Provider

`startDevtools` 的第二个参数支持注入可选的 provider，用于增强 DevTools 的功能：

```typescript
await startDevtools(agent, {
  port: 4800,

  /** LLM 适配器，用于在 DevTools 中发送测试消息 */
  llm: adapter,

  /** prompt 管理 */
  prompts: promptProvider,

  /** Session 访问接口 */
  sessionAccess: sessionAccessProvider,

  /** 工具列表展示 */
  tools: toolProvider,

  /** 技能列表展示 */
  skills: skillProvider,

  /** Integration 状态查看 */
  integration: integrationProvider,

  /** 重置功能 */
  reset: resetProvider,

  /** 状态持久化存储 */
  stateStore: myStateStore,
})
```

## 功能概览

### 星空图可视化

以交互式星空图的形式展示 Session 拓扑结构。每个 Session 是一颗"星星"，Main Session 在中心，子 Session 围绕展开。支持：
- 点击节点查看 Session 详情
- 拖拽节点调整布局
- 节点位置持久化保存

### 对话面板

选中某个 Session 后，查看其完整对话历史（L3），并可直接发送测试消息。

### 事件监控

实时展示 Engine 事件流，包括：
- Session 创建/切换
- Consolidation/Integration 触发
- Tool call 执行
- 错误事件

### 配置面板

查看和修改运行时配置，包括 system prompt、工具列表、调度策略等。

## 状态持久化

DevTools 支持通过 `DevtoolsStateStore` 持久化节点位置等界面状态：

```typescript
interface DevtoolsStateStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
}
```

传入自定义实现即可在重启后恢复界面状态：

```typescript
const stateStore: DevtoolsStateStore = {
  async get(key) {
    return localStorage.getItem(`devtools:${key}`)
  },
  async set(key, value) {
    localStorage.setItem(`devtools:${key}`, value)
  },
}

await startDevtools(agent, { stateStore })
```

## 注意事项

- DevTools 仅用于开发环境，不要在生产环境中启用
- 安装为 `devDependencies`（`-D` 标志）
- 默认端口 4800，如被占用可通过 `port` 选项修改
