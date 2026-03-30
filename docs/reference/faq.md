# 常见问题

## Stello 和普通 chatbot 框架有什么区别？

普通 chatbot 框架关注单轮或多轮线性对话。Stello 关注的是**对话拓扑和记忆分层**——它让 AI Agent 将线性对话分裂为树状 Session，每个 Session 是一个独立的技能单元，跨分支通过 Main Session 传递洞察。如果你的场景涉及多任务并行、技能分治或长期记忆管理，Stello 是更合适的选择。

## 必须用 TypeScript 吗？

推荐使用 TypeScript 以获得完整的类型提示和编译时检查。JavaScript 也可以正常使用 Stello 的所有功能，但你会失去接口定义带来的类型安全保障。

## 支持哪些 LLM？

Stello 内置了 Claude 和 GPT 的适配器。任何兼容 OpenAI API 的服务都可以通过 `createOpenAICompatibleAdapter` 快速接入。如果你使用的 LLM 不兼容 OpenAI API，也可以自行实现 `LLMAdapter` 接口——它只需要接收消息数组并返回响应即可。

## 数据存在哪里？

取决于你提供的 `StorageAdapter` 实现。开发阶段可以使用 `InMemoryStorageAdapter`，数据存在内存中，进程退出即丢失。生产环境推荐使用 `@stello-ai/server` 提供的 PostgreSQL 实现，数据持久化到数据库。你也可以实现自己的 `StorageAdapter` 对接任意存储后端。

## Consolidation 和 Integration 会阻塞对话吗？

不会。Consolidation（L3 → L2 提炼）和 Integration（所有 L2 → synthesis + insights）全部以 fire-and-forget 方式异步执行，不会阻塞 `turn()` 返回。用户不会感知到任何延迟。如果异步执行过程中发生错误，框架会通过事件机制 emit 错误，不会中断对话周期。

## 子 Session 之间能直接通信吗？

不能。子 Session 之间完全隔离，彼此不感知对方的存在。所有跨分支通信通过 Main Session 的 insights 机制实现：Main Session 在 integration 时读取所有子 Session 的 L2，生成针对各子 Session 的 insights 并定向推送。这是有意为之的设计——保持 Session 的独立性，避免复杂的跨 Session 依赖。

## HierarchicalOkrStrategy 什么时候可用？

`HierarchicalOkrStrategy` 目前尚未实现。当前默认使用 `FlatStrategy`，所有子 Session 平铺在 Main Session 下。如果你对多层嵌套的 Session 拓扑有需求，欢迎贡献实现。

## 如何贡献？

请参阅[贡献指南](./contributor.md)页面，其中包含开发环境搭建、代码规范、Git 规范和 PR 流程等详细信息。
