## v1.0.26 (2026-08-14) — /pals/ 全量渲染 299 个 Pal，消除孤儿页面（Ahrefs Orphan page 37 条修复）

### 背景（用户 Ahrefs Site Audit 报 "Orphan page (has no incoming internal links)" 37 条）
- /pals/ 列表页原为客户端 JS 分页（48/页，onClick setState），静态 HTML 只有第一页 48 个 Pal 链接 + footer 5 个 = 51 个
- 爬虫不执行 JS，永远到不了第 2-7 页 → 其余 ~250 个详情页无任何内部链接入口 → 孤儿页面
- Ahrefs 报的 37 条 = 不在第一页的 TOP50 成员（Paladius/Necromus/Astegon/Jetragon 等传说+热门 Pal 全中招，key≠显示名的占 TOP50 的 49/50）

### 变更
- **`src/components/PalsList.tsx`**：删除客户端分页（PAGE_SIZE/page/Prev/Next 全部移除），无筛选时也按字母分组**全量渲染 299 个 Pal**（每页 27 个 H2：Find a Pal by name + All Pals + 25 个字母组标题）
- 搜索/字母筛选/空态交互全部保留；URL 结构不变（仍 /pals/）

### 验证
- 构建通过；/pals/ 静态 HTML 含 **299/299** 全部 Pal 链接（与数据源 key 集合比对 0 缺失）；H1=1、H2=27、空 alt=0
- 本地 Playwright 回归 10 项全过：默认全量 299 卡片 / 搜索 Anubis → 1 卡片 / 清空恢复 / D 字母筛选 + 再点恢复 / 空态 + Clear all / 点击 saintcentaur 卡 → Paladius 详情页 / 零 pageerror
- 移除后 /pals/ HTML 约 371KB（图片 lazy loading，可接受，竞品同量级）
# PalBreed CHANGELOG

## v1.0.25 (2026-08-14) — GEO 优化：Organization/WebSite 站点级 schema + SoftwareApplication + 全页 FAQPage + 首页事实块（AITDK GEO 82 → 90+）

### 变更（用户 AITDK GEO 评分 82 分；GEO 不影响 SEO 排名，仅影响 AI 答案引擎引用率）
- **`src/layouts/BaseLayout.astro`**：
  - 全站注入站点级 Organization schema（name=PalBreed、url、logo、description）—— GEO "author/publisher" 关键信号
  - 全站注入 WebSite schema（含 inLanguage=en + publisher）—— AI 引擎站点身份信号
  - jsonLd 入参支持 string 或 string[]（多 schema 块），向后兼容现有单 schema 调用
- **`src/pages/index.astro`**：在 FAQ 区块前新增 4 列"Quick facts"事实块（What is PalBreed / Breeding mechanics / Cake recipe / Data source）—— AI 引擎最爱引用页面正文里的结构化自然语言事实
- **`src/pages/tools/breeding-calculator.astro` & `src/pages/tools/cake-calculator.astro`**：
  - WebApplication → **SoftwareApplication**（计算器更准的 schema type）；新增 applicationSuite/creator/publisher 字段指向 PalBreed Organization
  - 新增页面级 FAQPage schema（4 题 breeding / 3 题 cake），与 FAQ schema 互不重复
- **`src/pages/pals/[pal].astro`**：详情页新增 FAQPage schema（3 题：怎么育/基础属性/组合数），与原 WebPage schema 合并为数组输出

### SEO 不退化验证
- 9 个主页面 + 299 详情页 title/description/H1/H2 全部合规；全站 307 页 100% 注入 Organization；schema 块数 3-4/页（之前 1-2）

## v1.0.24 (2026-08-14) — Pal 详情页 alt 修复 + description 动态化至 140-160（AITDK 详情页检查修复）

