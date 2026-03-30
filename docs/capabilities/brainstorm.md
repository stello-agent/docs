# 头脑风暴

本示例展示如何用 Stello 构建一个**发散式头脑风暴**工具——从一个问题自动分裂为多个探索方向，Main Session 发现方向之间的关联和矛盾，推动想法交叉授粉。

## 场景：产品创新头脑风暴

用户想为一个产品探索新功能方向。对话开始后，AI 识别出用户提到的不同方向（如用户体验、商业模式、技术可行性），自动为每个方向创建子 Session 深入探索。Main Session 持续观察各方向的进展，发现"用户体验方向提出的方案和技术可行性方向的结论矛盾"，主动推送交叉信息。

与 Planner 场景的关键区别：头脑风暴中 L2 使用**自然语言**而非 JSON，因为创意探索需要开放式综合，不适合结构化比对。

## Step 1：设计 System Prompt

Main Session 是创意总监，负责连接各方向的灵感：

```typescript
const mainSystemPrompt = `你是创意总监，负责引导一场产品头脑风暴。
- 当用户提到一个新的探索方向，调用 stello_create_session 创建专属会话
- 你负责发现各方向之间的关联、矛盾和融合机会
- 主动提出"如果把 A 方向的想法和 B 方向结合会怎样？"这类交叉问题
- 不要深入单个方向的细节，鼓励用户去对应的子会话中探索`
```

子 Session 是各方向的探索者：

```typescript
function makeDirectionPrompt(direction: string): string {
  return `你是「${direction}」方向的探索专家。
- 帮助用户在这个方向上尽可能发散，不要过早收敛
- 提出大胆的假设和创意，即使不成熟也值得记录
- 识别这个方向的核心假设和待验证的问题`
}
```

## Step 2：设计 ConsolidateFn — 自然语言 L2

头脑风暴的 L2 不需要结构化——创意的价值在于语义关联，不在于字段比对。我们用自然语言让 IntegrateFn 能做开放式推理：

```typescript
const consolidateFn = createDefaultConsolidateFn(
  `将以下头脑风暴对话提炼为一段创意摘要。
要求：
- 150-200 字
- 保留关键创意和核心假设，即使尚未验证
- 突出这个方向的独特视角和待探索的问题
- 用一段连贯的文字，保持创意的活力感`,
  llmCall,
)
```

对比 Planner 场景用 JSON，这里故意用自然语言——因为 IntegrateFn 需要理解创意之间的**语义关联**（"A 方向的订阅模式和 B 方向的社区功能可以结合"），而不是比对结构化字段。

## Step 3：设计 IntegrateFn — 交叉授粉

IntegrateFn 的目标不是发现冲突，而是**发现融合机会**：

```typescript
const integrateFn = createDefaultIntegrateFn(
  `你是创意综合分析师。你收到了多个探索方向的创意摘要。

请：
1. 生成 synthesis：各方向之间有哪些意外的关联？哪些想法可以互相借鉴或融合？有没有矛盾的假设需要澄清？
2. 为每个方向生成 insight：告诉它其他方向的发现中，哪些对它有启发或构成挑战

重点是交叉授粉——帮助每个方向看到它自己看不到的关联。

输出 JSON：
{
  "synthesis": "跨方向的综合洞察...",
  "insights": [
    { "sessionId": "xxx", "content": "来自其他方向的灵感或挑战..." }
  ]
}`,
  llmCall,
)
```

## Step 4：信息如何流动

用户提出"我们的笔记应用如何增长"，AI 自动创建三个方向：

- **用户体验**方向：探索"让笔记像对话一样流动"的交互创意
- **商业模式**方向：探索"从免费到付费的转化路径"
- **技术可行性**方向：评估"实时协作和端到端加密能否兼得"

用户在「用户体验」中聊了几轮，Consolidation 生成 L2：

> "核心创意是'对话式笔记'——用户不写笔记，而是和 AI 对话，AI 自动整理为结构化笔记。关键假设：用户愿意用语音而非键盘输入。待验证：语音输入在嘈杂环境下的体验。"

同时「商业模式」的 L2 提到"订阅制 + AI 用量计费"，「技术可行性」提到"端到端加密会阻止服务端 AI 处理"。

Integration 发现矛盾并推送：

- **synthesis**："用户体验方向的'AI 自动整理'需要服务端处理，但技术可行性方向指出端到端加密会阻止这一点。需要在隐私和 AI 能力之间做取舍。商业模式的 AI 用量计费方案与对话式交互天然匹配。"
- **insight 给用户体验**："注意：技术方向指出端到端加密和服务端 AI 处理存在矛盾，你的'AI 自动整理'可能需要一个本地推理方案作为替代"
- **insight 给技术可行性**："用户体验方向的核心创意依赖服务端 AI，请评估混合方案：本地做初步处理，云端做深度整理，用户自选加密级别"
- **insight 给商业模式**："对话式交互会大幅增加 AI 调用量，和你提出的用量计费模式有协同效应，但要注意用户对成本的敏感度"

## Step 5：组装配置

```typescript
const agent = createStelloAgent({
  sessions,
  memory,
  session: {
    sessionResolver: async (id) => { /* 返回对应的 Session 实例 */ },
    consolidateFn,
    integrateFn,
  },
  capabilities: {
    lifecycle,
    tools,
    skills: new SkillRouterImpl(),
    confirm,
  },
  orchestration: {
    scheduler: new Scheduler({
      consolidation: { trigger: 'everyNTurns', everyNTurns: 3 },
      integration: { trigger: 'afterConsolidate' },
    }),
  },
})
```

## 对比：Planner vs Brainstorm

| | Planner | Brainstorm |
|--|---------|------------|
| L2 格式 | 结构化 JSON | 自然语言 |
| IntegrateFn 目标 | 冲突检测 | 交叉授粉 |
| Insights 风格 | "注意冲突，建议调整" | "其他方向有启发，考虑融合" |
| 适合场景 | 精确协调、资源管理 | 创意发散、开放探索 |

两者的底层机制完全相同（ConsolidateFn → L2 → IntegrateFn → synthesis + insights），区别仅在于 prompt 设计和 L2 格式选择。
