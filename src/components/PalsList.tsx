// PalsList — Pal 图鉴列表（设计稿 Pals List Development State Spec 生产实现）
// 状态：搜索过滤 / 加载 skeleton≥300ms / 无结果（mascot-empty + 清除按钮）/ A-Z 字母筛选
// v1.0.5：A-Z 锚点 → 字母筛选（原锚点分页模式下无目标元素，点击无效）
// 注：types 字段数据缺失（PRD §10.1）→ 无类型筛选；无筛选时分页 48/页，筛选时按字母分组全量显示
import { useMemo, useRef, useState } from 'react';
import type { Pal } from '../lib/types';

interface Props {
  pals: Pal[];
}

const PAGE_SIZE = 48;

export default function PalsList({ pals }: Props) {
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFilter = query.trim() !== '' || letter !== null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = pals;
    if (q) result = result.filter((p) => p.name.toLowerCase().includes(q) || p.key.includes(q));
    if (letter) result = result.filter((p) => p.name.charAt(0).toUpperCase() === letter);
    return result;
  }, [query, letter, pals]);

  // A-Z 分组（筛选时不分页，按字母分组全量显示结果；无筛选时分页 48/页）
  const groups = useMemo(() => {
    if (hasFilter) {
      const g: Record<string, Pal[]> = {};
      filtered.forEach((p) => {
        const l = p.name.charAt(0).toUpperCase();
        (g[l] ??= []).push(p);
      });
      return { g, pageItems: null as Pal[] | null, totalPages: 0 };
    }
    const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    return { g: null, pageItems, totalPages: Math.ceil(filtered.length / PAGE_SIZE) };
  }, [filtered, hasFilter, page]);

  const letters = useMemo(() => {
    // 字母筛选激活时，仍显示全量字母表（便于直接切换到其他字母）
    if (letter) return Array.from(new Set(pals.map((p) => p.name.charAt(0).toUpperCase()))).sort();
    if (groups.g) return Object.keys(groups.g).sort();
    return Array.from(new Set(filtered.map((p) => p.name.charAt(0).toUpperCase()))).sort();
  }, [letter, groups, filtered, pals]);

  function onSearch(v: string) {
    setQuery(v);
    // 设计稿规格：loading ≥300ms 防闪烁
    setLoading(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setLoading(false);
      setPage(1);
    }, 300);
  }

  function onLetterClick(l: string) {
    setLetter(letter === l ? null : l);
    setPage(1);
  }

  function renderCard(p: Pal) {
    return (
      <a
        href={`/pals/${p.key}`}
        class="bg-surface border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(0,212,255,0.1)] transition-all flex flex-col items-center text-center"
      >
        <div class="w-20 h-20 rounded-full bg-surface-elevated mb-4 border border-border overflow-hidden flex items-center justify-center">
          <img
            src={p.imageUrl}
            alt={p.name}
            loading="lazy"
            class="w-full h-full object-cover"
            onError={(e) => {
              // 图片加载失败时回退到首字母
              const el = e.currentTarget as HTMLImageElement;
              el.style.display = 'none';
              el.parentElement?.classList.add('fallback-letter');
              el.parentElement?.setAttribute('data-fallback', p.name.charAt(0));
            }}
          />
        </div>
        <h3 class="font-bold text-onSurface mb-2">{p.name}</h3>
        <span class="text-[10px] text-onSurface/40 font-mono">BV: {p.breedingValue}</span>
      </a>
    );
  }

  return (
    <div>
      {/* 搜索 + 结果计数 */}
      <div class="max-w-xl mx-auto mb-8">
        <div class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-onSurface/40 text-lg">🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search 299 Pals..."
            aria-label="Search Pals"
            class="w-full bg-surface border border-border rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-onSurface transition-all touch-target"
          />
        </div>
        {hasFilter && (
          <p class="text-sm text-onSurface/60 mt-3 text-center">
            <strong class="text-primary">{filtered.length}</strong> {filtered.length === 1 ? 'Pal' : 'Pals'} match
            {letter ? ` starting with “${letter}”` : ''}
          </p>
        )}
      </div>

      {/* A-Z 字母筛选（点字母过滤该字母开头的 Pal；再点一次或点 All 恢复全部） */}
      <div class="flex flex-wrap justify-center gap-1.5 mb-10">
        <button
          type="button"
          onClick={() => {
            setLetter(null);
            setPage(1);
          }}
          class={[
            'px-3 h-9 rounded-lg bg-surface border text-sm font-bold transition-colors',
            letter === null
              ? 'border-primary/50 text-primary bg-primary/10'
              : 'border-border text-onSurface/80 hover:text-primary hover:border-primary/50',
          ].join(' ')}
        >
          All
        </button>
        {letters.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onLetterClick(l)}
            aria-pressed={letter === l}
            class={[
              'w-9 h-9 rounded-lg bg-surface border text-sm font-bold transition-colors',
              letter === l
                ? 'border-primary/50 text-primary bg-primary/10'
                : 'border-border text-onSurface/80 hover:text-primary hover:border-primary/50',
            ].join(' ')}
          >
            {l}
          </button>
        ))}
      </div>

      {/* 加载态 */}
      {loading && (
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} class="bg-surface border border-border rounded-xl p-4">
              <div class="w-20 h-20 rounded-full skeleton mx-auto mb-4"></div>
              <div class="h-4 w-3/4 skeleton mx-auto mb-2"></div>
              <div class="h-3 w-1/2 skeleton mx-auto"></div>
            </div>
          ))}
        </div>
      )}

      {/* 无结果空态（设计稿规格：mascot-empty + 清除按钮） */}
      {!loading && filtered.length === 0 && (
        <div class="flex flex-col items-center gap-4 py-16 text-center">
          <img src="/assets/mascot-empty-v2.webp" alt="Empty state mascot" class="w-32 h-32 object-contain" />
          <p class="text-onSurface/70 font-medium">
            {letter ? `No Pals start with “${letter}”` : 'No Pals match your filters'}
          </p>
          <button
            onClick={() => {
              setQuery('');
              setLetter(null);
            }}
            class="px-6 py-2.5 rounded-lg border border-border hover:bg-surface-elevated text-sm font-bold transition-colors touch-target"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* 分组列表（搜索时按字母分组全量显示；否则分页 48/页） */}
      {!loading && filtered.length > 0 && groups.g && (
        <div class="space-y-12">
          {Object.keys(groups.g)
            .sort()
            .map((letter) => (
              <section key={letter} id={`letter-${letter}`} class="scroll-mt-24">
                <h2 class="text-2xl font-extrabold mb-6 flex items-center gap-3">
                  <span class="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    {letter}
                  </span>
                  <span class="text-sm font-medium text-onSurface/50">{groups.g![letter].length} Pals</span>
                </h2>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {groups.g![letter].map((p) => renderCard(p))}
                </div>
              </section>
            ))}
        </div>
      )}

      {/* 分页视图（无搜索时） */}
      {!loading && filtered.length > 0 && groups.pageItems && (
        <>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {groups.pageItems.map((p) => renderCard(p))}
          </div>
          {groups.totalPages > 1 && (
            <div class="flex items-center justify-center gap-3 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                class="px-5 py-2.5 rounded-lg border border-border hover:bg-surface-elevated text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-target"
              >
                ← Prev
              </button>
              <span class="text-sm text-onSurface/60">
                Page <strong class="text-primary">{page}</strong> / {groups.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(groups.totalPages, p + 1))}
                disabled={page === groups.totalPages}
                class="px-5 py-2.5 rounded-lg border border-border hover:bg-surface-elevated text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-target"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
