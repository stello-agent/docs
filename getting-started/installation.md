# 安装

## 前置条件

- **Node.js** 18+
- **TypeScript** 5.0+（推荐）

## 安装

```bash
# 编排引擎（包含 Session 层）
pnpm add @stello-ai/core

# 仅 Session 层（单对话 + 记忆，不需要拓扑）
pnpm add @stello-ai/session

# 开发调试（星空图 + 实时面板）
pnpm add -D @stello-ai/devtools
```

## LLM SDK

按你使用的模型安装对应 SDK：

```bash
# Claude
pnpm add @anthropic-ai/sdk

# GPT / OpenAI 兼容服务
pnpm add openai
```

自行实现 `LLMAdapter` 接口则无需安装。
