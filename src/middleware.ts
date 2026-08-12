// Edge middleware（QA10 P1-2 + QA11 P1-1 修复）
//
// 1. Preview-domain noindex（QA10 P1-2）：
//    Cloudflare Pages 预览域（*.pages.dev）与生产域共用同一份构建产物。
//    预览域若可被搜索引擎收录，会与生产域 palbreed.space 形成重复内容。
//    本 middleware 对 *.pages.dev 域名的所有 Worker 响应设置 X-Robots-Tag: noindex, nofollow。
//    生产域 palbreed.space 不匹配，保持 index,follow。
//    注意：_headers 文件对静态路径（_routes.json exclude 列表）同样设置了 noindex，
//    两者配合覆盖全部请求。详见 public/_headers。
//
// 2. Pal 详情页尾斜杠归一化（QA11 P1-1）：
//    sitemap 提交带斜杠版本、canonical 指向无斜杠版本，信号矛盾。
//    统一为无斜杠（与 canonical 一致）：/pals/{key}/ -> 308 -> /pals/{key}
//    /pals/（列表页，规范形态带斜杠）不受影响。
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = context.url;

  // QA11 P1-1: detail page trailing slash -> 308 to canonical (no slash)
  const detailMatch = url.pathname.match(/^\/pals\/([a-z0-9_]+)\/$/);
  if (detailMatch) {
    return new Response(null, {
      status: 308,
      headers: { Location: `/pals/${detailMatch[1]}` },
    });
  }

  const response = await next();
  const hostname = url.hostname;
  if (hostname.endsWith('.pages.dev')) {
    response.headers.set('x-robots-tag', 'noindex, nofollow');
  }
  return response;
});
