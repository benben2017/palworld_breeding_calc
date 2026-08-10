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
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@fontsource/inter'],
    },
  },
});
