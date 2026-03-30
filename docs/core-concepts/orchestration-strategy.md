# 编排策略

编排层是 Session 原语之上的执行周期管理器——它不创造新能力，而是调度 Session 层已有的能力。

## Engine：执行周期

Engine 管理单个 Session 的对话周期：

- **turn()** — `Session.send()` × N（tool call 循环）+ 调度判断
- 每轮 turn 后，Engine 询问 Scheduler 是否需要 consolidation / integration
- 所有异步副作用（consolidation、integration）**fire-and-forget**，不阻塞 turn() 返回

Engine 不感知树结构，不感知其他 Session 的存在。它只管好自己负责的那个 Session 的对话循环。

## 策略：Session 树的组织方式

Session 树可以按不同策略组织。策略通过 `OrchestrationStrategy` 接口定义，核心方法是 `resolveForkParent()`——决定新 fork 的 Session 应该挂在哪个节点下。

### 平铺策略（当前采用）

`MainSessionFlatStrategy`：所有子 Session 平级挂在 Main Session 下。

```
Main Session
├── 市场调研
├── 产品设计
├── 融资计划
└── 团队组建
```

无论从哪个 Session 发起 fork，新 Session 都成为 Main Session 的直接子节点。树永远是两层。

**适合场景**：多主题并行探索、咨询类应用、知识地图构建。

### 层级策略

`HierarchicalOkrStrategy`：Session 可以有子 Session，形成多层树。

```
Main Session
├── Q1 目标
│   ├── 产品迭代
│   └── 用户增长
└── Q2 目标
    ├── 国际化
    └── 营收
```

fork 时新 Session 挂在发起 fork 的 Session 下，自然形成层级结构。

**适合场景**：OKR 分解、项目管理、课程体系、多层级组织。

## Scheduler：调度配置

Scheduler 控制 consolidation 和 integration 的触发时机，详见 [Consolidation 与 Integration](/docs/core-concepts/consolidation-and-integration)。

常见配置模式：

| 模式 | Consolidation | Integration | 适用场景 |
|------|---------------|-------------|---------|
| **自动** | `everyNTurns: 3` | `afterConsolidate` | 大多数场景 |
| **切换时** | `onSwitch` | `afterConsolidate` | 频繁切换 Session 的场景 |
| **手动** | `manual` | `manual` | 需要精确控制的场景 |

## 四层架构位置

从下到上依次是：**Session 层**（`@stello-ai/session`，send / consolidate / fork / 上下文组装）→ **编排层**（`@stello-ai/core`，Engine / Scheduler / Strategy / fork 编排）→ **应用层**（开发者提供 StorageAdapter、LLMAdapter、ConsolidateFn、IntegrateFn、工具定义）→ **HTTP / SDK 层**（`@stello-ai/server`）。

编排层依赖 Session 层，但 Session 层不感知编排层的存在。这种单向依赖让两层可以独立测试和使用。
