// CakeCalculator — 蛋糕材料计算器（PRD §10.7）
// 1 Cake = 5 Flour + 8 Red Berries + 7 Milk + 8 Eggs + 2 Honey（多源交叉验证）
// MVP 只输出：食材名称 + 数量；不输出 farming tips / 获取方式
import { useState } from 'react';
import { analytics } from '../lib/analytics';

const RECIPE = [
  { name: 'Flour', perCake: 5, emoji: '🌾' },
  { name: 'Red Berries', perCake: 8, emoji: '🫐' },
  { name: 'Milk', perCake: 7, emoji: '🥛' },
  { name: 'Eggs', perCake: 8, emoji: '🥚' },
  { name: 'Honey', perCake: 2, emoji: '🍯' },
] as const;

const CAKES = 1; // 1 次繁殖 = 1 个蛋糕（FAQ Q3）

export default function CakeCalculator() {
  const [count, setCount] = useState<string>('');
  const [shown, setShown] = useState<number | null>(null);

  const n = parseInt(count, 10);

  function calculate() {
    if (!Number.isFinite(n) || n <= 0) return;
    setShown(n);
    const bucket = n <= 5 ? '1-5' : n <= 10 ? '6-10' : '10+';
    analytics.cakeCalculated({ quantity_bucket: bucket });
  }

  return (
    <div class="space-y-6">
      <div class="space-y-3">
        <label for="cake-count" class="block text-xs font-black tracking-widest text-onSurface/70 uppercase">
          How many times will you breed?
        </label>
        <div class="relative">
          <input
            id="cake-count"
            type="number"
            min="1"
            max="999"
            inputmode="numeric"
            class="w-full bg-background border border-border rounded-xl py-4 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-onSurface transition-all touch-target"
            placeholder="e.g. 12"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') calculate();
            }}
          />
        </div>
        <p class="text-xs text-onSurface/50">
          1 breeding attempt = 1 cake. Enter the number of attempts to get exact ingredient amounts.
        </p>
      </div>

      <button
        onClick={calculate}
        disabled={!Number.isFinite(n) || n <= 0}
        class="w-full bg-primary text-background font-black py-4 rounded-xl text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(0,212,255,0.3)] flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed touch-target"
      >
        🧁 Calculate Cakes
      </button>

      {shown !== null && Number.isFinite(shown) && shown > 0 && (
        <div class="bg-background/50 border border-border rounded-xl overflow-hidden">
          <div class="px-6 py-4 border-b border-border/50 flex items-center justify-between">
            <p class="font-bold text-onSurface">Ingredients for {shown} {shown === 1 ? 'cake' : 'cakes'}</p>
            <span class="text-xs font-bold text-primary uppercase tracking-widest">{shown * CAKES} cake{shown > 1 ? 's' : ''} total</span>
          </div>
          <div class="divide-y divide-border/40">
            {RECIPE.map((ing) => (
              <div key={ing.name} class="flex items-center justify-between px-6 py-3.5">
                <span class="flex items-center gap-3 text-onSurface">
                  <span class="text-lg" aria-hidden="true">{ing.emoji}</span>
                  {ing.name}
                </span>
                <span class="font-black text-primary text-lg">× {ing.perCake * shown}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
