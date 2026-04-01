# 三层记忆模型

Stello 的记忆系统分三层，每层有明确的消费者和语义。这种分层让信息在 Session 之间高效流动，而不需要共享原始对话。

## 三层总览

| 层 | 内容 | 消费者 | 何时生成 |
|----|------|--------|---------|
| **L3** | 原始对话记录 | 该 Session 自身的 LLM | 每轮对话自动追加 |
| **L2** | SKILL description（外部视角） | Main Session（通过 integration） | Consolidation 时批量生成 |
| **L1** | 全局认知 | Main Session 自身 + 应用层 | Integration 时生成 synthesis；应用层直接读写键值 |

## L3：SKILL 正文

L3 是 Session 内部的完整对话历史，每条消息包含 `role`、`content`、`timestamp`，以及可选的 `toolCalls` / `toolCallId`。

- **存储**：通过 `SessionStorage.appendRecord()` 逐条追加
- **消费**：Session 调用 LLM 时，L3 作为上下文的一部分发送
- **生命周期**：可通过 `trimRecords(keepRecent)` 截断旧记录

L3 **只对该 Session 可见**。Main Session 永远不读子 Session 的 L3——这是核心约束之一。

## L2：SKILL Description

L2 是 L3 的提炼摘要，代表该 Session "学到了什么"的外部接口。

- **生成**：由 `ConsolidateFn` 在 Consolidation 时生成
- **存储**：通过 `SessionStorage.putMemory()` 写入
- **消费**：Main Session 通过 `MainStorage.getAllSessionL2s()` 批量收集所有子 Session 的 L2

关键设计：**L2 对子 Session 自身不可见**。L2 是写给 Main Session 看的外部描述，不是 Session 自用的记忆。但当上下文窗口接近溢出时，L2 会作为压缩后的记忆注入到 Session 自身的上下文中。

```
ConsolidateFn 签名：
(currentMemory: string | null, messages: Message[]) => Promise<string>

输入：当前 L2（首次为 null）+ 完整 L3 记录
输出：新的 L2 文本
```

框架对 L2 的内容格式完全无感知——ConsolidateFn 和 IntegrateFn 是配对函数，应用层自行定义 L2 的结构。

## L1：SKILL Caller

L1 包含两部分：

### Synthesis（涌现层）

Main Session 调用 `integrate()` 时，IntegrateFn 读取所有子 Session 的 L2，生成：
- **synthesis**：对所有 L2 的综合提炼，是 Main Session 的"全局视野"
- **insights**：定向推送给各子 Session 的建议

Synthesis 存储在 Main Session 的 memory 槽位中，在 Main Session 调用 LLM 时作为上下文注入。

### 全局键值（结构化层）

应用层通过 `MainStorage.getGlobal()` / `putGlobal()` 直接读写的键值数据。不经过 LLM，由应用代码管理。

## 上下文组装

每种 Session 调用 LLM 时，上下文的组装规则是固定的：

### 子 Session 上下文

```
system prompt → insight（Main Session 推送的建议）→ L3 记录 → 用户消息
```

当 token 超过上下文窗口的 80% 且已有 L2 时，自动压缩：

```
system prompt → insight → L2（作为压缩记忆）→ 近期 L3 → 用户消息
```

### Main Session 上下文

```
system prompt → synthesis（全局视野）→ L3 记录 → 用户消息
```

注意：Main Session 没有 insight（它是 insight 的推送方），取而代之的是 synthesis。

## 零对话开销

L2 在 Consolidation 时批量生成，不在每轮对话中更新。正在进行中的 Session 没有 L2，对 Main Session 暂时不可见——这是有意为之的取舍，确保对话过程中不产生额外的 LLM 调用。
