# Project Planner

This example shows how to use **structured L2** so Main Session can precisely detect cross-plan conflicts and push resolution advice through insights.

## Scenario: Parallel Project Planning

A user is running multiple plans simultaneously (e.g., product development, marketing, hiring). Each plan is discussed in its own child Session. Main Session acts as the project director, identifying resource conflicts, timeline clashes, and dependencies, and proactively pushing adjustment advice.

## Step 1: Design System Prompts

Main Session is the project director — doesn't participate in individual plans, only coordinates:

```typescript
const mainSystemPrompt = `You are the project director.
- When the user mentions a new plan, call stello_create_session to create a dedicated session
- Your job is to identify conflicts and dependencies across plans, and give global advice
- Don't dive into single-plan details — that's each plan owner's job`
```

Child Sessions are plan owners:

```typescript
function makePlanPrompt(planName: string): string {
  return `You are the owner of the "${planName}" plan.
- Help the user refine goals, milestones, required resources, and timelines
- Identify risks and blockers
- You only focus on this plan; cross-plan coordination is the director's job`
}
```

## Step 2: Design ConsolidateFn — Structured L2

This is the key design point: **you define L2's format**. The framework is completely agnostic to L2 content — whatever string ConsolidateFn returns becomes L2.

For a planner scenario, natural language summaries aren't enough — Main Session needs to precisely compare resources and timelines to find conflicts. So we output L2 as JSON:

```typescript
const consolidateFn = createDefaultConsolidateFn(
  `Distill the conversation into a structured plan summary. Output strict JSON only:
{
  "objective": "Plan goal, one sentence",
  "milestones": [
    { "name": "milestone", "deadline": "YYYY-MM-DD", "status": "planned|in_progress|done" }
  ],
  "resources": ["required resources, e.g.: frontend engineer x2, designer x1"],
  "risks": ["identified risks"],
  "blockers": ["current blockers"]
}`,
  llmCall,
)
```

Now every child Session's L2 is structured, and Main Session can precisely compare fields during Integration.

## Step 3: Design IntegrateFn — Conflict Detection & Insight Pushing

IntegrateFn receives all plans' structured L2s and is responsible for:

1. Detecting **resource conflicts** — two plans both need "frontend engineer x2", but the team only has 3
2. Detecting **timeline clashes** — product launch and marketing milestones don't align
3. Detecting **dependencies** — hiring progress blocks product development
4. Generating targeted insights for each plan about cross-plan issues

```typescript
const integrateFn = createDefaultIntegrateFn(
  `You are a project coordination analyst. You received structured summaries (JSON) from multiple parallel plans.

Analyze:
1. Resource conflicts: which plans compete for the same resources?
2. Timeline clashes: are milestone dates unreasonably overlapping or gapped?
3. Dependencies: which plans' blockers depend on other plans' outputs?

Output JSON:
{
  "synthesis": "Global project status summary including conflicts and recommendations",
  "insights": [
    {
      "sessionId": "the plan's session ID",
      "content": "Cross-plan info and adjustment advice this plan needs"
    }
  ]
}`,
  llmCall,
)
```

## Step 4: How Information Flows

Suppose the user created three plans: Product Development, Marketing, and Hiring.

After a few turns in the "Product Development" Session, Consolidation triggers and L2 is generated as:

```json
{
  "objective": "Ship v2.0 by end of June",
  "milestones": [
    { "name": "API complete", "deadline": "2025-05-15", "status": "in_progress" },
    { "name": "Frontend rewrite", "deadline": "2025-06-01", "status": "planned" }
  ],
  "resources": ["frontend engineer x2", "backend engineer x1"],
  "risks": ["frontend understaffed, may delay"],
  "blockers": ["waiting for design handoff"]
}
```

Meanwhile, Marketing's L2 also contains `"resources": ["frontend engineer x1", "designer x1"]`.

During Integration, IntegrateFn detects the conflict and generates:

- **synthesis**: "Product and Marketing both need frontend engineers — total demand is 3, team has only 2. Suggest staggering the frontend rewrite and landing page work"
- **insight for Product Development**: "Marketing also needs 1 frontend in May for landing pages. Consider pushing the frontend rewrite to mid-June"
- **insight for Marketing**: "Product's frontend rewrite will occupy 2 frontend engineers in May–June. Consider completing the landing page by April or using outsourcing"
- **insight for Hiring**: "Both Product and Marketing report frontend understaffing. Prioritize frontend hiring"

Next time the user enters the Marketing Session, the insight is automatically injected into context — the marketing plan owner "knows" about the resource conflict, even though it never read Product's conversation.

## Step 5: Assemble Configuration

```typescript
const agent = createStelloAgent({
  sessions,
  memory,
  session: {
    sessionResolver: async (id) => { /* return the corresponding Session */ },
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

## Key Takeaways

- **L2 format is defined by ConsolidateFn** — it can be natural language, JSON, or even YAML. Structured formats enable precise field-level comparison (resource lists, date conflicts)
- **ConsolidateFn and IntegrateFn are paired** — if ConsolidateFn outputs JSON, IntegrateFn must parse JSON
- **Insights are replacement-based** — each Integration generates a fresh, complete recommendation
- **All flow happens asynchronously** — consolidation and integration are fire-and-forget
