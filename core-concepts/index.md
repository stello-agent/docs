# 核心概念

## 从线到树

传统 AI 对话是一条线——你说一句，AI 回一句，上下文不断膨胀，直到窗口溢出。但人类思维不是线性的：你在规划创业时，同时在想市场、产品、融资、团队，每个方向都需要深入，又需要彼此关联。

Stello 把这条线炸开成一棵树。每当 AI 识别到话题分叉，就创建一个新的 **Session**（独立对话单元），在新分支中深入探索。所有 Session 通过**拓扑树**组织，描述它们的父子和兄弟关系。

## 技能隐喻

Stello 用一个直观的比喻来理解这棵树：**每个子 Session 是一个 [SKILL](https://agentskills.io/)，Main Session 是技能调用方。**

就像一个团队 leader 不需要知道每个成员的工作细节，只需要知道"你能做什么"和"做得怎么样"。Main Session 不读子 Session 的原始对话，只读它们的摘要描述。子 Session 之间也互不感知——唯一的跨分支信息来源是 Main Session 推送的定向建议。

## 三层记忆

这个比喻自然引出了 Stello 的**三层记忆模型**：

- **L3（SKILL 正文）** — 每个 Session 内部的完整对话记录，只有该 Session 自身的 LLM 消费
- **L2（SKILL description）** — 对 L3 的提炼摘要，是 Session 的"外部接口"，供 Main Session 读取
- **L1（SKILL calller）** — Main Session 综合所有 L2 生成的全局视角，加上应用层的键值存储

记忆在层级间流动：向上汇报（L3→L2→Main Session），向下推送（Main Session insights→子 Session）。

## Consolidation 与 Integration

记忆不会自动流动，需要两个异步过程驱动：

- **Consolidation** — 将某个 Session 的 L3 提炼为 L2（"这个技能学到了什么"）
- **Integration** — 收集所有子 Session 的 L2，生成全局 synthesis（"全局视野"）和 per-session insights（"给各分支的建议"）

两者都是 **fire-and-forget**——不阻塞对话，由编排层在合适的时机调度（如每 N 轮、切换 Session 时）。

## 编排策略

Session 树可以按不同策略组织：

- **平铺策略** — 所有子 Session 平级挂在 Main Session 下，适合多主题并行探索 (当前采用)
- **层级策略** — Session 可以有子 Session，形成多层树，适合 OKR 式的目标分解

编排层负责调度这一切：驱动 tool call 循环、判断何时 consolidation/integration、管理 Session 生命周期。

## 深入了解

| 主题 | 说明 |
|------|------|
| [三层记忆模型](/core-concepts/three-layer-memory) | L3/L2/L1 的详细语义、上下文组装规则、零对话开销的设计 |
| [Session 与拓扑](/core-concepts/session-and-topology) | Session 的独立性、与拓扑树的解耦、MainSession 的特殊角色 |
| [Consolidation 与 Integration](/core-concepts/consolidation-and-integration) | 提炼函数的设计、调度时机、ConsolidateFn 与 IntegrateFn 的配对关系 |
| [编排策略](/core-concepts/orchestration-strategy) | 平铺 vs 层级的取舍、调度策略配置、Engine 的职责边界 |
