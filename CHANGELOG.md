# PalBreed CHANGELOG

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
