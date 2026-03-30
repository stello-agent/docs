import { defineConfig } from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'
import { copyOrDownloadAsMarkdownButtons } from 'vitepress-plugin-llms'

const zhSidebar = [
  {
    text: '快速开始',
    items: [
      { text: '简介', link: '/docs/getting-started/introduction' },
      { text: '安装', link: '/docs/getting-started/installation' },
      { text: '快速上手', link: '/docs/getting-started/quick-start' },
    ],
  },
  {
    text: '核心概念',
    items: [
      { text: '概览', link: '/docs/core-concepts/' },
      { text: 'Session 与拓扑', link: '/docs/core-concepts/session-and-topology' },
      { text: '三层记忆模型', link: '/docs/core-concepts/three-layer-memory' },
      { text: 'Consolidation 与 Integration', link: '/docs/core-concepts/consolidation-and-integration' },
      { text: '编排策略', link: '/docs/core-concepts/orchestration-strategy' },
    ],
  },
  {
    text: '核心能力',
    items: [
      { text: '概览', link: '/docs/capabilities/' },
    ],
  },
  {
    text: 'API 参考',
    items: [
      { text: '@stello-ai/session', link: '/docs/api-reference/session' },
      { text: '@stello-ai/core', link: '/docs/api-reference/core' },
      { text: '@stello-ai/core 配置', link: '/docs/api-reference/core-configuration' },
      { text: '@stello-ai/server', link: '/docs/api-reference/server' },
      { text: '@stello-ai/devtools', link: '/docs/api-reference/devtools' },
    ],
  },
  {
    text: '指南',
    items: [
      { text: '自定义 LLM 适配器', link: '/docs/guides/custom-llm-adapter' },
      { text: '工具调用', link: '/docs/guides/tool-calling' },
      { text: '存储适配器', link: '/docs/guides/storage-adapters' },
      {
        text: '编排策略',
        collapsed: false,
        items: [
          { text: '概览', link: '/docs/guides/orchestration-strategies/' },
          { text: '平铺策略', link: '/docs/guides/orchestration-strategies/flat-strategy' },
          { text: 'OKR 层级策略', link: '/docs/guides/orchestration-strategies/okr-hierarchical-strategy' },
        ],
      },
      { text: '使用 DevTools', link: '/docs/guides/using-devtools' },
      { text: '服务端部署', link: '/docs/guides/server-deployment' },
    ],
  },
  {
    text: '参考',
    items: [
      { text: '贡献指南', link: '/docs/reference/contributor' },
      { text: '架构设计', link: '/docs/reference/architecture' },
      { text: '常见问题', link: '/docs/reference/faq' },
    ],
  },
]

const enSidebar = [
  {
    text: 'Getting Started',
    items: [
      { text: 'Introduction', link: '/en/docs/getting-started/introduction' },
      { text: 'Installation', link: '/en/docs/getting-started/installation' },
      { text: 'Quick Start', link: '/en/docs/getting-started/quick-start' },
    ],
  },
  {
    text: 'Core Concepts',
    items: [
      { text: 'Overview', link: '/en/docs/core-concepts/' },
      { text: 'Session & Topology', link: '/en/docs/core-concepts/session-and-topology' },
      { text: 'Three-Layer Memory', link: '/en/docs/core-concepts/three-layer-memory' },
      { text: 'Consolidation & Integration', link: '/en/docs/core-concepts/consolidation-and-integration' },
      { text: 'Orchestration Strategy', link: '/en/docs/core-concepts/orchestration-strategy' },
    ],
  },
  {
    text: 'Capabilities',
    items: [
      { text: 'Overview', link: '/en/docs/capabilities/' },
    ],
  },
  {
    text: 'API Reference',
    items: [
      { text: '@stello-ai/session', link: '/en/docs/api-reference/session' },
      { text: '@stello-ai/core', link: '/en/docs/api-reference/core' },
      { text: '@stello-ai/core Configuration', link: '/en/docs/api-reference/core-configuration' },
      { text: '@stello-ai/server', link: '/en/docs/api-reference/server' },
      { text: '@stello-ai/devtools', link: '/en/docs/api-reference/devtools' },
    ],
  },
  {
    text: 'Guides',
    items: [
      { text: 'Custom LLM Adapter', link: '/en/docs/guides/custom-llm-adapter' },
      { text: 'Tool Calling', link: '/en/docs/guides/tool-calling' },
      { text: 'Storage Adapters', link: '/en/docs/guides/storage-adapters' },
      {
        text: 'Orchestration Strategies',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/en/docs/guides/orchestration-strategies/' },
          { text: 'Flat Strategy', link: '/en/docs/guides/orchestration-strategies/flat-strategy' },
          { text: 'OKR Hierarchical Strategy', link: '/en/docs/guides/orchestration-strategies/okr-hierarchical-strategy' },
        ],
      },
      { text: 'Using DevTools', link: '/en/docs/guides/using-devtools' },
      { text: 'Server Deployment', link: '/en/docs/guides/server-deployment' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'Contributor', link: '/en/docs/reference/contributor' },
      { text: 'Architecture', link: '/en/docs/reference/architecture' },
      { text: 'FAQ', link: '/en/docs/reference/faq' },
    ],
  },
]

export default defineConfig({
  title: 'Stello',
  base: '/docs/',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/docs/stello_logo.svg' }],
  ],

  locales: {
    root: {
      label: '中文',
      lang: 'zh-CN',
      description: '开源对话拓扑引擎',
      themeConfig: {
        nav: [
          { text: '文档', link: '/docs/getting-started/introduction' },
        ],
        sidebar: {
          '/docs/': zhSidebar,
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      description: 'Open-source Conversation Topology Engine',
      themeConfig: {
        nav: [
          { text: 'Docs', link: '/en/docs/getting-started/introduction' },
        ],
        sidebar: {
          '/en/docs/': enSidebar,
        },
      },
    },
  },

  vite: {
    plugins: [llmstxt()],
  },

  markdown: {
    config(md) {
      md.use(copyOrDownloadAsMarkdownButtons)
    },
  },

  themeConfig: {
    logo: {
      light: '/stello_logo.svg',
      dark: '/stello_logo_dark.svg',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/stello-agent/stello' },
    ],
  },
})