### 变更（用户 AITDK 检测 /pals/brownrabbit/：100 张图缺 alt + description < 140 字符）
- **`src/pages/pals/[pal].astro` 组合列表头像 alt 修复（根因补漏）**：v1.0.20 的 alt 校验只查"有 alt 属性"，`alt=""` 通过了校验。详情页组合列表父母头像 `alt=""` → `` alt={`${a.name} avatar`} `` / `` alt={`${b.name} avatar`} ``（brownrabbit 页 102 张图全含描述性 alt，正是 AITDK 报的 100 张）
- **`src/pages/pals/[pal].astro` description 动态化**：原模板固定句 `How to breed X in Palworld. Breeding value Y, base stats, and every parent combination that produces X.`（名字 3-56 字符波动 → description 110-138 不等）。改为：基础模板 + 按名字长度从长到短尝试 5 个补充句（"Use the PalBreed calculator to plan your next breeding session." 等），使总长落在 140-160；名字长到基础模板已 ≥140 则不补；名字超长（>28 字符）自然超过 160，极少数接受
- **校验逻辑教训**：检查 alt 必须排除 `alt=""`（空 alt 被 AITDK 视为缺失），不能只看属性存在

### 验证
- 构建通过；299 个详情页 description 全部 140-160（0 不达标）；299 页缺 alt 页面 0（brownrabbit 102 img 全含 alt）
- 示例：brownrabbit 151 / Anubis 160 / Jetragon 151 字符

## v1.0.23 (2026-08-13) — terms/privacy 页面 title 扩写至 40-60 字符（AITDK Meta Title Check 修复）

### 变更（用户 AITDK 检测：/terms/ title 27 字符、/privacy/ 25 字符，低于 40 阈值）
- **`src/pages/terms.astro`**：`Terms of Service | PalBreed`（27）→ `Terms of Service for Palworld Breeding Tools | PalBreed`（55）——补入"for Palworld Breeding Tools"定位描述
- **`src/pages/privacy.astro`**：`Privacy Policy | PalBreed`（25）→ `Privacy Policy for Palworld Breeding Calculator | PalBreed`（58）——补入"for Palworld Breeding Calculator"定位描述
- 原则（延续 v1.0.19）：主关键词最前、自然扩写、≤60 字符；全站 8 个有 SEO 价值页面 title 现全部 40-60（42-58）

### 验证
- 构建通过（带 3 个 PUBLIC_* env）；dist 两页 title 55/58 字符

## v1.0.22 (2026-08-13) — 全站 meta description 统一 140-160 字符 + 工具页 WebApplication schema（AITDK + GEO）

### 变更（AITDK 检测：/faq/ description 131 字符不达标，全站扫描发现 4 页同样不达标；工具页缺 schema）
- **`src/pages/faq.astro`**（131→156）：补 "ingredients and" 与 "breeding calculator" 完整表述
- **`src/pages/pals/index.astro`**（124→145）：扩写为 "free Palworld breeding database" + "base stats" + "produces each Pal"（协作方小糖仔提交）
- **`src/pages/terms.astro`**（134→156）：补 "of the breeding tools"
- **`src/pages/tools/breeding-calculator.astro`**（133→150）：补 "all of its ... instantly"；并新增 WebApplication JSON-LD schema（协作方）
- **`src/pages/tools/cake-calculator.astro`**：新增 WebApplication JSON-LD schema（协作方）
- **`src/pages/404.astro`**（105→146）：补 "Return to PalBreed ... plan your next combo today"（统一达标，虽无收录价值）
- 原则：主关键词保持在前部，自然扩写不堆砌；全站 9 个页面 description 现全部 140-160

### 验证
- 构建通过（带 3 个 PUBLIC_* env）；dist 各页 description 145-158 字符；两工具页均含 WebApplication schema；/pals/ 1 H1 + 2 H2

# PalBreed CHANGELOG (fix(seo): expand meta descriptions to 140-160 chars across all pages (v1.0.22))

## v1.0.21 (2026-08-13) — about/faq/pals 页面 H2 结构补齐（AITDK H2 Check 全站修复）

### 变更（用户 AITDK 全站扫描：/about/ 与 /faq/ 仅 1 个 H2，/pals/ 0 个 H2）
- **`src/pages/about.astro`**：正文分两节加 H2 —— "What PalBreed offers"（功能介绍 + 三点能力列表）、"Data source and licensing"（数据来源/版权 + 非官方声明），保留 "Have feedback?" → 共 3 个 H2
- **`src/pages/faq.astro`**：FAQ 折叠列表上方加 H2 "Popular breeding questions"（区块包 section），保留 "Still have questions?" → 共 2 个 H2
- **`src/components/PalsList.tsx`**（/pals/ 页）：搜索区上方加 H2 "Find a Pal by name"；分页视图（默认无筛选）网格前加 H2 "All Pals" → 默认视图 2 个 H2；筛选时字母分组 H2 保留
- 层级校验：/about/ 1 H1+3 H2、/faq/ 1 H1+2 H2、/pals/ 1 H1+2 H2（卡片 H3 挂于 "All Pals" 之下）

