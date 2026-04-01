import DefaultTheme from 'vitepress/theme'
import './custom.css'
import type { Theme } from 'vitepress'
import CopyOrDownloadAsMarkdownButtons from 'vitepress-plugin-llms/vitepress-components/CopyOrDownloadAsMarkdownButtons.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.component('CopyOrDownloadAsMarkdownButtons', CopyOrDownloadAsMarkdownButtons)

    if (typeof window !== 'undefined') {
      // Logo 点击跳转到主站而非 docs 首页
      const observer = new MutationObserver(() => {
        const link = document.querySelector('a.VPNavBarTitle') as HTMLAnchorElement | null
        if (link && !link.dataset.patched) {
          link.href = '/'
          link.dataset.patched = 'true'
          link.addEventListener('click', (e) => {
            e.preventDefault()
            window.location.href = '/'
          })
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }
  },
} satisfies Theme
