# Installation

## Prerequisites

- **Node.js** 18+
- **TypeScript** 5.0+ (recommended)

## Install

```bash
# Orchestration engine (includes Session layer)
pnpm add @stello-ai/core

# Session layer only (single conversation + memory, no topology)
pnpm add @stello-ai/session

# Dev tools (star map + live panels)
pnpm add -D @stello-ai/devtools
```

## LLM SDK

Install the SDK for your model provider:

```bash
# Claude
pnpm add @anthropic-ai/sdk

# GPT / OpenAI-compatible services
pnpm add openai
```

Not required if you implement the `LLMAdapter` interface yourself.
