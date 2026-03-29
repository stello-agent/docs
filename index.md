---
layout: home

hero:
  name: Stello
  text: 开源对话拓扑引擎
  image:
    light: /stello_logo.svg
    dark: /stello_logo_dark.png
    alt: Stello
  tagline: 让 AI Agent 将线性对话分裂为会生长的认知拓扑，具备三层记忆和全局意识。
  actions:
    - theme: brand
      text: 快速开始
      link: /docs/getting-started/introduction
    - theme: alt
      text: GitHub
      link: https://github.com/stello-agent/stello

features:
  - icon: 🌳
    title: 对话自动分裂
    details: AI 识别话题分叉时通过工具调用创建子 Session，每个分支有明确 scope。
  - icon: 🧠
    title: 三层分级记忆
    details: L3 原始对话 / L2 技能描述 / L1 全局认知 — 记忆在层级间流动。
  - icon: 🔄
    title: 全局意识整合
    details: Main Session 收集所有子 Session 的 L2，生成 synthesis 并推送 insights。
  - icon: ⚡
    title: 对话中零开销
    details: 所有记忆提炼异步执行（fire-and-forget），不阻塞对话流程。
  - icon: 🎨
    title: 星空图可视化
    details: 每颗星是一个思考方向，连线是关联，大小映射深度，亮度映射活跃度。
  - icon: 🔌
    title: 完全解耦架构
    details: 不绑定 LLM / 存储 / UI，Session 与 Topology 分离。
---