### 验证
- 构建通过（带 3 个 PUBLIC_* env）；dist 三页静态 H 结构正确

## v1.0.20 (2026-08-13) — AITDK 全站 alt 修复 + cake-calculator H2 结构完善

### 变更（用户 AITDK 检测：首页 12 张图缺 alt + cake-calculator 仅 1 个 H2）
- **全站 img alt 修复（AITDK "Image Alt Text Check" 修复）**：React 渲染的 Pal 头像此前大量 `alt=""`（被 AITDK 视为缺失）。
  - `src/components/PalSelector.tsx`：选中头像、下拉选项头像 2 处 `alt=""` → `` alt={`${name} avatar`} ``
  - `src/components/BreedingQueryTool.tsx`：正查结果行头像（p）、反查结果父母头像（a/b）、反查结果标题目标头像（target）4 处 `alt=""` → `` alt={`${name} avatar`} ``
  - 校验：src 全部 17 个 `<img>` 标签均含 alt（PalsList/[pal].astro 原有 alt 未动）；dist 全部静态 HTML 19185 个 img 零缺 alt
- **`src/pages/tools/cake-calculator.astro` 增加 3 个 H2 区块（AITDK "H2 Check" 修复）**：
  - "How to use the cake calculator"（使用说明，纯 UI 说明无 farming tips，遵守 PRD §10.7）
  - "Cake ingredients for common breeding sessions"（静态材料速查表：1/5/10/20/50 次 × 5 种材料，纯 HTML 无 JS，对 SEO 与用户均有用）
  - "Cake calculator FAQ"（2 个 H3 子问题，均基于 llms.txt 已确认事实：每胎 1 蛋糕、Cooking Pot 制作）
  - 结构：1 H1 + 4 H2 + 2 H3

### 验证
- 构建通过（带 3 个 PUBLIC_* env）；产物 H 结构正确；全站静态 HTML 零缺 alt

## v1.0.19 (2026-08-13) — 首页/工具页 title 缩短至 60 字符内（AITDK 黄色警报修复）

### 变更（用户 AITDK 检测首页 title 黄色：66 字符超 60 阈值）
- 首页 title：`Palworld Breeding Calculator — Find Any Combo Instantly | PalBreed`（66）→ `Palworld Breeding Calculator — Find Any Combo Instantly`（55）—— 保留主关键词 + 核心卖点，去品牌（SERP 自动显示域名，不占字符）
- 工具页 title：`Palworld Breeding Combination Finder — Every Parent Pair | PalBreed`（67）→ `Palworld Breeding Combination Finder — Every Parent Pair`（56）
- 详情页（最长 Pal 名 56）/FAQ（57）已达标，未动

### 验证
- 构建通过；生产 title 55/56 字符

## v1.0.18 (2026-08-13) — 提供标准文件名 sitemap.xml（AITDK 检测工具兼容）

### 变更（用户用 AITDK 检测时 /sitemap.xml 显示黄色，因为站点只有 sitemap-index.xml）
- **新增 `scripts/copy-sitemap.mjs`**（postbuild）：把 Astro sitemap 插件生成的 `dist/sitemap-0.xml`（完整 urlset，58 个 indexable URL）复制为标准文件名 `dist/sitemap.xml`；`package.json` build 改为 `astro build && node scripts/copy-sitemap.mjs`
- **`public/robots.txt`**：`Sitemap:` 声明从 sitemap-index.xml 改为 sitemap.xml（标准文件名，检测工具与爬虫按惯例抓 /sitemap.xml 直接命中）
- sitemap-index.xml 保留（GSC 已提交的旧引用不断链，内容与 sitemap.xml 相同 URL 集，无重复内容问题）

### 验证
- 构建通过（带 3 个 PUBLIC_* env）；dist/sitemap.xml 存在，58 个 <loc> 与 sitemap-0.xml 完全一致

## v1.0.17 (2026-08-13) — 新增 llms.txt（GEO/AEO 标准文件）

