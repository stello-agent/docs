# 核心能力

Stello 通过 `StelloAgentConfig` 提供全面的配置能力，覆盖 Session 接入、能力注入、调度策略、运行时管理等方面。本页按功能分组列出所有配置点。

> 详细的类型定义和参数说明请参阅 [配置参考](/docs/api-reference/core-configuration)。

## Session 层集成

将 `@stello-ai/session` 的 Session / MainSession 接入 core 的 Engine 体系。

| 配置项 | 说明 |
|-------|------|
| `session.sessionResolver` | 按 sessionId 解析真实 Session 实例 |
| `session.mainSessionResolver` | 解析 MainSession，仅在需要 integration 时提供 |
| `session.consolidateFn` | Session L3 → L2 的提炼函数 |
| `session.integrateFn` | MainSession 的 integration 函数 |
| `session.serializeSendResult` | send() 结果的序列化方式，默认 JSON |
| `session.toolCallParser` | TurnRunner 用的工具调用解析器 |

## 能力配置

通过 `capabilities` 注入 Engine 所需的外部能力。

| 配置项 | 说明 |
|-------|------|
| `capabilities.lifecycle` | 生命周期适配器：bootstrap、afterTurn、prepareChildSpawn |
| `capabilities.tools` | 工具运行时：getToolDefinitions + executeTool |
| `capabilities.skills` | 技能路由：注册、匹配、列举 Skill |
| `capabilities.confirm` | 确认协议：拆分确认、L1 更新确认 |

## 调度策略

通过 `orchestration.scheduler` 配置 consolidation 和 integration 的触发时机。

| 配置项 | 说明 |
|-------|------|
| `scheduler.consolidation.trigger` | 触发时机：`manual` / `everyNTurns` / `onSwitch` / `onArchive` / `onLeave` |
| `scheduler.consolidation.everyNTurns` | 每 N 轮触发一次（仅 `everyNTurns` 时有效） |
| `scheduler.integration.trigger` | 触发时机：`manual` / `afterConsolidate` / `everyNTurns` / `onSwitch` / `onArchive` / `onLeave` |
| `scheduler.integration.everyNTurns` | 每 N 轮触发一次（仅 `everyNTurns` 时有效） |

## 运行时管理

通过 `runtime.recyclePolicy` 配置 Engine 运行时的回收策略。

| 配置项 | 说明 |
|-------|------|
| `runtime.recyclePolicy.idleTtlMs` | 空闲回收延迟（毫秒）。`0` 或不设置表示引用归零立即回收；`> 0` 表示延迟回收，期间再次 acquire 可取消回收 |

## 事件钩子

通过 `orchestration.hooks` 注入 Engine 级别的事件钩子，共 11 个钩子方法。

| 钩子 | 触发时机 |
|------|---------|
| `onMessageReceived` | 收到用户消息时 |
| `onAssistantReply` | LLM 返回响应后 |
| `onToolCall` | 工具调用前 |
| `onToolResult` | 工具调用完成后 |
| `onSessionEnter` | 进入 Session 时 |
| `onSessionLeave` | 离开 Session 时 |
| `onRoundStart` | 单轮对话开始 |
| `onRoundEnd` | 单轮对话结束 |
| `onSessionArchive` | Session 归档时 |
| `onSessionFork` | Session 派生子 Session 时 |
| `onError` | 发生错误时 |

## 分裂保护

通过 `orchestration.splitGuard` 防止过早或过于频繁的 Session 拆分。

| 配置项 | 默认值 | 说明 |
|-------|-------|------|
| `minTurns` | `3` | Session 至少对话 N 轮后才允许拆分 |
| `cooldownTurns` | `5` | 两次拆分之间至少间隔 N 轮 |

## 热更新

通过 `StelloAgent.updateConfig()` 在运行时动态修改部分配置，无需重建 Agent。

```typescript
interface StelloAgentHotConfig {
  runtime?: Partial<RuntimeRecyclePolicy>
  scheduling?: Partial<SchedulerConfig>
  splitGuard?: Partial<{ minTurns: number; cooldownTurns: number }>
}
```

支持热更新的配置项：

| 分组 | 可更新字段 |
|------|-----------|
| `runtime` | `idleTtlMs` |
| `scheduling` | `consolidation.trigger`、`consolidation.everyNTurns`、`integration.trigger`、`integration.everyNTurns` |
| `splitGuard` | `minTurns`、`cooldownTurns` |
