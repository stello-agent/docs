# 项目规划助手

本示例展示如何用**结构化 L2** 让 Main Session 精准识别跨计划冲突，并通过 insights 推送解决方案。

## 场景：多计划并行的项目规划

用户同时推进多个计划（如产品开发、市场推广、招聘），每个计划在独立的子 Session 中深入讨论。Main Session 作为项目总监，识别计划之间的资源冲突、时间冲突和依赖关系，主动推送调整建议。

## Step 1：设计 System Prompt

Main Session 是项目总监，不参与具体计划，只做跨计划协调：

```typescript
const mainSystemPrompt = `你是项目总监。
- 当用户提到一个新的计划方向，调用 stello_create_session 创建该计划的专属会话
- 你负责识别各计划之间的冲突和依赖，给出全局建议
- 不要深入单个计划的细节，那是各计划负责人的工作`
```

子 Session 是各计划的负责人：

```typescript
function makePlanPrompt(planName: string): string {
  return `你是「${planName}」计划的负责人。
- 帮助用户细化该计划的目标、里程碑、所需资源和时间线
- 识别风险和阻塞项
- 你只关注本计划，跨计划的协调由项目总监负责`
}
```

## Step 2：设计 ConsolidateFn — 结构化 L2

这是关键设计点：**L2 的格式由你定义**。框架对 L2 内容完全无感知，ConsolidateFn 返回什么字符串，L2 就是什么。

对于 Planner 场景，自然语言摘要不够用——Main Session 需要精确比对各计划的资源和时间线来发现冲突。所以我们让 L2 输出为 JSON：

```typescript
const consolidateFn = createDefaultConsolidateFn(
  `将以下对话提炼为该计划的结构化摘要。输出严格 JSON，不要附加其他文字：
{
  "objective": "计划目标，一句话",
  "milestones": [
    { "name": "里程碑名", "deadline": "YYYY-MM-DD", "status": "planned|in_progress|done" }
  ],
  "resources": ["所需资源列表，如：前端工程师 x2、设计师 x1"],
  "risks": ["已识别的风险"],
  "blockers": ["当前阻塞项"]
}`,
  llmCall,
)
```

这样每个子 Session 的 L2 都是结构化的，Main Session 在 Integration 时可以精确比对字段。

## Step 3：设计 IntegrateFn — 冲突检测与 Insights 推送

IntegrateFn 收到所有计划的结构化 L2，负责：

1. 识别**资源冲突**——两个计划同时需要"前端工程师 x2"，但团队只有 3 个前端
2. 识别**时间冲突**——产品发布和市场推广的里程碑日期不匹配
3. 识别**依赖关系**——招聘计划的进度会阻塞产品开发
4. 为每个计划生成定向 insight，告知它需要关注的跨计划信息

```typescript
const integrateFn = createDefaultIntegrateFn(
  `你是项目协调分析师。你收到了多个并行计划的结构化摘要（JSON 格式）。

请分析：
1. 资源冲突：哪些计划争抢相同资源？
2. 时间冲突：里程碑日期是否有不合理的重叠或缺口？
3. 依赖关系：哪些计划的阻塞项依赖其他计划的产出？

输出 JSON：
{
  "synthesis": "全局项目状态总结，包括发现的冲突和建议",
  "insights": [
    {
      "sessionId": "计划的 session ID",
      "content": "该计划需要注意的跨计划信息和调整建议"
    }
  ]
}`,
  llmCall,
)
```

## Step 4：信息如何流动

假设用户创建了三个计划：产品开发、市场推广、招聘。

用户在「产品开发」Session 中聊了几轮后，Consolidation 触发，L2 生成为：

```json
{
  "objective": "6 月底发布 v2.0",
  "milestones": [
    { "name": "API 完成", "deadline": "2025-05-15", "status": "in_progress" },
    { "name": "前端重构", "deadline": "2025-06-01", "status": "planned" }
  ],
  "resources": ["前端工程师 x2", "后端工程师 x1"],
  "risks": ["前端人手不足可能延期"],
  "blockers": ["等待设计稿交付"]
}
```

同时「市场推广」的 L2 也包含 `"resources": ["前端工程师 x1", "设计师 x1"]`。

Integration 时，IntegrateFn 发现冲突并生成：

- **synthesis**："产品开发和市场推广同时需要前端工程师，总需求 3 人，当前团队仅 2 人。建议错开前端重构和落地页开发的时间"
- **insight 给产品开发**："市场推广也需要 1 名前端在 5 月做落地页，建议将前端重构推迟到 6 月中"
- **insight 给市场推广**："产品开发的前端重构 5-6 月会占用 2 名前端，建议落地页提前到 4 月完成或使用外包"
- **insight 给招聘**："产品和市场都反映前端人手不足，建议优先招聘前端岗位"

下次用户进入「市场推广」Session 时，insight 自动注入上下文——市场推广负责人"知道"了产品那边的资源冲突，尽管它从未看过产品开发的对话。

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

## 要点回顾

- **L2 格式由 ConsolidateFn 定义**——可以是自然语言、JSON、甚至 YAML。结构化格式让 IntegrateFn 能做精确的字段比对（如资源列表、日期冲突）
- **ConsolidateFn 和 IntegrateFn 是配对的**——ConsolidateFn 产出 JSON，IntegrateFn 就要能解析 JSON
- **Insights 是替换式的**——每次 Integration 生成最新的完整建议，不是追加历史
- **所有流动异步发生**——consolidation 和 integration 都是 fire-and-forget，不阻塞对话
