// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import { TOP50_PALS } from './src/config/top50-pals';

// https://astro.build/config
export default defineConfig({
  site: 'https://palbreed.space',
  // static（Astro 5.18+ hybrid 已移除，static 行为相同）：
  // 页面默认静态预渲染（走 CF Pages 静态），仅 /api/feedback 用 export const prerender = false 走 on-demand Worker
  output: 'static',
  adapter: cloudflare({ platformProxy: { enabled: false } }),
  integrations: [
    react(),
    sitemap({
      // 仅 indexable 页面进 sitemap（PRD §5：Top50 Pal 详情 index，其余 noindex 不进 sitemap）
      filter: (page) => {
        const match = page.match(/\/pals\/([a-z0-9_]+)\/?$/);
        if (match) return TOP50_PALS.includes(match[1]);
        return true;
      },
      // QA11 P1-1: sitemap detail URLs use no-slash form (match canonical / middleware 308 target)
      serialize: (item) => {
        if (/^https:\/\/palbreed\.space\/pals\/[a-z0-9_]+\/$/.test(item.url)) {
          item.url = item.url.slice(0, -1);
        }
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@fontsource/inter'],
    },
  },
});
