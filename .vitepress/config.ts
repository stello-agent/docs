import { defineConfig } from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'
import { copyOrDownloadAsMarkdownButtons } from 'vitepress-plugin-llms'

const zhSidebar = [
	{
		text: '快速开始',
		items: [
			{ text: '简介', link: '/getting-started/introduction' },
			{ text: '安装', link: '/getting-started/installation' },
			{ text: '快速上手', link: '/getting-started/quick-start' },
		],
	},
	{
		text: '核心概念',
		items: [
			{ text: '概览', link: '/core-concepts/' },
			{ text: 'Session 与拓扑', link: '/core-concepts/session-and-topology' },
			{ text: '三层记忆模型', link: '/core-concepts/three-layer-memory' },
			{ text: 'Consolidation 与 Integration', link: '/core-concepts/consolidation-and-integration' },
			{ text: '编排策略', link: '/core-concepts/orchestration-strategy' },
		],
	},
	{
		text: '核心能力',
		items: [
			{ text: '概览', link: '/capabilities/' },
			{ text: '项目规划助手', link: '/capabilities/planner' },
			{ text: '头脑风暴', link: '/capabilities/brainstorm' },
		],
	},
	{
		text: 'API 参考',
		items: [
			{ text: '@stello-ai/session', link: '/api-reference/session' },
			{ text: '@stello-ai/core', link: '/api-reference/core' },
			{ text: '@stello-ai/core 配置', link: '/api-reference/core-configuration' },
			{ text: '@stello-ai/server', link: '/api-reference/server' },
			{ text: '@stello-ai/devtools', link: '/api-reference/devtools' },
		],
	},
	{
		text: '指南',
		items: [
			{ text: '自定义 LLM 适配器', link: '/guides/custom-llm-adapter' },
			{ text: '工具调用', link: '/guides/tool-calling' },
			{ text: '存储适配器', link: '/guides/storage-adapters' },
			{
				text: '编排策略',
				collapsed: false,
				items: [
					{ text: '概览', link: '/guides/orchestration-strategies/' },
					{ text: '平铺策略', link: '/guides/orchestration-strategies/flat-strategy' },
					{ text: 'OKR 层级策略', link: '/guides/orchestration-strategies/okr-hierarchical-strategy' },
				],
			},
			{ text: '使用 DevTools', link: '/guides/using-devtools' },
			{ text: '服务端部署', link: '/guides/server-deployment' },
		],
	},
	{
		text: '参考',
		items: [
			{ text: '贡献指南', link: '/reference/contributor' },
			{ text: '架构设计', link: '/reference/architecture' },
			{ text: '常见问题', link: '/reference/faq' },
		],
	},
]

const enSidebar = [
	{
		text: 'Getting Started',
		items: [
			{ text: 'Introduction', link: '/en/getting-started/introduction' },
			{ text: 'Installation', link: '/en/getting-started/installation' },
			{ text: 'Quick Start', link: '/en/getting-started/quick-start' },
		],
	},
	{
		text: 'Core Concepts',
		items: [
			{ text: 'Overview', link: '/en/core-concepts/' },
			{ text: 'Session & Topology', link: '/en/core-concepts/session-and-topology' },
			{ text: 'Three-Layer Memory', link: '/en/core-concepts/three-layer-memory' },
			{ text: 'Consolidation & Integration', link: '/en/core-concepts/consolidation-and-integration' },
			{ text: 'Orchestration Strategy', link: '/en/core-concepts/orchestration-strategy' },
		],
	},
	{
		text: 'Capabilities',
		items: [
			{ text: 'Overview', link: '/en/capabilities/' },
			{ text: 'Project Planner', link: '/en/capabilities/planner' },
			{ text: 'Brainstorming', link: '/en/capabilities/brainstorm' },
		],
	},
	{
		text: 'API Reference',
		items: [
			{ text: '@stello-ai/session', link: '/en/api-reference/session' },
			{ text: '@stello-ai/core', link: '/en/api-reference/core' },
			{ text: '@stello-ai/core Configuration', link: '/en/api-reference/core-configuration' },
			{ text: '@stello-ai/server', link: '/en/api-reference/server' },
			{ text: '@stello-ai/devtools', link: '/en/api-reference/devtools' },
		],
	},
	{
		text: 'Guides',
		items: [
			{ text: 'Custom LLM Adapter', link: '/en/guides/custom-llm-adapter' },
			{ text: 'Tool Calling', link: '/en/guides/tool-calling' },
			{ text: 'Storage Adapters', link: '/en/guides/storage-adapters' },
			{
				text: 'Orchestration Strategies',
				collapsed: false,
				items: [
					{ text: 'Overview', link: '/en/guides/orchestration-strategies/' },
					{ text: 'Flat Strategy', link: '/en/guides/orchestration-strategies/flat-strategy' },
					{ text: 'OKR Hierarchical Strategy', link: '/en/guides/orchestration-strategies/okr-hierarchical-strategy' },
				],
			},
			{ text: 'Using DevTools', link: '/en/guides/using-devtools' },
			{ text: 'Server Deployment', link: '/en/guides/server-deployment' },
		],
	},
	{
		text: 'Reference',
		items: [
			{ text: 'Contributor', link: '/en/reference/contributor' },
			{ text: 'Architecture', link: '/en/reference/architecture' },
			{ text: 'FAQ', link: '/en/reference/faq' },
		],
	},
]

export default defineConfig({
	title: 'Stello',
	base: '/docs/',
	cleanUrls: true,
	head: [
		['link', { rel: 'icon', type: 'image/svg+xml', href: '/stello_logo.svg' }],
	],

	locales: {
		root: {
			label: '中文',
			lang: 'zh-CN',
			description: '开源对话拓扑引擎',
			themeConfig: {
				nav: [
					{ text: '文档', link: '/getting-started/introduction' },
				],
				sidebar: {
					'/': zhSidebar,
				},
			},
		},
		en: {
			label: 'English',
			lang: 'en-US',
			description: 'Open-source Conversation Topology Engine',
			themeConfig: {
				nav: [
					{ text: 'Docs', link: '/en/getting-started/introduction' },
				],
				sidebar: {
					'/en/': enSidebar,
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
		logoLink: 'https://stello-agent.com',

		socialLinks: [
			{ icon: 'github', link: 'https://github.com/stello-agent/stello' },
		],
	},
})
