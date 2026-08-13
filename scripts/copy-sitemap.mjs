// postbuild：把 Astro sitemap 插件生成的 sitemap-0.xml（完整 urlset，含全部
// indexable URL）复制为标准文件名 sitemap.xml，兼容检测工具（AITDK 等）
// 与约定俗成的 /sitemap.xml。sitemap-index.xml 保留（GSC 旧提交不断链）。
import { copyFileSync, existsSync } from 'node:fs';

const src = 'dist/sitemap-0.xml';
const dest = 'dist/sitemap.xml';
if (!existsSync(src)) {
  console.warn('[copy-sitemap] 未找到 ' + src + '，跳过（sitemap 插件可能未生成）');
  process.exit(0);
}
copyFileSync(src, dest);
console.log('[copy-sitemap] ' + src + ' -> ' + dest);