### 新增
- **`public/llms.txt`**（llmstxt.org 标准，约 10.9KB）：给 AI 引擎（ChatGPT/Claude/Perplexity/Gemini）的站点内容清单
  - 头部：一句话定位 + 关键事实（免费无广告、非官方、数据源 tylercamp/palcalc MIT、繁殖机制说明、unique combos 示例、蛋糕配方 1 Cake = 5 Flour + 8 Berries + 7 Milk + 8 Eggs + 2 Honey、每胎消耗 1 蛋糕）
  - 工具页 + 内容页 + 50 个热门 Pal 详情页（"How to breed X" 链接清单，与 TOP50 index 名单一致）
- 背景：用户关闭了 Cloudflare AI 爬虫拦截，配合让 AI 引擎更好理解/引用站点内容（生成脚本 `/tmp/palbreed/gen_llms.js`，从 top50-pals.ts + pals.json 生成）

### 验证
- 构建通过（带 3 个 PUBLIC_* env）；dist/llms.txt 存在

## v1.0.16 (2026-08-13) — 回退：Feedback 恢复 mailto 方案，删除 /api/feedback

### 变更（用户决定：Email Sending 需 Workers Paid 计划 + 新 token，放弃发信链路）
- **FeedbackWidget 恢复 v1.0.14 mailto 版本**（git checkout e399054）：右下角按钮 → 展开面板 3 个 mailto（Report data issue / Suggest feature / Contact us，均发 feedback@palbreed.space，由 Email Routing 转发到站主 Gmail）
- **删除 `src/pages/api/feedback.ts`**：站点回归纯静态（无 on-demand Worker），`_routes.json` 由 adapter 自动生成（include 仅 `/_server-islands/*`，exclude 覆盖全部静态页）；`dist/api` 不存在
- **注释同步**：`astro.config.mjs` / `src/middleware.ts` / `public/_headers` 更新为纯静态状态说明；middleware 保留仅做预览域 noindex 兜底
- canonical/sitemap 维持 v1.0.15 的带斜杠自引用方案（纯静态下双版本均 200，信号仍统一到带斜杠版，无需改动）

### 验证
- 构建通过（带 3 个 PUBLIC_* env）；Playwright 真实浏览器：widget 展开/收起、3 个 mailto 链接、移动端展开、无 /api/feedback 残留、零 pageerror

## v1.0.15 (2026-08-13) — 站内反馈表单（竞品式模态）+ /api/feedback 后端

### 新增
- **FeedbackWidget 改为竞品式站内模态表单**（参考 palworldbreeding.org）：右下角按钮点击打开模态面板（role="dialog" + 焦点管理 + Escape 关闭 + 关闭后焦点还原），4 种反馈类型（Idea/Bug/Praise/Other 带图标，aria-pressed 切换）、消息 textarea（maxlength 2000 + 实时计数）、可选邮箱（格式校验）、honeypot（name="company"，机器填了静默丢弃）、提交状态提示（sending/success/error，用 --color-success/--color-error token）。全程不跳出站点（不再触发 mailto/Outlook）
- **/api/feedback on-demand 端点**（`src/pages/api/feedback.ts`，`export const prerender = false`）：校验（类型白名单/消息必填+上限/邮箱格式）→ 调 Cloudflare Email Sending REST API（`POST /accounts/{id}/email/sending/send`）从 feedback@palbreed.space 发到 mengzai668899@gmail.com；secrets `CF_API_TOKEN`（需 Email Sending: Edit 权限）+ `ACCOUNT_ID`；未配置时返回 503「正在设置中」，CF API 报错返回 502
- **构建配置**：`output` 保持 `static`（Astro 5.18+ 已移除 hybrid，static 行为相同，`prerender = false` 即走 on-demand）

### 修复
- **删除 `public/_routes.json`（v1.0.2 手写）**：其 exclude 只含 `/pals/`（精确匹配），引入 Worker（/api/feedback）后 299 个详情页会被误路由进 SSR（丢失静态边缘缓存、middleware 触发）。改由 @astrojs/cloudflare adapter 自动生成 `_routes.json`（include 仅 `/_image`、`/_server-islands/*`、`/api/*`；exclude 用 `/pals/*`、`/tools/*` 通配覆盖全部静态页含 404 页）。同步更新 public/_headers 与 src/middleware.ts 注释
- **canonical + sitemap 全部改为带斜杠**（P1-1 方案更新）：实测 Pages 平台在有 Worker 后对静态目录的无斜杠请求自动 308 补斜杠（`/pals/lazydragon` → `/pals/lazydragon/`），URL 空间已收敛到带斜杠版本。全部页面 canonical 改为自引用带斜杠（299 详情页 + faq/privacy/terms/about/pals/两个工具页），sitemap 移除去斜杠 serialize —— 消除"双版本均 200"的重复内容隐患，308 链收敛到 canonical，信号完全一致

