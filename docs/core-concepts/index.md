# 核心概念

Stello 的设计围绕一个核心问题：**如何让 AI 的协作方式匹配人类思维的发散性？**

线性对话只有一条线索，而真实思考往往同时展开多个方向。Stello 把对话从线炸开成树，每个分支独立深入，全局层保持整体视野。

## 概念地图

| 概念 | 一句话 |
|------|--------|
| [Session 与拓扑](/docs/core-concepts/session-and-topology) | Session 是独立对话单元，拓扑树描述它们的关系 |
| [三层记忆模型](/docs/core-concepts/three-layer-memory) | L3 原始对话、L2 技能描述、L1 全局认知——记忆分层流动 |
| [技能隐喻](/docs/core-concepts/skill-metaphor) | 子 Session 是技能，Main Session 是调用方 |
| [Consolidation 与 Integration](/docs/core-concepts/consolidation-and-integration) | 记忆向上汇报（L3→L2）和全局整合（所有 L2→synthesis+insights） |
| [编排策略](/docs/core-concepts/orchestration-strategy) | 平铺 vs 层级，不同场景的 Session 组织方式 |

建议按顺序阅读，每个概念都建立在前一个之上。
