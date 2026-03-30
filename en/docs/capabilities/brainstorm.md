# Brainstorming

This example shows how to build a **divergent brainstorming** tool with Stello — auto-splitting from one question into multiple exploration directions, with Main Session discovering connections and contradictions across directions to drive cross-pollination of ideas.

## Scenario: Product Innovation Brainstorm

A user wants to explore new feature directions for a product. As the conversation progresses, AI identifies different directions the user mentions (e.g., user experience, business model, technical feasibility) and automatically creates child Sessions for each. Main Session continuously observes progress across directions, spotting things like "the UX direction's proposal contradicts the technical feasibility conclusion," and proactively pushes cross-directional information.

The key difference from the Planner scenario: brainstorming uses **natural language** L2 instead of JSON, because creative exploration needs open-ended synthesis, not structured comparison.

## Step 1: Design System Prompts

Main Session is the creative director, responsible for connecting inspiration across directions:

```typescript
const mainSystemPrompt = `You are a creative director leading a product brainstorm.
- When the user mentions a new exploration direction, call stello_create_session
- Your job is to find connections, contradictions, and fusion opportunities across directions
- Proactively ask cross-directional questions like "What if we combined the idea from A with B?"
- Don't dive into single-direction details; encourage the user to explore in the sub-session`
```

Child Sessions are direction-specific explorers:

```typescript
function makeDirectionPrompt(direction: string): string {
  return `You are an exploration expert for the "${direction}" direction.
- Help the user diverge as much as possible — don't converge too early
- Propose bold hypotheses and ideas, even if immature
- Identify core assumptions and questions that need validation`
}
```

## Step 2: Design ConsolidateFn — Natural Language L2

Brainstorming L2 doesn't need structure — the value of ideas lies in semantic connections, not field comparison. We use natural language so IntegrateFn can do open-ended reasoning:

```typescript
const consolidateFn = createDefaultConsolidateFn(
  `Distill this brainstorming conversation into a creative summary.
Requirements:
- 150-200 words
- Preserve key ideas and core hypotheses, even if unvalidated
- Highlight this direction's unique perspective and open questions
- Write as one coherent paragraph, keeping the creative energy`,
  llmCall,
)
```

Contrast with the Planner's JSON — here we intentionally use natural language because IntegrateFn needs to understand **semantic connections** between ideas ("Direction A's subscription model and Direction B's community feature could combine"), not compare structured fields.

## Step 3: Design IntegrateFn — Cross-Pollination

IntegrateFn's goal isn't conflict detection, but **finding fusion opportunities**:

```typescript
const integrateFn = createDefaultIntegrateFn(
  `You are a creative synthesis analyst. You received creative summaries from multiple exploration directions.

Please:
1. Generate synthesis: What unexpected connections exist between directions? Which ideas can cross-pollinate? Are there contradictory assumptions that need resolution?
2. Generate insights for each direction: What findings from other directions could inspire or challenge it?

Focus on cross-pollination — help each direction see connections it can't see on its own.

Output JSON:
{
  "synthesis": "Cross-directional insights...",
  "insights": [
    { "sessionId": "xxx", "content": "Inspiration or challenges from other directions..." }
  ]
}`,
  llmCall,
)
```

## Step 4: How Information Flows

The user asks "How can our note-taking app grow?" and AI creates three directions:

- **User Experience**: exploring "make notes flow like conversation" interaction ideas
- **Business Model**: exploring "free-to-paid conversion paths"
- **Technical Feasibility**: evaluating "can real-time collaboration and E2E encryption coexist?"

After a few turns in the UX direction, Consolidation generates L2:

> "Core idea is 'conversational notes' — users don't write notes, they talk to AI, which auto-organizes into structured notes. Key assumption: users prefer voice over keyboard. To validate: voice input experience in noisy environments."

Meanwhile, Business Model's L2 mentions "subscription + AI usage billing," and Technical Feasibility mentions "E2E encryption blocks server-side AI processing."

Integration spots the contradiction and pushes:

- **synthesis**: "The UX direction's 'AI auto-organization' requires server-side processing, but Technical Feasibility notes E2E encryption blocks this. A privacy vs. AI capability trade-off is needed. The Business Model's AI usage billing naturally aligns with conversational interaction."
- **insight for UX**: "Note: Technical direction found E2E encryption conflicts with server-side AI. Your 'AI auto-organization' may need a local inference fallback"
- **insight for Technical Feasibility**: "UX's core idea depends on server-side AI. Evaluate a hybrid approach: local for initial processing, cloud for deep organization, user-selectable encryption level"
- **insight for Business Model**: "Conversational interaction will significantly increase AI call volume — synergistic with your usage billing model, but watch for user cost sensitivity"

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

## Comparison: Planner vs Brainstorm

| | Planner | Brainstorm |
|--|---------|------------|
| L2 format | Structured JSON | Natural language |
| IntegrateFn goal | Conflict detection | Cross-pollination |
| Insight style | "Watch for conflicts, adjust accordingly" | "Other directions have inspiration, consider fusion" |
| Best for | Precise coordination, resource management | Creative divergence, open exploration |

Both use the exact same underlying mechanism (ConsolidateFn → L2 → IntegrateFn → synthesis + insights). The difference is only in prompt design and L2 format choice.
