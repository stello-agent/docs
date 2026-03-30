# 编排策略概览

编排策略决定了 fork 创建新 Session 时，新节点在拓扑树中的挂载位置。不同的策略产生不同的树形结构，适用于不同的应用场景。

## OrchestrationStrategy 接口

```typescript
interface OrchestrationStrategy {
  /** 决定新 fork 的父节点 ID */
  resolveForkParent(
    source: { sessionId: string },
    sessions: SessionMeta[]
  ): string
}
```

`resolveForkParent` 接收 fork 的来源 Session 和当前所有 Session 列表，返回新节点应挂载的父节点 ID。

## 可用策略

| 策略 | 类名 | 状态 | 树形结构 |
|------|------|------|---------|
| [平铺策略](./flat-strategy) | `MainSessionFlatStrategy` | 可用 | 2 层（Main → 子 Session） |
| [OKR 层级策略](./okr-hierarchical-strategy) | `HierarchicalOkrStrategy` | 计划中 | 多层嵌套 |

## 配置方式

在创建 Engine 时通过 orchestration 配置传入策略：

```typescript
import { createEngine, MainSessionFlatStrategy } from '@stello-ai/core'

const agent = createEngine({
  orchestration: {
    strategy: new MainSessionFlatStrategy(),
  },
  // ...
})
```

如果不指定策略，默认使用 `MainSessionFlatStrategy`。

## 实现自定义策略

实现 `OrchestrationStrategy` 接口即可创建自定义策略：

```typescript
import type { OrchestrationStrategy, SessionMeta } from '@stello-ai/core'

class DepthLimitedStrategy implements OrchestrationStrategy {
  constructor(private maxDepth: number) {}

  resolveForkParent(
    source: { sessionId: string },
    sessions: SessionMeta[]
  ): string {
    // 自定义逻辑：根据深度限制决定挂载位置
    const depth = this.calculateDepth(source.sessionId)
    if (depth >= this.maxDepth) {
      return this.findRootId(sessions)
    }
    return source.sessionId
  }
}
```

策略只负责决定"挂在哪里"，不负责创建 Session 或写入拓扑节点 -- 这些由编排层完成。
