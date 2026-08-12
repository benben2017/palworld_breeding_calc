# PalBreed CHANGELOG

## v1.0.9 (2026-08-12) — QA11 P1-1 修复 + P2 跟进

### 修复（QA11 验收报告）
- **P1-1 Pal 详情页斜杠归一化**：`/pals/{key}/` → 308 → `/pals/{key}`（middleware，与 canonical 一致）；sitemap 详情页 URL 改为无斜杠版本（serialize），信号统一
- **P2-2 theme-color meta**：`<meta name="theme-color">` 三主题联动（dark #0F0F11 / light #F5F0EB / hc #000000），applyTheme + 首帧 FOUC 脚本同步，移动端地址栏颜色跟随主题
- **P2-5 清理中文 HTML 注释**：18 处 `<!-- 中文 -->` → `{/* */}`（Astro 表达式注释，不输出到生产 HTML）

### 验证
- 构建通过（带 3 个 PUBLIC_* env）；sitemap 50 个详情页全部无斜杠；dist 无中文注释；analytics 三件套在
- 308 逻辑打包进 _worker.js middleware（本地 pages dev 对静态文件优先不触发，需生产验证）

---
## v1.0.8 (2026-08-12) — 移动端性能优化（mascot 转 WebP + LCP 优先级）

### 优化（PageSpeed Insights 移动端报告）
- **5 张 mascot PNG 全部转 WebP**（512×512 压缩后转码）：
  - mascot-peek-v2：219KB → 11KB（LCP 图片，首页 + 计算器页）
  - mascot-smile-v2：262KB → 12KB
  - mascot-celebrate-v2：423KB → 18KB
  - mascot-empty-v2：403KB → 17KB（图鉴空态）
  - mascot-hero-v2：356KB → 21KB
  - 合计 1.66MB → 79KB（省 95%），旧 PNG 从 public/assets 删除
- **LCP 优化**：首页 Curious Mascot 加 `fetchpriority="high"` + `width/height`（防布局偏移）
- 引用更新：`index.astro` / `breeding-calculator.astro` / `PalsList.tsx` 全部指向 `.webp`

### 验证
- 构建通过（带 3 个 PUBLIC_* env）；dist 中 Plausible/GA4/Clarity 脚本均在
- dist 无残留 PNG，webp 全部就位

---
## v1.0.6 (2026-08-12) — Footer 清理（移除数据徽章 + Sitemap 链接）

### 变更
- `src/components/Footer.astro`：
  - 移除数据版本徽章（Data: palcalc v26 · combos · updated）与 src 提交哈希（技术噪音；数据版本信息在首页 hero 已有同款标签，Terms §4.2 声明仍由首页承担）
  - 移除 Resources 列的 Sitemap 链接（sitemap 是给搜索引擎爬虫的，用户点击只会看到 XML 源码；GSC 与 robots.txt 已自动发现）
- 保留：4 列链接网格 + 免责/数据来源声明（合规必需）

---

## v1.0.5 (2026-08-12) — Pals 列表 A-Z 字母筛选修复

### 修复
- **A-Z 字母条点击无效**：原实现是滚动锚点（`href="#letter-X"`），但分页模式下页面无对应锚点元素、搜索模式下 href 为 undefined，导致点击无反应
- 改为**字母筛选按钮**：点字母只显示该字母开头的 Pal（按字母分组全量显示），再点一次或点 All 恢复全部；新增 "All" 按钮 + 激活态高亮 + `aria-pressed`
- 计数提示扩展：字母筛选时显示 `X Pals starting with "A"`；空态区分原因 + 清除按钮改为 "Clear all filters"（同时清搜索词和字母）

### 变更
- `src/components/PalsList.tsx`：新增 `letter` state，`filtered` 叠加字母过滤，`hasFilter` 控制分组/分页切换

---

## v1.0.4 (2026-08-12) — Footer Popular Pals 缩减为 5 个

### 变更
- `src/components/Footer.astro`：Popular Pals 12 → 5 个（Jetragon、Anubis、Shadowbeak、Grizzbolt、Frostallion），解决三列高度不齐、视觉杂乱问题；SEO 权重传递目标更聚焦

---

## v1.0.3 (2026-08-12) — Sitemap 式 Footer（SEO 内部链接）

### 新增
- **Footer 升级为 4 列链接网格**（Tools / Popular Pals / Resources / 底部声明区）
  - Tools：Breeding Calculator · Cake Calculator · Pal List · FAQ
  - Popular Pals：12 个社区热门 Pal 详情页链接（Jetragon、Anubis、Shadowbeak、Grizzbolt、Frostallion、Paladius、Astegon、Blazamut、Jormuntide Ignis、Lyleen、Orserk、Menasting），均来自 TOP50（有 index 详情页）
  - Resources：Privacy · Terms · Sitemap · Report data issue · Suggest a feature
- 效果：每个页面底部都链接到工具页 + 热门详情页，全站内部链接打通（帮助详情页爬取/索引，SEO 收益）

### 变更
- `src/components/Footer.astro`：5 个文字链接 → 4 列网格（移动端 2 列 / 桌面 3 列响应式）

### 验证
- 构建通过；首页 + 详情页 + FAQ + 工具页 + 合规页均渲染 4 列（Popular Pals 12 链接全部指向正确 slug）

---

## v1.0.2 (2026-08-11) — QA10 修复（Soft 404 + 预览域 noindex）

