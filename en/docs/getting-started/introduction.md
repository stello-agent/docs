# Introduction

## The Problem

You spent two hours talking to AI. Product direction, tech stack, fundraising timeline, hiring plan. You close the window — no structure remains.

Next time you open a new conversation, starting from scratch. You remember what you discussed; AI doesn't. A decision you made in topic A affects topic B, but nothing connects them. The more you talk, the messier it gets.

It's not that AI isn't smart enough. The conversation container is too primitive — a single line can't hold what's happening in your brain. Your thinking is branching, connecting, layering, but the tool flattens it.

## What is Stello

Stello is an open-source conversation topology engine for AI Agent and AI application developers. It turns conversations from a line into a growing tree — each branch goes deep independently, a global layer maintains the big picture, and the whole thing renders as a starfield map.

Imagine you're planning something complex. You're chatting with AI, and it says: "The technical architecture discussion is getting deep — want to branch it off?" You say yes. A new star appears on the map.

You jump in, go deep on the technical approach. When you're done, you return to the central star — it knows what decisions you made in the technical branch, knows those decisions affect the hiring timeline and fundraising, and proactively tells you.

You didn't manually organize anything. You just jumped between stars. The system remembers, organizes, and discovers connections on its own.

Three days later you open it up. Everything's there. Each star holds complete conversations and memories. You can continue from any star.

## Developer Perspective

As an SDK, Stello provides four core mechanisms:

- **Auto-splitting Conversations** — AI detects topic forks and creates child Sessions via tool calls, each with independent context and role
- **Three-layer Memory** — L3 raw conversation / L2 skill description / L1 global cognition, memory flows asynchronously across layers with zero in-conversation LLM overhead
- **Global Awareness** — Main Session collects all child Session summaries, generates a global perspective (synthesis) and pushes targeted advice (insights) to each branch
- **Starfield Visualization** — Each star is a thinking direction, connections show relations, size maps depth, brightness maps activity

You define how memory is distilled (ConsolidateFn) and how it's synthesized (IntegrateFn). Stello handles the scheduling and flow.

## Package Overview

| Package | Purpose | Use For |
|---------|---------|---------|
| **@stello-ai/core** | Orchestration engine, Session tree scheduling + memory flow | Multi-branch dialogue + global synthesis (recommended starting point) |
| **@stello-ai/session** | Standalone conversation unit, minimal three-layer memory | Simple scenarios needing single conversation + memory |
| **@stello-ai/server** | Service layer, PostgreSQL + HTTP/WebSocket | Production deployment + multi-user SaaS |
| **@stello-ai/devtools** | Starfield map + live debug panels | Development-stage visual debugging |

## Where It's Used

- **Learning** — Concepts auto-split into a tree structure. When you reach quantum entanglement, it remembers what you learned in the qubit star — no redundant explanations
- **Consulting** — Legal, medical, financial — one star per direction, going deep while keeping global oversight. AI finds cross-dependencies you didn't notice
- **Brainstorming** — Each person explores a different direction; the central star weaves all threads together, with full conversation depth in every star
- **Planning** — Break big goals into sub-goals. Discuss at any level, and the level above knows the progress
- **Decision-making** — Evaluate multiple options simultaneously. AI cross-compares and spots when an assumption in Option A contradicts Option B
- **Office** — Multiple parallel tasks, each progressing independently. AI coordinates priorities, catches gaps, tracks progress
