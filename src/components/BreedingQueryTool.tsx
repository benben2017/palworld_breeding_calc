// BreedingQueryTool — 核心工具组件（PRD §10.6 状态合同 + §11 组件清单）
// 双模式：正查（Parents→Child）/ 反查（Target→Parents）
// 索引按 Tab 懒加载 + 缓存；性别依赖组合（catmage+foxmage）显示性别选择
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PalSelector from './PalSelector';
import { analytics } from '../lib/analytics';
import {
  parseCombo,
  normalizePair,
  GENDER_LABEL,
  type Pal,
  type ForwardIndex,
  type ReverseIndex,
  type SexDependent,
} from '../lib/types';
import sexDependentData from '../data/sex-dependent.json';
import type palsData from '../data/pals.json';

type PalData = (typeof palsData)[number];
const SEX_DEPENDENT = sexDependentData as SexDependent;

type Mode = 'forward' | 'reverse';

interface Props {
  pals: Pal[];
  compact?: boolean; // 首页内嵌版
}

// ---- 索引懒加载（PRD §10.5：按 Tab 加载 + 缓存，切 Tab 不重复下载） ----
const indexCache: { forward?: Promise<ForwardIndex>; reverse?: Promise<ReverseIndex> } = {};

function loadForwardIndex(): Promise<ForwardIndex> {
  if (!indexCache.forward) {
    indexCache.forward = fetch('/data/forward-index.json').then((r) => {
      if (!r.ok) throw new Error(`forward index ${r.status}`);
      return r.json();
    });
  }
  return indexCache.forward;
}

function loadReverseIndex(): Promise<ReverseIndex> {
  if (!indexCache.reverse) {
    indexCache.reverse = fetch('/data/reverse-index.json').then((r) => {
      if (!r.ok) throw new Error(`reverse index ${r.status}`);
      return r.json();
    });
  }
  return indexCache.reverse;
}

