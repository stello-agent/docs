# Contributor Guide

Thank you for your interest in Stello! This document will help you get started with development.

## Tech Stack

- TypeScript strict mode
- pnpm monorepo
- Vitest test framework
- tsup build (outputs ESM + CJS + DTS)

## Repository Structure

```
packages/session   — @stello-ai/session, Session layer
packages/core      — @stello-ai/core, Orchestration layer
packages/server    — @stello-ai/server, HTTP/SDK layer
packages/devtools  — @stello-ai/devtools, Developer tools
demo/              — Example projects
```

## Development Setup

```bash
git clone https://github.com/stello-agent/stello.git
cd stello
pnpm install
pnpm build
```

## Running Tests

Tests for a single package:

```bash
cd packages/session
pnpm test
```

Run tests across all packages:

```bash
pnpm -r test
```

## Code Conventions

- Modules communicate only through interfaces; no cross-package imports of internal files
- Each function has a one-line Chinese comment describing its purpose
- Each interface has JSDoc documentation
- No `any` type allowed
- Follow the KISS principle; avoid over-abstraction

## Git Conventions

Commit message format:

```
<type>(module): short description in Chinese
```

Allowed types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`, `ci`

Examples:

```
feat(session): 实现 fork 上下文继承
fix(core): 修复 Scheduler 重复触发问题
test(server): 补充 AgentPool 生命周期测试
```

Run `git diff --stat` before pushing to confirm the scope of changes.

## PR Process

1. Create a feature branch from `main`
2. Write tests first (test-driven development)
3. Implement the feature, ensuring tests pass
4. Confirm test coverage is at least 80%
5. Submit a PR with a description and test plan
6. Wait for review, address feedback
7. Merge

## License

Apache-2.0
