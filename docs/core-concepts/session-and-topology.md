# Session 与拓扑

## Session：独立对话单元

Session 是 Stello 的最小对话单元。每个 Session 都是独立的：它有自己的对话历史（L3）、系统提示词、记忆（L2），但**不知道自己在树中的位置**。

### SessionMeta

每个 Session 的元数据包含：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识 |
| `label` | string | 人类可读名称 |
| `role` | `'standard' \| 'main'` | 普通 Session 或 Main Session |
| `status` | `'active' \| 'archived'` | 生命周期状态 |
| `tags` | string[] | 组织标签 |
| `metadata` | Record | 自定义扩展数据 |

注意 SessionMeta **没有 `parentId` 或 `depth`** 字段——Session 对树结构完全无感知。

### Session 的能力

- `send(content)` — 组装上下文 → 单次 LLM 调用 → 存 L3 → 返回响应
- `stream(content)` — 流式版本的 send
- `consolidate(fn)` — 暴露给上层调度 L3→L2 提炼
- `fork(options)` — 一次性继承源 Session 上下文，创建独立新 Session
- `archive()` — 归档，不再接受新消息

Session 做**单次 LLM 调用**——tool call 循环由编排层驱动，Session 自身不负责。

## Main Session：全局意识层

Main Session 是拓扑树的根节点，它的角色是 **SKILL Caller**：读取所有子 Session 的 L2，维护全局视野。

与普通 Session 的关键区别：

| | Session（子） | MainSession |
|--|--------------|-------------|
| 上下文 | system prompt + insight + L3 | system prompt + **synthesis** + L3 |
| 记忆 | `memory()` → L2 | `synthesis()` → integration 产出 |
| 提炼 | `consolidate(fn)` L3→L2 | `integrate(fn)` 所有 L2→synthesis+insights |
| insight | 被动接收 | 主动推送 |
| fork | 可以 | 不可以 |

Main Session **只读 L2，不读子 Session 的 L3**。这是核心约束——Caller 看接口，不看实现。

## 拓扑树：TopologyNode

Session 不知道树，那谁维护树？答案是 **TopologyNode**——一个独立于 Session 的轻量数据结构：

```typescript
interface TopologyNode {
  id: string              // 等于 sessionId
  parentId: string | null // null 表示根节点（Main Session）
  label: string           // 冗余字段，渲染时避免加载完整 Session
}
```

拓扑树由 `MainStorage` 管理：
- `putNode(node)` — 写入节点
- `getChildren(parentId)` — 懒加载子节点
- `removeNode(nodeId)` — 删除节点

### 为什么解耦？

Session 与拓扑树解耦带来三个好处：

1. **Session 可独立测试** — 不需要树的上下文就能运行
2. **拓扑可独立渲染** — 前端只需 TopologyNode 就能画出星空图，不需加载 Session 数据
3. **fork 是两个独立操作** — 编排层创建 Session（Session 层）+ 写入 TopologyNode（存储层），职责清晰

## 存储接口分层

存储不是按数据结构分的，而是按**消费者职责**分的：

| 接口 | 注入对象 | 职责 |
|------|---------|------|
| **SessionStorage** | 普通 Session | 单个 Session 的数据：L3、system prompt、insight、L2 |
| **MainStorage** | Main Session + 编排层 | 额外：`getAllSessionL2s()` 批量收集、拓扑树、Session 列举、全局键值 |

MainStorage extends SessionStorage——Main Session 拥有普通 Session 的全部能力，加上全局操作。
