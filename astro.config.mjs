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
      // v1.0.15：不再去斜杠。Pages 平台在有 Worker（/api/feedback）后对静态目录
      // 无斜杠请求自动 308 补斜杠（实测 /pals/lazydragon -> /pals/lazydragon/），
      // URL 空间已收敛到带斜杠版本，sitemap 用默认带斜杠 URL 与页面 canonical
      // 自引用完全一致（旧 P1-1 的 no-slash 方案已不适用，见 memory）。
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@fontsource/inter'],
    },
  },
});
