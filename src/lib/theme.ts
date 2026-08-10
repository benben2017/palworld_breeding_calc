// 主题系统 — 从设计稿迁移（PRD v3 §12）
// 3 套主题：dark（默认）/ light / hc；localStorage['theme'] 持久化；默认 dark 不跟随系统

export const THEMES = ['dark', 'light', 'hc'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_META: Record<Theme, { icon: string; label: string }> = {
  dark: { icon: 'moon', label: 'Dark' },
  light: { icon: 'sun', label: 'Light' },
  hc: { icon: 'contrast', label: 'High contrast' },
};

const KEY = 'theme';

export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if ((THEMES as readonly string[]).includes(v)) return v as Theme;
  } catch {
    /* ignore */
  }
  return 'dark'; // PRD v3 §12: 默认深色，不跟随系统
}

export function applyTheme(t: Theme): void {
  document.documentElement.setAttribute('data-theme', t);
  // Logo 变体：light 用浅色版，dark/hc 用深色版（设计稿逻辑）
  const logo = document.querySelector<HTMLImageElement>('#logo-navbar');
  if (logo) {
    logo.src = t === 'light' ? '/assets/palbreed-logo-navbar-v3-light.svg' : '/assets/palbreed-logo-navbar-v3.svg';
  }
  // 同步所有主题按钮的图标/title
  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((btn) => {
    const ic = btn.querySelector('[data-theme-icon]');
    if (ic) ic.setAttribute('data-icon', THEME_META[t].icon);
    btn.title = `Theme: ${THEME_META[t].label}`;
    btn.setAttribute('aria-label', `Switch theme, current: ${THEME_META[t].label}`);
  });
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
}

export function cycleTheme(): void {
  const idx = THEMES.indexOf(getStoredTheme());
  applyTheme(THEMES[(idx + 1) % THEMES.length]);
}

export function initTheme(): void {
  applyTheme(getStoredTheme());
  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', cycleTheme);
  });
}
