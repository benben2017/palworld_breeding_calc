// PalBreed 共享类型 — PRD v3 §10.1 数据合同
import type pals from '../data/pals.json';

export type Pal = (typeof pals)[number];

export interface PalOption {
  key: string;
  name: string;
}

// forward-index: "low+high" 或 "low(f)+high(m)" -> childKey
export type ForwardIndex = Record<string, string>;
// reverse-index: childKey -> ["low+high" | "low(g)+high(g)", ...]
export type ReverseIndex = Record<string, string[]>;
// sex-dependent: base "low+high" -> { "low(g)+high(g)": childKey }
export type SexDependent = Record<string, Record<string, string>>;

// 组合字符串解析："anubis+lamball" | "catmage(f)+foxmage(m)"
export interface ComboParts {
  aKey: string;
  aGender?: 'f' | 'm';
  bKey: string;
  bGender?: 'f' | 'm';
}

export function parseCombo(combo: string): ComboParts {
  const m = combo.match(/^([a-z0-9_]+)(\(([fm])\))?\+([a-z0-9_]+)(\(([fm])\))?$/);
  if (!m) return { aKey: combo, bKey: combo };
  return {
    aKey: m[1],
    aGender: (m[3] as 'f' | 'm' | undefined) ?? undefined,
    bKey: m[4],
    bGender: (m[6] as 'f' | 'm' | undefined) ?? undefined,
  };
}

// 规范化：低键 + 高键（PRD §10.1 字典序）
export function normalizePair(a: string, b: string): { low: string; high: string } {
  return a <= b ? { low: a, high: b } : { low: b, high: a };
}

export const GENDER_LABEL: Record<string, string> = {
  f: '♀ Female',
  m: '♂ Male',
};

export const WORK_TYPES: Record<string, string> = {
  kindling: 'Kindling',
  watering: 'Watering',
  planting: 'Planting',
  generateelectricity: 'Electricity',
  handiwork: 'Handiwork',
  gathering: 'Gathering',
  lumbering: 'Lumbering',
  mining: 'Mining',
  medicineproduction: 'Medicine',
  cooling: 'Cooling',
  transporting: 'Transporting',
  farming: 'Farming',
};
