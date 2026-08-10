// GA4 事件封装 — PRD v3 §9.4 事件合同
// 规则：不上传 Pal 名称、搜索词、自由文本或任何可标识 PII

export type ForwardResult = { has_result: boolean };
export type ReverseResult = { result_count: '1-20' | '20+' };
export type CakeResult = { quantity_bucket: '1-5' | '6-10' | '10+' };

function gtagEvent(name: string, params: Record<string, string | number | boolean>): void {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    }
  } catch {
    /* ignore — analytics must never break the tool */
  }
}

export const analytics = {
  breedingQueryCompleted(p: ForwardResult): void {
    gtagEvent('breeding_query_completed', { mode: 'forward', ...p });
  },
  reverseLookupCompleted(p: ReverseResult): void {
    gtagEvent('reverse_lookup_completed', { mode: 'reverse', ...p });
  },
  cakeCalculated(p: CakeResult): void {
    gtagEvent('cake_calculated', { ...p });
  },
  tabSwitched(from: 'forward' | 'reverse', to: 'forward' | 'reverse'): void {
    gtagEvent('tab_switched', { from, to });
  },
  errorShown(type: 'no_result' | 'load_fail', mode: 'forward' | 'reverse'): void {
    gtagEvent('error_shown', { type, mode });
  },
};