export default function BreedingQueryTool({ pals, compact = false }: Props) {
  const [mode, setMode] = useState<Mode>('forward');
  const [palA, setPalA] = useState<Pal | null>(null);
  const [palB, setPalB] = useState<Pal | null>(null);
  const [target, setTarget] = useState<Pal | null>(null);
  const [sexA, setSexA] = useState<'f' | 'm'>('f');
  const [sexB, setSexB] = useState<'f' | 'm'>('m');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reverseExpanded, setReverseExpanded] = useState(false);

  const byKey = useMemo(() => new Map(pals.map((p) => [p.key, p])), [pals]);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const reverseRequestRef = useRef(0);

  // 正查结果
  const [forwardState, setForwardState] = useState<
    { status: 'idle' | 'loading' | 'success' | 'no_result'; childKey?: string; needsSex?: boolean }
  >({ status: 'idle' });

  // 反查结果
  const [reverseResult, setReverseResult] = useState<{ status: 'idle' | 'loading' | 'success' | 'no_result'; combos?: string[] }>({
    status: 'idle',
  });

  // 性别依赖判断：选中的两个 Pal 是否为 sex-dependent 组合
  const basePair = useMemo(() => {
    if (!palA || !palB) return null;
    const { low, high } = normalizePair(palA.key, palB.key);
    return `${low}+${high}`;
  }, [palA, palB]);

  const isSexDependent = useMemo(
    () => (basePair ? Boolean(SEX_DEPENDENT[basePair]) : false),
    [basePair],
  );

  // ---- 正查：选两个 Pal 后自动查询（PRD §10.6 就绪状态） ----
  useEffect(() => {
    if (mode !== 'forward') return;
    if (!palA || !palB) {
      setForwardState({ status: 'idle' });
      return;
    }
    // 同种繁殖（PRD §10.6）：Parent A === Parent B -> offspring is Pal
    if (palA.key === palB.key) {
      setForwardState({ status: 'success', childKey: palA.key });
      return;
    }
    // 性别依赖组合：需要用户选性别
    if (isSexDependent) {
      setForwardState({ status: 'success', needsSex: true });
      return;
    }
    let cancelled = false;
    setForwardState({ status: 'loading' });
    loadForwardIndex()
      .then((idx) => {
        if (cancelled) return;
        const { low, high } = normalizePair(palA.key, palB.key);
        const childKey = idx[`${low}+${high}`];
        if (childKey) {
          setForwardState({ status: 'success', childKey });
          analytics.breedingQueryCompleted({ has_result: true });
        } else {
          setForwardState({ status: 'no_result' });
          analytics.breedingQueryCompleted({ has_result: false });
          analytics.errorShown('no_result', 'forward');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('Failed to load breeding data. Check your connection and try again.');
        analytics.errorShown('load_fail', 'forward');
      });
    return () => {
      cancelled = true;
    };
  }, [palA, palB, isSexDependent, mode]);

  // 性别选择变化时重新查询（仅 sex-dependent 组合）
  useEffect(() => {
    if (mode !== 'forward' || !isSexDependent || !palA || !palB || palA.key === palB.key) return;
    let cancelled = false;
    setForwardState({ status: 'loading' });
    loadForwardIndex()
      .then((idx) => {
        if (cancelled) return;
        const { low, high } = normalizePair(palA.key, palB.key);
        const sexKey = `${low}(${sexA})+${high}(${sexB})`;
        const childKey = idx[sexKey] ?? idx[`${low}(${sexB})+${high}(${sexA})`];
        if (childKey) {
          setForwardState({ status: 'success', childKey, needsSex: true });
          analytics.breedingQueryCompleted({ has_result: true });
        } else {
          setForwardState({ status: 'no_result' });
          analytics.breedingQueryCompleted({ has_result: false });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('Failed to load breeding data. Check your connection and try again.');
        analytics.errorShown('load_fail', 'forward');
      });
    return () => {
      cancelled = true;
    };
  }, [sexA, sexB, isSexDependent, palA, palB, mode]);

  // ---- 反查：选中目标后自动查询（PRD §10.6） ----
  const runReverse = useCallback(
    (child: Pal | null) => {
      const requestId = ++reverseRequestRef.current;
      if (!child) {
        setReverseResult({ status: 'idle' });
        return;
      }
      setReverseResult({ status: 'loading' });
      loadReverseIndex()
        .then((idx) => {
          if (requestId !== reverseRequestRef.current) return;
          const combos = idx[child.key];
          if (combos && combos.length > 0) {
            setReverseResult({ status: 'success', combos });
            analytics.reverseLookupCompleted({ result_count: combos.length > 20 ? '20+' : '1-20' });
          } else {
            setReverseResult({ status: 'no_result' });
            analytics.reverseLookupCompleted({ result_count: '1-20' });
            analytics.errorShown('no_result', 'reverse');
          }
        })
        .catch(() => {
          if (requestId !== reverseRequestRef.current) return;
          setLoadError('Failed to load breeding data. Check your connection and try again.');
          analytics.errorShown('load_fail', 'reverse');
        });
    },
    [],
  );

  useEffect(() => {
    runReverse(target);
  }, [target, runReverse]);

  // Tab 切换（PRD §10.6：各 Tab 输入状态独立保持；GA4 tab_switched）
  function switchMode(m: Mode) {
    if (m === mode) return;
    analytics.tabSwitched(mode, m);
    setMode(m);
    setReverseExpanded(false);
  }

  // ---- 渲染辅助 ----
  // 竞品参考（palworldbreeding.org）：A + B = C 公式布局，child 高亮
  function renderPalCard(key: string, highlight = false) {
    const p = byKey.get(key);
    if (!p) return <span className="text-sm font-bold text-onSurface/80">{key}</span>;
    return (
      <a
        href={`/pals/${key}`}
        className={[
          'inline-flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 border transition-all min-w-[104px]',
          highlight
            ? 'border-primary/60 bg-primary/10 shadow-[0_0_24px_rgba(0,212,255,0.25)]'
            : 'border-border bg-surface-elevated/60 hover:border-primary/40 hover:bg-surface-elevated',
        ].join(' ')}
      >
        <img
          src={p.imageUrl}
          alt={`${p.name} avatar`}
          loading="lazy"
          className="w-12 h-12 rounded-full object-cover bg-surface-elevated"
        />
        <span className={['text-sm font-bold leading-tight text-center', highlight ? 'text-primary' : 'text-onSurface'].join(' ')}>
          {p.name}
        </span>
        {highlight && (
          <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">Offspring</span>
        )}
      </a>
    );
  }

  function renderComboRow(combo: string, i: number) {
    const parts = parseCombo(combo);
    const a = byKey.get(parts.aKey);
    const b = byKey.get(parts.bKey);
    const genderNote =
      parts.aGender || parts.bGender
        ? ` (${parts.aGender === 'f' ? '♀' : '♂'}${parts.bGender ? ' + ' + (parts.bGender === 'f' ? '♀' : '♂') : ''})`
        : '';
    return (
      <div
        key={i}
        className="w-full max-w-full min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 rounded-lg bg-background/40 border border-border/60 hover:border-primary/40 transition-colors [overflow-wrap:anywhere]"
      >
        <span className="inline-flex min-w-0 max-w-full items-center gap-2">
          {a && (
            <img
              src={a.imageUrl}
              alt={`${a.name} avatar`}
              loading="lazy"
              className="w-7 h-7 rounded-full object-cover bg-surface-elevated shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <a href={`/pals/${parts.aKey}`} className="min-w-0 max-w-full break-words font-semibold text-onSurface hover:text-primary transition-colors">
            {a?.name ?? parts.aKey}
          </a>
        </span>
        <span className="text-primary shrink-0" aria-hidden="true">+</span>
        <span className="inline-flex min-w-0 max-w-full items-center gap-2">
          {b && (
            <img
              src={b.imageUrl}
              alt={`${b.name} avatar`}
              loading="lazy"
              className="w-7 h-7 rounded-full object-cover bg-surface-elevated shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <a href={`/pals/${parts.bKey}`} className="min-w-0 max-w-full break-words font-semibold text-onSurface hover:text-primary transition-colors">
            {b?.name ?? parts.bKey}
          </a>
        </span>
        {genderNote && <span className="min-w-0 max-w-full break-words text-xs text-onSurface/50">{genderNote}</span>}
      </div>
    );
  }

  return (
    <div className={compact ? 'min-w-0' : 'w-full max-w-full min-w-0 space-y-8'}>
      {/* Tab 切换 */}
      <div className={compact ? 'flex gap-6 mb-8 border-b border-border/50' : 'flex border-b border-border'}>
        <button
          onClick={() => switchMode('forward')}
          aria-pressed={mode === 'forward'}
          className={[
            compact ? 'pb-4 text-sm font-bold uppercase tracking-wider' : 'flex-1 py-5 text-center font-black',
            mode === 'forward'
              ? 'text-primary border-b-2 border-primary' + (compact ? '' : ' bg-primary/5')
              : 'text-onSurface/60 hover:text-onSurface transition-colors',
          ].join(' ')}
        >
          {compact ? 'I have two Pals' : 'Parents → Child'}
        </button>
        <button
          onClick={() => switchMode('reverse')}
          aria-pressed={mode === 'reverse'}
          className={[
            compact ? 'pb-4 text-sm font-bold uppercase tracking-wider' : 'flex-1 py-5 text-center font-black',
            mode === 'reverse'
              ? 'text-primary border-b-2 border-primary' + (compact ? '' : ' bg-primary/5')
              : 'text-onSurface/60 hover:text-onSurface transition-colors',
          ].join(' ')}
        >
          {compact ? 'I want a specific Pal' : 'Target → Parents'}
        </button>
      </div>

      {/* 加载错误（通用，PRD §10.6） */}
      {loadError && (
        <div className="rounded-xl border border-error/40 bg-error/10 p-4 mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-onSurface">{loadError}</p>
          <button
            onClick={() => {
              setLoadError(null);
              indexCache.forward = undefined;
              indexCache.reverse = undefined;
              if (mode === 'forward') {
                if (palA && palB) setForwardState({ status: 'loading' });
              } else {
                runReverse(target);
              }
            }}
            className="shrink-0 px-4 py-2 rounded-lg border border-border hover:bg-surface-elevated text-sm font-bold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ============ 正查模式 ============ */}
      {mode === 'forward' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <PalSelector
              id="pal-a"
              pals={pals}
              label="Parent A"
              placeholder="Search Pal A..."
              value={palA}
              onChange={setPalA}
            />
            <PalSelector
              id="pal-b"
              pals={pals}
              label="Parent B"
              placeholder="Search Pal B..."
              value={palB}
              onChange={setPalB}
            />
          </div>

          {/* 分隔线 */}
          <div className="flex justify-center relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50 border-dashed"></div>
            </div>
            <div className="relative z-10 bg-surface px-4 py-1 text-primary text-2xl">🥚</div>
          </div>

          {/* 结果区 */}
          <div className="w-full max-w-full min-w-0 bg-background/50 border border-border rounded-xl min-h-32 flex flex-col items-center justify-center gap-3 p-6 text-center">
            {forwardState.status === 'idle' && (
              <p className="text-sm text-onSurface/40 font-medium">
                {palA && !palB
                  ? 'Select Parent B to see the result'
                  : !palA && palB
                    ? 'Select Parent A to see the result'
                    : 'Select two Pals to find their offspring'}
              </p>
            )}
            {forwardState.status === 'loading' && (
              <div className="w-full max-w-xs space-y-3">
                <div className="h-4 w-1/2 mx-auto rounded-full skeleton"></div>
                <div className="h-3 w-2/3 mx-auto rounded-full skeleton opacity-50"></div>
              </div>
            )}
            {forwardState.status === 'success' && (forwardState.childKey || forwardState.needsSex) && (
              <div className="flex flex-col items-center gap-4 w-full">
                {/* 公式布局（设计稿 Success State + 竞品参考）：A + B = C */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-5 flex-wrap">
                  {palA && renderPalCard(palA.key)}
                  <span className="text-2xl font-black text-onSurface/40 select-none" aria-hidden="true">
                    +
                  </span>
                  {palB && renderPalCard(palB.key)}
                  <span className="text-2xl font-black text-primary select-none" aria-hidden="true">
                    =
                  </span>
                  {forwardState.childKey ? (
                    renderPalCard(forwardState.childKey, true)
                  ) : (
                    <div className="inline-flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 border border-dashed border-primary/40 min-w-[104px]">
                      <span className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl text-primary">
                        🥚
                      </span>
                      <span className="text-sm font-bold text-primary/70">Select genders</span>
                    </div>
                  )}
                </div>
                {forwardState.needsSex ? (
                  <div className="w-full max-w-md space-y-4 mt-2">
                    <p className="text-sm text-onSurface/70">
                      This pair produces different offspring depending on gender:
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="block text-xs font-bold text-onSurface/70 uppercase tracking-widest">
                          {palA?.name} gender
                        </span>
                        <div className="flex gap-2">
                          {(['f', 'm'] as const).map((g) => (
                            <button
                              key={g}
                              onClick={() => setSexA(g)}
                              aria-pressed={sexA === g}
                              className={[
                                'flex-1 px-3 py-2 rounded-lg border text-sm font-bold transition-colors touch-target',
                                sexA === g
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border text-onSurface/70 hover:border-primary/40',
                              ].join(' ')}
                            >
                              {g === 'f' ? '♀ Female' : '♂ Male'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="block text-xs font-bold text-onSurface/70 uppercase tracking-widest">
                          {palB?.name} gender
                        </span>
                        <div className="flex gap-2">
                          {(['f', 'm'] as const).map((g) => (
                            <button
                              key={g}
                              onClick={() => setSexB(g)}
                              aria-pressed={sexB === g}
                              className={[
                                'flex-1 px-3 py-2 rounded-lg border text-sm font-bold transition-colors touch-target',
                                sexB === g
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border text-onSurface/70 hover:border-primary/40',
                              ].join(' ')}
                            >
                              {g === 'f' ? '♀ Female' : '♂ Male'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-onSurface/50">
                      {palA?.name} {GENDER_LABEL[sexA]} + {palB?.name} {GENDER_LABEL[sexB]}
                    </p>
                  </div>
                ) : palA?.key === palB?.key ? (
                  <p className="text-sm text-onSurface/60">
                    Same species — offspring is{' '}
                    <strong className="text-primary">{palA?.name}</strong>
                  </p>
                ) : null}
              </div>
            )}
            {forwardState.status === 'no_result' && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-4xl">🤔</span>
                <p className="text-sm text-onSurface/70">
                  No combination found for{' '}
                  <strong>
                    {palA?.name} + {palB?.name}
                  </strong>
                  . Try different parents.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ 反查模式 ============ */}
      {mode === 'reverse' && (
        <div className="w-full max-w-full min-w-0 space-y-6">
          <PalSelector
            id="pal-target"
            pals={pals}
            label="Target Pal"
            placeholder="Search the Pal you want..."
            value={target}
            onChange={setTarget}
          />

          <div className="flex justify-center relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50 border-dashed"></div>
            </div>
            <div className="relative z-10 bg-surface px-4 py-1 text-primary text-2xl">🛣️</div>
          </div>

          <div
            className="w-full max-w-full min-w-0 bg-background/50 border border-border rounded-xl min-h-32 p-4 overflow-hidden"
            aria-busy={reverseResult.status === 'loading'}
            aria-live="polite"
          >
            {reverseResult.status === 'idle' && (
              <div className="h-32 flex flex-col items-center justify-center gap-2">
                <span className="text-4xl opacity-20">🐾</span>
                <p className="text-sm text-onSurface/40 font-medium">Select a Pal to see all parent combinations</p>
              </div>
            )}
            {reverseResult.status === 'loading' && (
              <div className="h-32 flex flex-col items-center justify-center gap-2" role="status" aria-live="polite">
                <div className="w-full max-w-xs space-y-3" aria-hidden="true">
                  <div className="h-4 w-2/3 mx-auto rounded-full skeleton"></div>
                  <div className="h-3 w-1/2 mx-auto rounded-full skeleton opacity-50"></div>
                </div>
                <span className="sr-only">Loading parent combinations…</span>
              </div>
            )}
            {reverseResult.status === 'success' && reverseResult.combos && (
              <div>
                <p className="min-w-0 max-w-full text-sm text-onSurface/70 mb-4 flex items-center gap-2 [overflow-wrap:anywhere]">
                  {target && (
                    <img
                      src={target.imageUrl}
                      alt={`${target.name} avatar`}
                      className="w-7 h-7 rounded-full object-cover bg-surface-elevated shrink-0"
                    />
                  )}
                  <span className="min-w-0 max-w-full break-words">
                    <strong className="text-primary">{target?.name}</strong> can be bred from{' '}
                    <strong>{reverseResult.combos.length}</strong>{' '}
                    {reverseResult.combos.length === 1 ? 'parent pair' : 'parent pairs'}:
                  </span>
                </p>
                <div className="w-full max-w-full min-w-0 space-y-2">
                  {reverseResult.combos.slice(0, reverseExpanded ? undefined : 20).map((c, i) => renderComboRow(c, i))}
                </div>
                {reverseResult.combos.length > 20 && !reverseExpanded && (
                  <button
                    onClick={() => {
                      setReverseExpanded(true);
                      analytics.reverseLookupCompleted({ result_count: '20+' });
                    }}
                    className="mt-4 w-full py-3 rounded-xl border border-primary/40 text-primary font-bold hover:bg-primary/10 transition-colors touch-target"
                  >
                    Show all {reverseResult.combos.length} combinations
                  </button>
                )}
              </div>
            )}
            {reverseResult.status === 'no_result' && (
              <div className="h-32 flex flex-col items-center justify-center gap-2 text-center">
                <span className="text-4xl opacity-20">🐾</span>
                <p className="text-sm text-onSurface/70 max-w-md">
                  No parent combinations are available for this Pal in the current data.{' '}
                  <a
                    href="mailto:feedback@palbreed.space?subject=%5BBug%5D%20Data%20issue"
                    className="text-primary underline"
                  >
                    Report a data issue
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
