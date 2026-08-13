// Edge middleware（QA10 P1-2 修复）
// Cloudflare Pages 预览域（*.pages.dev）与生产域共用同一份构建产物。
// 预览域若可被搜索引擎收录，会与生产域 palbreed.space 形成重复内容。
// 本 middleware 对 *.pages.dev 域名的所有 Worker 响应设置 X-Robots-Tag: noindex, nofollow。
// 生产域 palbreed.space 不匹配，保持 index,follow。
// 注意：_headers 文件对静态路径（_routes.json exclude 列表，adapter 自动生成，
// 覆盖全部静态页含 /pals/*）同样设置了 noindex，两者配合覆盖全部请求。
// 详见 public/_headers。
//
// ⚠️ 重要教训（2026-08-13 实测）：不要在本 middleware 里加任何静态重定向逻辑！
// v1.0.9 曾加 /pals/{key}/ -> 308 -> /pals/{key}，@astrojs/cloudflare adapter
// 会把这种模式在构建期转换成静态 meta-refresh 重定向页（redirectTemplate），
// 导致全部 299 个详情页 index.html 变成 353 字节的 "Redirecting to" 页，
// 线上详情页全部失效。静态详情页本就不走 middleware，308 纯属有害。
// P1-1 已通过 sitemap 无斜杠 + canonical 无斜杠解决信号一致性问题。
// v1.0.15 补充教训：public/_routes.json 手写 exclude 曾漏掉 299 个详情页，
// 引入 Worker（/api/feedback）后会把详情页误路由进 SSR——已删除该文件，
// 由 adapter 自动生成（include 仅 /api/* 等，exclude 含 /pals/* 等通配）。
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const hostname = context.url.hostname;
  if (hostname.endsWith('.pages.dev')) {
    response.headers.set('x-robots-tag', 'noindex, nofollow');
  }
  return response;
});
