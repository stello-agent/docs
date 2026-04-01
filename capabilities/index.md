# 核心能力

本章通过具体示例，展示如何用 Stello 的核心概念构建真实应用。每个示例聚焦一个场景，演示如何设计 system prompt、ConsolidateFn、IntegrateFn 来实现特定的协作模式。

## 示例

| 场景 | 核心机制 | 说明 |
|------|---------|------|
| [项目规划助手](/capabilities/planner) | 结构化 L2 + 冲突检测 | 多计划并行推进，Main Session 通过 JSON 格式的 L2 精确识别资源冲突和时间冲突，推送调整建议 |
| [头脑风暴](/capabilities/brainstorm) | 发散探索 + 主题聚合 | 从一个问题出发自动分裂为多个探索方向，Main Session 发现方向之间的关联和矛盾，推动想法交叉授粉 |

## 共同模式

每个示例都遵循相同的三步设计：

1. **设计 System Prompt** — Main Session 是协调者，子 Session 是各方向的执行者
2. **设计 ConsolidateFn** — 定义 L2 的格式（自然语言 or JSON），决定"每个方向对外暴露什么信息"
3. **设计 IntegrateFn** — 定义 Main Session 如何综合所有 L2，生成 synthesis（全局视野）和 insights（定向建议）

L2 格式的选择是关键设计决策：结构化 JSON 适合精确比对（如资源冲突），自然语言适合开放式综合（如创意融合）。
