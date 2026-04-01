# 平铺策略

`MainSessionFlatStrategy` 是 Stello 的默认编排策略。所有 fork 出的子 Session 都直接挂载到根节点（Main Session）下，形成固定的两层树结构。

## 行为

无论 fork 操作从哪个 Session 发起，新创建的子 Session 始终挂载到 Main Session 下：

```
Main Session (root)
├── Session A
├── Session B    ← 即使从 Session A 发起 fork，也挂在 root 下
├── Session C
└── Session D
```

`resolveForkParent` 始终返回根节点的 ID，忽略 source Session。

## 适用场景

平铺策略适合以下场景：

- **多话题并行探索** -- 每个子 Session 独立探索一个话题，互不干扰
- **咨询顾问** -- Main Session 作为顾问，每个子 Session 是一个独立的咨询领域
- **知识图谱** -- 每个子 Session 代表一个知识节点，Main Session 负责综合
- **技能清单** -- 每个子 Session 是一个独立技能，Main Session 是调用方

## 配置示例

```typescript
import { createEngine, MainSessionFlatStrategy } from '@stello-ai/core'

const agent = createEngine({
  orchestration: {
    strategy: new MainSessionFlatStrategy(),
  },
  llm: adapter,
  storage: storage,
  systemPrompt: '你是一个多领域知识助手。',
})
```

由于平铺策略是默认策略，你也可以省略 strategy 配置：

```typescript
const agent = createEngine({
  llm: adapter,
  storage: storage,
  systemPrompt: '你是一个多领域知识助手。',
})
```

## 与 integration 的配合

平铺策略下，所有子 Session 的 L2 在同一层级，Main Session 通过 `getAllSessionL2s()` 扁平收集所有 L2 进行 integration。这意味着 Main Session 对所有技能有相同层级的可见性，不存在层级优先级。
