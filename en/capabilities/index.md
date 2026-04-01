# Capabilities

This chapter demonstrates how to build real applications with Stello's core concepts through concrete examples. Each example focuses on one scenario, showing how to design system prompts, ConsolidateFn, and IntegrateFn for a specific collaboration pattern.

## Examples

| Scenario | Core Mechanism | Description |
|----------|---------------|-------------|
| [Project Planner](/en/capabilities/planner) | Structured L2 + conflict detection | Multiple plans in parallel; Main Session uses JSON-formatted L2 to precisely detect resource and timeline conflicts, pushing adjustment advice |
| [Brainstorming](/en/capabilities/brainstorm) | Divergent exploration + theme synthesis | Auto-split from one question into multiple exploration directions; Main Session finds connections and contradictions, driving cross-pollination of ideas |

## Common Pattern

Every example follows the same three-step design:

1. **Design System Prompts** — Main Session is the coordinator, child Sessions are direction-specific executors
2. **Design ConsolidateFn** — Define L2's format (natural language or JSON), deciding "what information each direction exposes externally"
3. **Design IntegrateFn** — Define how Main Session synthesizes all L2s into synthesis (global perspective) and insights (targeted advice)

The choice of L2 format is a key design decision: structured JSON suits precise comparison (e.g., resource conflicts), while natural language suits open-ended synthesis (e.g., creative fusion).