### 验证（本地）
- 构建通过（带 3 个 PUBLIC_* env）；`_routes.json` 自动生成确认详情页静态
- Playwright 真实浏览器 18 项：打开/关闭、类型切换、字数统计、空消息/非法邮箱校验、提交（503 分支）、Escape、焦点管理、cookie banner 避让、零 pageerror
- API curl 7 项：honeypot 200 静默、空消息/非法类型/非法邮箱 400、无 secrets 503、CF API 错误 502
- sitemap 58 URL 全带斜杠、详情页 canonical 带斜杠自引用、非 TOP50 仍 noindex

### 待用户完成（发信链路）
- Cloudflare Dashboard：Compute → Email Service → Email Sending onboard 域名 palbreed.space（按向导添加 cf-bounce MX/SPF/DKIM/DMARC 记录）
- 验证发件地址 feedback@palbreed.space（验证邮件经 Email Routing 到达 Gmail）
- 创建具备 **Email Sending: Edit** 权限的新 API token（现有 token 无此权限，10001）→ 我更新 secret 后即可真实发信

## v1.0.9 (2026-08-12) — QA11 P1-1 修复 + P2 跟进

### 修复（QA11 验收报告）
- **P1-1 Pal 详情页斜杠归一化**（实测调整）：
  - sitemap 详情页 URL 改为无斜杠版本（serialize），与页面 canonical（无斜杠）信号一致 —— 这是核心修复，Google 会据此合并重复内容
  - 尝试 middleware 308 归一化：详情页为预渲染静态文件，Pages 静态优先，middleware 不触发（x-debug-pathname 实测证实）
  - 尝试 public/_redirects（/pals/:key/ 301 /pals/:key）：与 Pages 自动补斜杠（无斜杠目录 308 加斜杠）形成重定向循环 → 500，已回滚；结论记录在 middleware.ts 注释
- **P2-2 theme-color meta**：`<meta name="theme-color">` 三主题联动（dark #0F0F11 / light #F5F0EB / hc #000000），applyTheme + 首帧 FOUC 脚本同步，移动端地址栏颜色跟随主题
- **P2-5 清理中文 HTML 注释**：18 处 `<!-- 中文 -->` → `{/* */}`（Astro 表达式注释，不输出到生产 HTML）

### 验证
- 构建通过（带 3 个 PUBLIC_* env）；sitemap 50 个详情页全部无斜杠；dist 无中文注释；analytics 三件套在
- 生产全路径复测：50/50 详情页 200（带/不带斜杠均 200），无 500 回归；_redirects 实验后已回滚确认

## v1.0.10 (2026-08-12) — 修复清除 Parent B 崩溃（QA11.5 P0-1）

### 修复
- **P0-1 清除 Parent B 后选择框消失（React 崩溃）**：`BreedingQueryTool.tsx` 同种繁殖判断 `palA?.key === palB.key` 在清除 B 后（palB=null、forwardState 仍为 success 的过渡帧）读取 `palB.key` 抛 `TypeError`，React 整树卸载导致工具消失。修复：改为 `palA?.key === palB?.key`
- **清理 React 警告**：`.tsx` 中 `class=` → `className=`（2 处）、`<label for=` → `<label htmlFor=`（1 处）

### 验证（本地真实浏览器 13 项场景）
- 清除 B / 清除 A / 键盘删除 / 清除后重选 / 同种繁殖 / sex 组合 / 反查模式清除+重选 —— 全部通过，零 pageerror

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
## v1.0.13 (2026-08-13) — 详情页 + 计算器页组合列表加头像

### 优化
- **详情页 "How to breed X" 组合列表加父母头像**（`[pal].astro`，构建期预渲染，0 JS 开销）
- **计算器页 "Popular unique combos" 卡片加头像**（`breeding-calculator.astro`：父母 + 子代头像）
- 样式与 v1.0.11 反查头像一致（w-7 圆形）

### 验证
- 本地浏览器：lazydragon 组合列表 100 头像全加载无破图、popular combos 12 头像全加载、零 pageerror

