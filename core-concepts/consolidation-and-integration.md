# Consolidation 与 Integration

Consolidation 和 Integration 是 Stello 三层记忆流动的两个驱动过程。它们异步执行，不阻塞对话。

## Consolidation：L3 → L2

Consolidation 将一个 Session 的原始对话（L3）提炼为 SKILL description（L2）。

```typescript
type ConsolidateFn = (
  currentMemory: string | null,  // 当前 L2（首次为 null）
  messages: Message[],            // 完整 L3 记录
) => Promise<string>              // 新的 L2
```

### 设计要点

- **应用层定义格式** — 框架不规定 L2 长什么样。你可以让它是一段摘要、一个 JSON 结构、或任何适合你场景的格式
- **fn 自行选择 LLM tier** — ConsolidateFn 通过闭包捕获 LLM 调用能力，可以用便宜的模型做摘要
- **增量更新** — `currentMemory` 参数传入上一次的 L2，fn 可以基于已有摘要增量更新，而非每次从头提炼
- **fire-and-forget** — Consolidation 不阻塞当前对话，由调度器在后台触发

### 默认实现

`@stello-ai/core` 提供了 `createDefaultConsolidateFn`，接收一个 prompt 和 LLM 调用函数：

```typescript
import { createDefaultConsolidateFn } from '@stello-ai/core'

const consolidateFn = createDefaultConsolidateFn(
  '请将对话提炼为 100-150 字的摘要。',
  llmCall,
)
```

## Integration：所有 L2 → Synthesis + Insights

Integration 是 Main Session 的核心操作：收集所有子 Session 的 L2，生成全局 synthesis 和 per-session insights。

```typescript
type IntegrateFn = (
  children: ChildL2Summary[],      // 所有子 Session 的 L2
  currentSynthesis: string | null,  // 当前 synthesis
) => Promise<IntegrateResult>

interface ChildL2Summary {
  sessionId: string
  label: string
  l2: string
}

interface IntegrateResult {
  synthesis: string
  insights: Array<{ sessionId: string; content: string }>
}
```

### 设计要点

- **Synthesis** — Main Session 对所有子 Session 的综合理解，注入到 Main Session 自己的上下文中
- **Insights** — 给各子 Session 的定向建议。每个 insight 替换（不追加）该 Session 之前的 insight——每次 integration 给出最新完整判断
- **原子写入** — synthesis 和 insights 在同一个事务中写入，确保一致性
- **ConsolidateFn 与 IntegrateFn 配对** — ConsolidateFn 产出某种格式的 L2，IntegrateFn 读取该格式。两者由应用层配对设计

### 默认实现

```typescript
import { createDefaultIntegrateFn } from '@stello-ai/core'

const integrateFn = createDefaultIntegrateFn(
  '综合分析所有子会话，生成全局洞察和定向建议。',
  llmCall,
)
```

## 调度时机

Consolidation 和 Integration 的触发由 `Scheduler` 控制：

### Consolidation 触发器

| 触发器 | 说明 |
|--------|------|
| `manual` | 仅手动调用 |
| `everyNTurns` | 每 N 轮对话后触发 |
| `onSwitch` | 切换到其他 Session 时触发 |
| `onArchive` | 归档 Session 时触发 |
| `onLeave` | 离开 Session 时触发 |

### Integration 触发器

| 触发器 | 说明 |
|--------|------|
| `manual` | 仅手动调用 |
| `afterConsolidate` | 每次 Consolidation 完成后自动触发 |
| `everyNTurns` | 每 N 轮对话后触发 |
| `onSwitch` | 切换 Session 时触发 |
| `onArchive` | 归档时触发 |
| `onLeave` | 离开时触发 |

### 配置示例

```typescript
import { Scheduler } from '@stello-ai/core'

const scheduler = new Scheduler({
  consolidation: { trigger: 'everyNTurns', everyNTurns: 3 },
  integration: { trigger: 'afterConsolidate' },
})
```

这是最常见的配置：每 3 轮对话提炼一次 L2，每次提炼后自动做全局整合。

## 信息流全景

- **向上汇报**：每个子 Session 通过 Consolidation 将 L3 提炼为 L2，Main Session 通过 `getAllSessionL2s()` 批量收集所有 L2，然后 Integration 生成 synthesis
- **向下推送**：Integration 同时为每个子 Session 生成定向 insight，写入该 Session 的 insight 槽位，下次对话时自动注入上下文
- **横向隔离**：子 Session 之间无直接通信，所有跨分支信息都经由 Main Session 中转
