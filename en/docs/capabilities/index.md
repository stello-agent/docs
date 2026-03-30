# Capabilities

Stello provides comprehensive configuration through `StelloAgentConfig`, covering Session integration, capability injection, scheduling strategies, and runtime management. This page lists all configuration points grouped by function.

> For detailed type definitions and parameter descriptions, see the [Configuration Reference](/en/docs/api-reference/core-configuration).

## Session Integration

Connect `@stello-ai/session` Session / MainSession into the core Engine system.

| Field | Description |
|-------|-------------|
| `session.sessionResolver` | Resolve a real Session instance by sessionId |
| `session.mainSessionResolver` | Resolve the MainSession; only needed when integration is required |
| `session.consolidateFn` | Session L3 to L2 distillation function |
| `session.integrateFn` | MainSession integration function |
| `session.serializeSendResult` | Serialization for send() results, defaults to JSON |
| `session.toolCallParser` | Tool call parser used by TurnRunner |

## Capability Injection

Inject external capabilities required by the Engine via `capabilities`.

| Field | Description |
|-------|-------------|
| `capabilities.lifecycle` | Lifecycle adapter: bootstrap, afterTurn, prepareChildSpawn |
| `capabilities.tools` | Tool runtime: getToolDefinitions + executeTool |
| `capabilities.skills` | Skill router: register, match, and list Skills |
| `capabilities.confirm` | Confirm protocol: split confirmation, L1 update confirmation |

## Scheduling Strategy

Configure consolidation and integration triggers via `orchestration.scheduler`.

| Field | Description |
|-------|-------------|
| `scheduler.consolidation.trigger` | Trigger: `manual` / `everyNTurns` / `onSwitch` / `onArchive` / `onLeave` |
| `scheduler.consolidation.everyNTurns` | Trigger every N turns (only for `everyNTurns` mode) |
| `scheduler.integration.trigger` | Trigger: `manual` / `afterConsolidate` / `everyNTurns` / `onSwitch` / `onArchive` / `onLeave` |
| `scheduler.integration.everyNTurns` | Trigger every N turns (only for `everyNTurns` mode) |

## Runtime Management

Configure Engine runtime recycling via `runtime.recyclePolicy`.

| Field | Description |
|-------|-------------|
| `runtime.recyclePolicy.idleTtlMs` | Idle recycling delay (ms). `0` or unset means immediate recycling when ref count reaches zero; `> 0` means delayed recycling, re-acquiring cancels pending recycling |

## Event Hooks

Inject Engine-level event hooks via `orchestration.hooks`. There are 11 hook methods in total.

| Hook | Trigger |
|------|---------|
| `onMessageReceived` | When a user message is received |
| `onAssistantReply` | After the LLM returns a response |
| `onToolCall` | Before a tool call is executed |
| `onToolResult` | After a tool call completes |
| `onSessionEnter` | When entering a Session |
| `onSessionLeave` | When leaving a Session |
| `onRoundStart` | When a conversation round starts |
| `onRoundEnd` | When a conversation round ends |
| `onSessionArchive` | When a Session is archived |
| `onSessionFork` | When a Session forks a child Session |
| `onError` | When an error occurs |

## Split Guard

Prevent premature or overly frequent Session splits via `orchestration.splitGuard`.

| Field | Default | Description |
|-------|---------|-------------|
| `minTurns` | `3` | Minimum turns before a Session can split |
| `cooldownTurns` | `5` | Minimum turns between two splits |

## Hot Config

Dynamically modify certain configuration at runtime via `StelloAgent.updateConfig()`, without rebuilding the Agent.

```typescript
interface StelloAgentHotConfig {
  runtime?: Partial<RuntimeRecyclePolicy>
  scheduling?: Partial<SchedulerConfig>
  splitGuard?: Partial<{ minTurns: number; cooldownTurns: number }>
}
```

Fields that support hot updates:

| Group | Updatable Fields |
|-------|-----------------|
| `runtime` | `idleTtlMs` |
| `scheduling` | `consolidation.trigger`, `consolidation.everyNTurns`, `integration.trigger`, `integration.everyNTurns` |
| `splitGuard` | `minTurns`, `cooldownTurns` |