### 修复（对应 REQA10_REPORT P1-1 / P1-2）
- **Soft 404**：新增 `src/pages/404.astro`（noindex + 返回首页/图鉴引导）；`public/_routes.json` 将 exclude 精确化（`/pals/*` → `/pals/`、`/tools/*` → 两个具体工具页），无效 slug（如 `/pals/nyafia`）不再落入 SPA fallback，由 Worker 以 404 状态返回自定义 404 页
- **预览域可索引**：`public/_headers` 增加 `https://palbreed-4ab.pages.dev/*` → `X-Robots-Tag: noindex, nofollow`（仅预览域，生产域不受影响）；`src/middleware.ts` 对 `*.pages.dev` 的 Worker 响应设置同一 header（覆盖详情页等非静态路径）

### 验证（wrangler pages dev 本地模拟）
- `/definitely-not-here-xyz` `/pals/nyafia` `/pals/chikipi` `/tools/nonexistent` → 404 + 自定义 404 页
- `/pals/anubis`（真实详情页）→ 200 正常渲染
- 预览域 3 类路径均带 `x-robots-tag: noindex`；生产域 `palbreed.space` 无此 header
- `_headers` 规则通过 Cloudflare 校验（Parsed 1 valid header rule）

### 遗留（需部署配置）
- **P0-1 Analytics**：代码已就绪（Plausible 在 `BaseLayout.astro`、GA4/Clarity 在 `src/lib/consent.ts`），需在 Cloudflare Pages 配置 `PUBLIC_PLAUSIBLE_SCRIPT_URL` / `PUBLIC_GA_MEASUREMENT_ID` / `PUBLIC_CLARITY_PROJECT_ID` 后重新部署

---

## v1.0.1 (2026-08-10) — Pal 头像 + 数据版本徽章

### 新增
- **299 张 Pal 头像**（`public/assets/pals/{key}.png`，来源 tylercamp/palcalc `be2ec7a95c52` MIT）
  - PalSelector 下拉选项 32px 圆形头像
  - Pals 列表卡片 80px 圆形头像（lazy 加载 + 失败回退首字母）
  - Pal 详情页 160px 圆形头像
- **数据版本徽章**（`version.json` 构建期生成）
  - 首页 hero 标签：`Data: palcalc v26 · 44,851 combos · updated 2026-08-10`
  - 全站 Footer 徽章 + source commit 显示

### 变更
- `scripts/convert_breeding_data.py`：`pals.json` 增加 `imageUrl` 字段；新增 `version.json` 输出（public + src 双份）
- `src/components/PalSelector.tsx` / `PalsList.tsx`：头像渲染 + 加载失败回退
- `src/pages/pals/[pal].astro`：占位首字母 → 真实头像
- `src/components/Footer.astro` / `src/pages/index.astro`：数据版本徽章
- `src/styles/global.css`：`.fallback-letter` 回退样式

### 文档
- `palbreed-ai-prd-v3.md` §10.1：PalRecord 增加 `imageUrl` + 新增 `DataVersion` 接口
- `palbreed-ai-prd-v3.md` §10.2：头像素材来源/许可补录
- `palbreed-ai-compliance-handoff.md`：IP/素材判定 ⚠️ → ✅（头像来源已登记）
- `design-r4/dark-mode/assets/ASSET-LICENSES.md`：299 头像资产登记

### 验证
- 数据管线：299/299 图片映射、无空文件、version.json 生成
- 浏览器实测：首页徽章、Selector 头像（100×100 加载成功）、列表 48/48、详情页头像全部通过

---

## v1.0.0 (2026-08-10) — MVP 上线

### 功能
- BreedingQueryTool：正查（双亲→子代）+ 反查（目标→父母）双模式，索引懒加载 + 缓存
- 性别依赖组合处理（catmage+foxmage → Katress Ignis / Wixen Noct）
- Cake Calculator（1 Cake = 5 Flour + 8 Berries + 7 Milk + 8 Eggs + 2 Honey）
- Pal 图鉴：搜索/A-Z 锚点/分页 48/页；Top50 详情页 index，其余 noindex
- 三主题（dark/light/hc）+ Cookie Consent + GA4/Clarity 门控 + Plausible 常载
- SEO：sitemap-index.xml（Top50 过滤）+ robots.txt + FAQPage/CollectionPage/WebPage schema

### 数据
- tylercamp/palcalc v26：299 Pals / 44,851 配种对（含 1 个性别依赖组合）
- forward-index.json gzip 227.8KB / reverse-index.json gzip 194.6KB（按 Tab 懒加载）

### 修复
- Tailwind v4 插件位置错误（integrations → vite.plugins），工具类未生成导致排版全乱 → 已修复
- Icon.astro 在 frontmatter 中使用 JSX 返回（Astro 不支持）→ 改为标准 Astro 组件

## v1.0.7 (2026-08-12) — Analytics 回归修复

### 修复
- **Plausible/GA4/Clarity 全部丢失的回归**：v1.0.3~v1.0.6 的本地重新构建未携带 3 个 PUBLIC_* env（Astro 构建期内联），部署后 analytics 脚本全部消失
- 恢复方法：构建时 export PUBLIC_PLAUSIBLE_SCRIPT_URL / PUBLIC_GA_MEASUREMENT_ID / PUBLIC_CLARITY_PROJECT_ID 后重新构建部署
- **教训**：Direct Upload 模式下改任何代码重新构建部署，都必须带齐 env（本地无 .env 文件，靠构建时 export）

### 验证
- 线上首页 Plausible script + GA4 gtag config + Clarity tag 全部恢复
- 详情页（worker 路径）同样恢复
