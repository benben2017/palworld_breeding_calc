// Consent Manager — 从设计稿迁移（PRD v3 §9.3 / 合规交接）
// - localStorage['analyticsConsent'] = 'accepted' | 'declined' 持久化
// - Accept 前绝不注入 GA4/Clarity 脚本；Decline 后不注入
// - Plausible（无 Cookie 自托管）始终加载，不参与 Consent 控制

const KEY = 'analyticsConsent';
export type ConsentChoice = 'accepted' | 'declined';

const TRACKING_COOKIES = ['_ga', '_gid', '_clck', '_clsk', 'CLID', 'MUID'];

export function readConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'accepted' || v === 'declined') return v;
  } catch {
    /* ignore */
  }
  return null;
}

function writeConsent(v: ConsentChoice): void {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* ignore */
  }
}

function deleteTrackingCookies(): void {
  const names = [...TRACKING_COOKIES];
  try {
    document.cookie.split(';').forEach((c) => {
      const n = c.split('=')[0].trim();
      if (n.startsWith('_ga') || n.startsWith('_cl') || n === 'CLID' || n === 'MUID') names.push(n);
    });
  } catch {
    /* ignore */
  }
  names.forEach((n) => {
    if (!n) return;
    document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${location.hostname}`;
    document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
}

function injectScript(src: string, id: string, attrs: Record<string, string> = {}): void {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.async = true;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  s.src = src;
  document.head.appendChild(s);
}

function queueGtagEvent(name: string, params: Record<string, string | number | boolean>): void {
  window.dataLayer = window.dataLayer || [];
  const args: unknown[] = ['event', name, params];
  window.dataLayer.push(args);
}

export function trackGtagEvent(name: string, params: Record<string, string | number | boolean>): void {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    } else if (window.analyticsConsent === 'accepted') {
      queueGtagEvent(name, params);
    }
  } catch {
    /* analytics must never break the tool */
  }
}
export function loadVendors(): void {
  // GA4（PRD §9.1: Cookie 2 年, IP 匿名化）
  const gaId = import.meta.env.PUBLIC_GA_MEASUREMENT_ID as string | undefined;
  if (gaId) {
    window.dataLayer = window.dataLayer || [];
    // Install the queue immediately so feature events are valid gtag argument tuples
    // even while the external gtag.js script is still loading.
    window.gtag = window.gtag || ((...args: unknown[]) => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(args);
    });
    // gtag.js 主体
    injectScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`, 'gtag-js');
    const inline = document.createElement('script');
    inline.id = 'gtag-init';
    inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`;
    document.head.appendChild(inline);
  }
  // Clarity is optional: keep it disabled unless explicitly enabled in the deployment environment.
  // This isolates the third-party runtime from PalBreed page errors while preserving the
  // consent-gated integration for environments that intentionally opt in.
  const clarityEnabled = (import.meta.env.PUBLIC_CLARITY_ENABLED as string | undefined) === 'true';
  const clarityId = import.meta.env.PUBLIC_CLARITY_PROJECT_ID as string | undefined;
  if (clarityEnabled && clarityId) {
    injectScript('https://www.clarity.ms/tag/' + clarityId, 'clarity-tag');
  }
  try {
    window.analyticsConsent = 'accepted';
  } catch {
    /* ignore */
  }
}

export function resetConsent(): void {
  deleteTrackingCookies();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function initConsentManager(): void {
  const choice = readConsent();
  if (choice === 'accepted') loadVendors();
  // declined -> 只跑 Plausible，什么都不注入

  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  // 仅当存在真实选择（accepted/declined）时隐藏 banner；无效值（如 "null"）必须重新弹出
  if (choice === 'accepted' || choice === 'declined') {
    banner.style.display = 'none';
  } else {
    banner.querySelectorAll<HTMLElement>('[data-consent]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.consent === 'accept') {
          writeConsent('accepted');
          loadVendors();
        } else {
          writeConsent('declined');
          deleteTrackingCookies();
        }
        banner.style.display = 'none';
      });
    });
  }

  // Privacy 页 reset helper（合规交接：清除偏好 -> 删 Cookie -> 刷新 -> Banner 重现）
  window.resetAnalyticsConsent = function () {
    resetConsent();
    const b = document.getElementById('cookie-banner');
    if (b) b.style.display = '';
  };
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    analyticsConsent?: string;
    resetAnalyticsConsent?: () => void;
    gtag?: (...args: unknown[]) => void;
  }
}
