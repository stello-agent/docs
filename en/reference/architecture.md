# Architecture

Stello uses a four-layer architecture with clear responsibilities, one-way dependencies, and independent testability. The dependency direction is: Server → Core → Session.

## Session Layer (@stello-ai/session)

The Session layer is the foundational conversation unit of the entire system. Each Session is an **independent, memory-enabled conversation entity**, fully decoupled from the tree topology -- a Session has no awareness of its position in the tree, nor of any other Session's existence.

A Session is responsible for three things: context assembly, a single LLM call, and memory management. When `send()` is called, the Session assembles context according to fixed rules (system prompt + insights + L3 history + current message), sends it to the LLM, stores the response in L3, and returns. Note that a Session only makes a **single** LLM call and does not handle tool call loops.

Sessions implement a three-layer memory model. L3 is the raw conversation history, consumed by that Session's own LLM. L2 is the skill description (external perspective), distilled from L3 via `consolidate(fn)`, consumed by the Main Session. L1-structured is a global key-value store, read and written directly by the application layer.

Session and MainSession are two distinct conversation interfaces. A regular Session's context includes the system prompt, insights, and L3 history; MainSession's context includes the system prompt, synthesis, and L3 history. MainSession uses `integrate(fn)` to collect all child Sessions' L2s, producing synthesis (a holistic understanding of all skills) and insights (targeted recommendations pushed to each child Session).

## Orchestration Layer (@stello-ai/core)

The orchestration layer is an execution cycle manager built on top of Session primitives. It does not create new capabilities -- it composes Session-layer capabilities.

**Engine** is the core of the orchestration layer. It drives the tool call loop: calling `Session.send()`, checking whether the response contains tool calls, executing tools, calling `send()` again, and repeating until the LLM stops requesting tools. After each `turn()` completes, the Engine uses the Scheduler to determine whether consolidation or integration should be triggered.

**TurnRunner** handles the multi-round tool call loop execution within a single Session. It is an internal component of the Engine.

**SessionOrchestrator** manages Session lifecycle operations: `fork()` (create a child Session + write a topology node), `archive()` (archive a Session), and `enter()`/`leave()` (switch the active Session). These operations involve coordinating between the Session layer and the storage layer, handled uniformly by the Orchestrator.

**Scheduler** is the scheduling strategy component that determines when to trigger consolidation and integration. It supports multiple trigger strategies: `onSwitch` (when switching Sessions), `everyNTurns` (after every N conversation turns), `onArchive` (when archiving), and `manual` (manually triggered).

**Strategy** defines how the Session topology is organized. `FlatStrategy` is the default, placing all child Sessions flat under the Main Session. `HierarchicalOkrStrategy` is not yet implemented and is planned to support multi-level nesting.

**SplitGuard** performs pre-checks before forking, deciding whether to allow the creation of a new child Session.

**RuntimeManager** manages the lifecycle of Session runtime instances, using reference counting and idle TTL mechanisms to control resource release.

All asynchronous side effects in the orchestration layer (consolidation, integration) are executed in a fire-and-forget manner, never blocking `turn()` from returning.

## Application Layer

The application layer is where developers integrate with Stello. Developers provide the following components via dependency injection:

- **StorageAdapter**: Persistence abstraction, split by consumer responsibility into `SessionStorage` and `MainStorage`
- **LLMAdapter**: LLM interface that accepts message arrays, supports tool use and optional streaming
- **ConsolidateFn**: L3 → L2 transformation logic; defines the L2 format; the function chooses its own LLM tier internally
- **IntegrateFn**: All L2s → synthesis + insights; paired with ConsolidateFn; the function chooses its own LLM tier internally
- **system prompt**: Globally shared system prompt
- **Tool definitions**: Tool schemas and execution functions
- **ConfirmProtocol**: User confirmation protocol for operations requiring human approval
- **EngineLifecycleAdapter**: Engine lifecycle hooks

ConsolidateFn and IntegrateFn are paired functions -- ConsolidateFn outputs L2 in a certain format, and IntegrateFn reads that format. The framework is completely agnostic to L2 content format; the format is defined entirely by the application layer.

## HTTP/SDK Layer (@stello-ai/server)

The HTTP/SDK layer is a thin service wrapper on top of the orchestration layer, providing cross-language access and multi-tenant support.

This layer offers both REST and WebSocket access. REST handles synchronous operations (creating Sessions, sending messages, querying state), while WebSocket handles real-time push (streaming responses, event notifications).

Persistence uses PostgreSQL, providing a production-grade `StorageAdapter` implementation.

Multi-tenancy is implemented through a Spaces mechanism, where each Space is an isolated data domain.

AgentPool manages the lifecycle and resource allocation of multiple Agent instances.

## Data Flow

**Conversation flow**: A user message enters `Engine.turn()`, and the Engine calls `Session.send()` for a single LLM call. If the response contains tool calls, TurnRunner executes the tools and calls `send()` again, looping until complete. Conversation records from the response are stored in L3. After `turn()` returns, the Scheduler checks whether consolidation or integration should be triggered.

**Consolidation flow**: When the Scheduler determines a trigger, it asynchronously invokes `ConsolidateFn`, distilling the Session's L3 history into L2 and storing it. This process does not block conversation.

**Integration flow**: When the Scheduler determines a trigger, it asynchronously calls `getAllSessionL2s()` to collect all child Sessions' L2s, passes them to `IntegrateFn`, and produces synthesis and insights, stored in the Main Session and each child Session's storage slots respectively. This also does not block conversation.

## Dependency Direction

Server → Core → Session, strictly one-way. The Session layer is unaware of Core's existence, and Core is unaware of Server's existence. Each layer can be tested independently: the Session layer only needs mock StorageAdapter and LLMAdapter, the Core layer only needs mock Session interfaces, and the Server layer only needs a mock Engine.
