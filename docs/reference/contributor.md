# 贡献指南

感谢你对 Stello 的关注！本文档帮助你快速上手开发。

## 技术栈

- TypeScript 严格模式
- pnpm monorepo
- Vitest 测试框架
- tsup 构建（输出 ESM + CJS + DTS）

## 仓库结构

```
packages/session   — @stello-ai/session，Session 层
packages/core      — @stello-ai/core，编排层
packages/server    — @stello-ai/server，HTTP/SDK 层
packages/devtools  — @stello-ai/devtools，开发者工具
demo/              — 示例项目
```

## 开发环境搭建

```bash
git clone https://github.com/stello-agent/stello.git
cd stello
pnpm install
pnpm build
```

## 运行测试

单个包的测试：

```bash
cd packages/session
pnpm test
```

运行所有包的测试：

```bash
pnpm -r test
```

## 代码规范

- 模块间只通过 interface 通信，不允许跨包 import 内部文件
- 每个函数写一行中文注释说明用途
- 每个 interface 写 JSDoc 注释
- 不允许使用 `any` 类型
- 遵循 KISS 原则，不做过度抽象

## Git 规范

Commit 消息格式：

```
<type>(模块名): 简短中文描述
```

type 可选值：`feat`、`fix`、`docs`、`test`、`chore`、`refactor`、`perf`、`ci`

示例：

```
feat(session): 实现 fork 上下文继承
fix(core): 修复 Scheduler 重复触发问题
test(server): 补充 AgentPool 生命周期测试
```

Push 前先运行 `git diff --stat` 确认改动范围。

## PR 流程

1. 从 `main` 创建功能分支
2. 编写测试（测试先行）
3. 实现功能，确保测试通过
4. 确认测试覆盖率达到 80% 以上
5. 提交 PR，填写描述和测试计划
6. 等待 review，根据反馈修改
7. 合并

## 许可证

Apache-2.0
