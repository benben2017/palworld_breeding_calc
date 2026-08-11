// Preview-domain noindex middleware（QA10 P1-2 修复）
//
// 背景：Cloudflare Pages 预览域（*.pages.dev）与生产域共用同一份构建产物。
// 预览域若可被搜索引擎收录，会与生产域 palbreed.space 形成重复内容。
//
// 本 middleware 对 *.pages.dev 域名的所有 Worker 响应设置：
//   X-Robots-Tag: noindex, nofollow
// 生产域 palbreed.space 不匹配，保持 index,follow。
//
// 注意：_headers 文件对静态路径（_routes.json exclude 列表）同样设置了 noindex，
// 两者配合覆盖全部请求。详见 public/_headers。
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const hostname = context.url.hostname;
  if (hostname.endsWith('.pages.dev')) {
    response.headers.set('x-robots-tag', 'noindex, nofollow');
  }
  return response;
});
