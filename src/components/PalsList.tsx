// PalsList — Pal 图鉴列表（设计稿 Pals List Development State Spec 生产实现）
// 状态：搜索过滤 / 加载 skeleton≥300ms / 无结果（mascot-empty + 清除按钮）/ A-Z 分组
// 注：types 字段数据缺失（PRD §10.1）→ 无类型筛选；分页 48/页 + A-Z 锚点
import { useMemo, useRef, useState } from 'react';
import type { Pal } from '../lib/types';

interface Props {
  pals: Pal[];
}

const PAGE_SIZE = 48;

export default function PalsList({ pals }: Props) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pals;
    return pals.filter((p) => p.name.toLowerCase().includes(q) || p.key.includes(q));
  }, [query, pals]);

  // A-Z 分组（搜索时不分页，直接全量显示结果；无搜索时分页 48/页）
  const groups = useMemo(() => {
    if (query.trim()) {
      const g: Record<string, Pal[]> = {};
      filtered.forEach((p) => {
        const letter = p.name.charAt(0).toUpperCase();
        (g[letter] ??= []).push(p);
      });
      return { g, pageItems: null as Pal[] | null, totalPages: 0 };
    }
    const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    return { g: null, pageItems, totalPages: Math.ceil(filtered.length / PAGE_SIZE) };
  }, [filtered, query, page]);

  const letters = useMemo(() => {
    if (groups.g) return Object.keys(groups.g).sort();
    return Array.from(new Set(filtered.map((p) => p.name.charAt(0).toUpperCase()))).sort();
  }, [groups, filtered]);

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

  function renderCard(p: Pal) {
    return (
      <a
        href={`/pals/${p.key}`}
        class="bg-surface border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(0,212,255,0.1)] transition-all flex flex-col items-center text-center"
      >
        <div class="w-20 h-20 rounded-full bg-surface-elevated mb-4 border border-border overflow-hidden flex items-center justify-center">
          <span class="text-2xl font-black text-primary/70">{p.name.charAt(0)}</span>
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
        {query.trim() && (
          <p class="text-sm text-onSurface/60 mt-3 text-center">
            <strong class="text-primary">{filtered.length}</strong> {filtered.length === 1 ? 'Pal' : 'Pals'} match
          </p>
        )}
      </div>

      {/* A-Z 锚点 */}
      <div class="flex flex-wrap justify-center gap-1.5 mb-10">
        {letters.map((l) => (
          <a
            key={l}
            href={query.trim() ? undefined : `#letter-${l}`}
            class="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-sm font-bold text-onSurface/80 hover:text-primary hover:border-primary/50 transition-colors"
          >
            {l}
          </a>
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
          <img src="/assets/mascot-empty-v2.png" alt="Empty state mascot" class="w-32 h-32 object-contain" />
          <p class="text-onSurface/70 font-medium">No Pals match your filters</p>
          <button
            onClick={() => onSearch('')}
            class="px-6 py-2.5 rounded-lg border border-border hover:bg-surface-elevated text-sm font-bold transition-colors touch-target"
          >
            Clear search
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
