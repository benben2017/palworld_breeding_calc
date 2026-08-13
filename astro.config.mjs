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
  // 全站纯静态预渲染。v1.0.16 起无 on-demand 路由（/api/feedback 已回退删除），
  // 如需新增 Worker 路由用 export const prerender = false 即可。
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
      // v1.0.16：/api/feedback 已删除（回归 mailto 方案），站点纯静态、无 308 行为，
      // 但带/不带斜杠详情页仍均 200——sitemap 用默认带斜杠 URL 与页面 canonical
      // 自引用完全一致，双版本信号统一到带斜杠版（v1.0.15 决策，持续生效）。
      // 历史：v1.0.15 曾因引入 Worker 触发平台 308 补斜杠而改为带斜杠方案。
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@fontsource/inter'],
    },
  },
});
