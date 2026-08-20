import { trackGtagEvent } from './consent';

// 规则：不上传 Pal 名称、搜索词、自由文本或任何可标识 PII

export type ForwardResult = { has_result: boolean };
export type ReverseResult = { result_count: '1-20' | '20+' };
export type CakeResult = { quantity_bucket: '1-5' | '6-10' | '10+' };

function gtagEvent(name: string, params: Record<string, string | number | boolean>): void {
  trackGtagEvent(name, params);
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
