# FAQ

## How is Stello different from a typical chatbot framework?

Typical chatbot frameworks focus on single-turn or multi-turn linear conversations. Stello focuses on **conversation topology and layered memory** -- it enables AI Agents to split linear conversations into tree-shaped Sessions, where each Session is an independent skill unit, and cross-branch insights are relayed through the Main Session. If your use case involves parallel multi-tasking, skill decomposition, or long-term memory management, Stello is a better fit.

## Do I have to use TypeScript?

TypeScript is recommended for full type hints and compile-time checks. JavaScript works perfectly fine with all of Stello's features, but you will lose the type safety guarantees that come with interface definitions.

## Which LLMs are supported?

Stello includes built-in adapters for Claude and GPT. Any OpenAI-compatible API service can be quickly connected via `createOpenAICompatibleAdapter`. If your LLM is not OpenAI-compatible, you can implement the `LLMAdapter` interface yourself -- it simply needs to accept a message array and return a response.

## Where is data stored?

It depends on the `StorageAdapter` implementation you provide. During development, you can use `InMemoryStorageAdapter`, which stores data in memory and loses it when the process exits. For production, the PostgreSQL implementation provided by `@stello-ai/server` is recommended, persisting data to a database. You can also implement your own `StorageAdapter` to connect to any storage backend.

## Do Consolidation and Integration block the conversation?

No. Consolidation (L3 → L2 distillation) and Integration (all L2s → synthesis + insights) are both executed asynchronously in a fire-and-forget manner. They never block `turn()` from returning. Users will not perceive any delay. If an error occurs during async execution, the framework emits the error through its event mechanism without interrupting the conversation cycle.

## Can child Sessions communicate directly with each other?

No. Child Sessions are fully isolated and have no awareness of each other's existence. All cross-branch communication happens through the Main Session's insights mechanism: during integration, the Main Session reads all child Sessions' L2s and generates targeted insights that are pushed to each child Session. This is an intentional design choice -- maintaining Session independence and avoiding complex cross-Session dependencies.

## When will HierarchicalOkrStrategy be available?

`HierarchicalOkrStrategy` is not yet implemented. The current default is `FlatStrategy`, which places all child Sessions flat under the Main Session. If you need multi-level nested Session topologies, contributions are welcome.

## How can I contribute?

Please see the [Contributor Guide](./contributor.md) page, which includes detailed information on development setup, code conventions, Git conventions, and the PR process.
