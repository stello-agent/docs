# Introduction

## What Problem Does Stello Solve?

Ever feel your AI conversations trapped in a single thread? Your thinking diverges, branching in multiple directions and weaving together—but the dialogue keeps growing, context tightens, and response quality quietly degrades. Two hours later you close the window—no structure remains. Days later you want to continue, but can't even recall where you left off.

**It's not the model—it's how you collaborate with AI that's primitive!**

Your thinking is branching and evolving, yet AI interacts with you linearly through a scrolling window.

Stello explodes that line into a network—every conversation builds a self-aware, growing cognitive topology.

**You and AI, co-evolving in Stello.**

## What is Stello?

**The first AI-Native cognitive topology system.**

Stello is an open-source conversation topology engine for AI Agent and AI application developers. It provides four core capabilities:

- **Auto-splitting Conversations** — AI detects topic branches and creates child Sessions via tool calling, each with clear scope
- **Three-layer Memory** — L3 raw records / L2 skill descriptions / L1 global cognition, memory flows between layers
- **Global Awareness** — Main Session collects all child Session L2s, generates synthesis and pushes targeted insights
- **Starfield Visualization** — Each star is a thinking direction, connections show relations, size maps depth, brightness maps activity

Conversations auto-split into independent Sessions by semantics, forming tree-structured topologies. The three-layer memory system inherits hierarchically across Sessions. The global consciousness layer (Main Session) perceives conflicts and dependencies across all branches, pushing targeted insights. The entire cognitive topology renders as a growable, conversable star-node graph.

All memory refinement runs asynchronously (fire-and-forget), with **zero in-conversation LLM overhead**.

## Package Overview

| Package | Purpose | Use For |
|---------|---------|---------|
| **@stello-ai/session** | Standalone conversation unit, minimal three-layer memory | Simple scenarios needing single conversation + memory |
| **@stello-ai/core** | Orchestration engine, session tree scheduler | Complex apps with multi-branch dialogue + global synthesis |
| **@stello-ai/server** | Service layer, PostgreSQL + HTTP/WebSocket | Production deployments + multi-user SaaS |
| **@stello-ai/devtools** | Dev debugger, star map + live panels | Development-stage visual debugging |

## Use Cases

- **Deep Consulting** — Legal, medical, financial multi-dimensional analysis, avoiding information pollution
- **Knowledge Exploration** — Learning and researching multiple topics in parallel, auto-building knowledge maps
- **Goal Decomposition** — Startup planning, project management, OKR execution with hierarchical tasks
- **System Building** — Course systems, knowledge systems, product architecture with layered design
- **Creative Production** — Content and design exploring multiple approaches in parallel, maintaining global consistency
- **Office Collaboration** — Multi-task coordination, AI discovers omissions and cross-task dependencies

For scenarios needing **simultaneous multi-directional progress + global oversight**.
