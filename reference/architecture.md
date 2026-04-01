# 架构设计

Stello 采用四层架构，每层职责清晰、单向依赖、可独立测试。依赖方向为：Server → Core → Session。

## Session 层（@stello-ai/session）

Session 层是整个系统的基础对话单元。每个 Session 是一个**独立的、有记忆的对话实体**，与树状拓扑结构完全解耦——Session 不知道自己在树中的位置，也不感知其他 Session 的存在。

Session 负责三件事：上下文组装、单次 LLM 调用、记忆管理。调用 `send()` 时，Session 按照固定规则组装上下文（system prompt + insights + L3 历史 + 当前消息），发送给 LLM，将响应存入 L3，然后返回。注意 Session 只做**单次** LLM 调用，不处理 tool call 循环。

Session 实现了三层记忆模型。L3 是原始对话记录，供该 Session 自身的 LLM 消费。L2 是技能描述（外部视角），通过 `consolidate(fn)` 从 L3 提炼而来，供 Main Session 消费。L1-structured 是全局键值存储，供应用层直接读写。

Session 和 MainSession 是两种不同的对话接口。普通 Session 的上下文包含 system prompt、insights 和 L3 历史；MainSession 的上下文包含 system prompt、synthesis 和 L3 历史。MainSession 通过 `integrate(fn)` 收集所有子 Session 的 L2，生成 synthesis（对全局的综合认知）和 insights（定向推送给各子 Session 的建议）。

## 编排层（@stello-ai/core）

编排层是 Session 原语之上的执行周期管理器，不创造新能力，只组合 Session 层的能力。

**Engine** 是编排层的核心。它驱动 tool call 循环：调用 `Session.send()`，检查响应中是否有 tool call，执行工具，再次调用 `send()`，直到 LLM 不再请求工具。每次 `turn()` 完成后，Engine 通过 Scheduler 判断是否需要触发 consolidation 或 integration。

**TurnRunner** 负责单个 Session 内的多轮 tool call 循环执行，是 Engine 的内部组件。

**SessionOrchestrator** 管理 Session 的生命周期操作：`fork()`（创建子 Session + 写入拓扑节点）、`archive()`（归档 Session）、`enter()`/`leave()`（切换活跃 Session）。这些操作涉及 Session 层和存储层的协调，由 Orchestrator 统一处理。

**Scheduler** 是调度策略组件，判断 consolidation 和 integration 的触发时机。支持多种触发策略：`onSwitch`（切换 Session 时）、`everyNTurns`（每 N 轮对话后）、`onArchive`（归档时）、`manual`（手动触发）。

**Strategy** 定义 Session 拓扑的组织方式。`FlatStrategy` 是默认策略，所有子 Session 平铺在 Main Session 下。`HierarchicalOkrStrategy` 尚未实现，计划支持多层嵌套结构。

**SplitGuard** 在 fork 之前进行前置检查，决定是否允许创建新的子 Session。

**RuntimeManager** 管理 Session 运行时实例的生命周期，使用引用计数和空闲 TTL 机制控制资源释放。

编排层的所有异步副作用（consolidation、integration）均以 fire-and-forget 方式执行，不阻塞 `turn()` 返回。

## 应用层

应用层是开发者与 Stello 的对接面。开发者通过依赖注入提供以下组件：

- **StorageAdapter**：持久化抽象，按消费者职责分为 `SessionStorage` 和 `MainStorage`
- **LLMAdapter**：LLM 接口，接收消息数组，支持 tool use 和可选的 streaming
- **ConsolidateFn**：L3 → L2 的转换逻辑，定义 L2 的格式，函数内自行选择 LLM tier
- **IntegrateFn**：所有 L2 → synthesis + insights，与 ConsolidateFn 配对，函数内自行选择 LLM tier
- **system prompt**：全局共享的系统提示词
- **Tool 定义**：工具的 schema 和执行函数
- **ConfirmProtocol**：用户确认协议，用于需要人工确认的操作
- **EngineLifecycleAdapter**：Engine 生命周期钩子

ConsolidateFn 和 IntegrateFn 是配对函数——ConsolidateFn 输出某种格式的 L2，IntegrateFn 读取该格式。框架对 L2 内容格式完全无感知，格式由应用层自行定义。

## HTTP/SDK 层（@stello-ai/server）

HTTP/SDK 层是编排层之上的薄服务化包装，提供跨语言访问和多租户支持。

该层提供 REST 和 WebSocket 两种接入方式。REST 用于同步操作（创建 Session、发送消息、查询状态），WebSocket 用于实时推送（streaming 响应、事件通知）。

持久化使用 PostgreSQL，提供生产级的 `StorageAdapter` 实现。

多租户通过 Spaces 机制实现，每个 Space 是一个隔离的数据域。

AgentPool 管理多个 Agent 实例的生命周期和资源分配。

## 数据流

**对话流**：用户消息进入 `Engine.turn()`，Engine 调用 `Session.send()` 执行单次 LLM 调用。如果响应包含 tool call，TurnRunner 执行工具并再次调用 `send()`，循环直到完成。响应中的对话记录存入 L3。`turn()` 返回后，Scheduler 检查是否需要触发 consolidation 或 integration。

**Consolidation 流**：Scheduler 判断触发后，异步调用 `ConsolidateFn`，将该 Session 的 L3 历史提炼为 L2，存入存储。这个过程不阻塞对话。

**Integration 流**：Scheduler 判断触发后，异步调用 `getAllSessionL2s()` 收集所有子 Session 的 L2，传入 `IntegrateFn`，生成 synthesis 和 insights，分别存入 Main Session 和各子 Session 的存储槽位。同样不阻塞对话。

## 依赖方向

Server → Core → Session，严格单向依赖。Session 层不知道 Core 的存在，Core 不知道 Server 的存在。每层可以独立测试：Session 层只需 mock StorageAdapter 和 LLMAdapter，Core 层只需 mock Session 接口，Server 层只需 mock Engine。
