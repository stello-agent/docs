# OKR 层级策略

`HierarchicalOkrStrategy` 是一个计划中的编排策略，fork 出的子 Session 会挂载在发起 fork 的 Session 下方，形成多层嵌套的树结构。

::: warning 尚未实现
此策略目前是占位实现，调用时会抛出 TODO 错误。欢迎社区贡献。
:::

## 预期行为

与平铺策略不同，层级策略会将新 Session 挂载到发起 fork 的 Session 下：

```
Main Session (root)
├── 目标 A
│   ├── 关键结果 A.1
│   └── 关键结果 A.2
│       ├── 任务 A.2.1
│       └── 任务 A.2.2
└── 目标 B
    ├── 关键结果 B.1
    └── 关键结果 B.2
```

`resolveForkParent` 会返回 source Session 的 ID，使得拓扑树自然形成层级结构。

## 适用场景

层级策略适合需要自然分解的场景：

- **OKR 分解** -- 目标 → 关键结果 → 具体任务，逐层分解
- **项目管理** -- 项目 → 模块 → 子任务的树状分解
- **课程体系** -- 课程 → 章节 → 知识点的层级组织
- **组织架构** -- 部门 → 团队 → 成员的层级映射

## 预期配置

```typescript
import { createEngine, HierarchicalOkrStrategy } from '@stello-ai/core'

// 注意：当前会抛出 TODO 错误
const agent = createEngine({
  orchestration: {
    strategy: new HierarchicalOkrStrategy(),
  },
  // ...
})
```

## 当前状态

`HierarchicalOkrStrategy` 的实现当前为：

```typescript
class HierarchicalOkrStrategy implements OrchestrationStrategy {
  resolveForkParent(source: { sessionId: string }): string {
    throw new Error('TODO: HierarchicalOkrStrategy not yet implemented')
  }
}
```

如果你的场景需要层级结构，可以通过实现自定义 `OrchestrationStrategy` 来达到类似效果，参见[编排策略概览](./index)。
