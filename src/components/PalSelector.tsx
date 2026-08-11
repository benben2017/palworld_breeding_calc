// PalSelector — 搜索式自动补全（299 Pal，数据内联注入）
// 设计稿 PalSelector 组件生产实现（README: 首页假输入框 -> 真实自动补全组件）
import { useState, useRef, useEffect, useMemo } from 'react';
import type { Pal } from '../lib/types';

interface Props {
  pals: Pal[];
  label: string;
  placeholder: string;
  value: Pal | null;
  onChange: (pal: Pal | null) => void;
  id: string;
  disabled?: boolean;
}

export default function PalSelector({ pals, label, placeholder, value, onChange, id, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pals.slice(0, 50);
    return pals.filter((p) => p.name.toLowerCase().includes(q) || p.key.includes(q)).slice(0, 50);
  }, [query, pals]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(p: Pal) {
    onChange(p);
    setQuery(p.name);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery('');
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-2">
      <label for={id} className="block text-xs font-bold text-onSurface/70 uppercase tracking-widest">
        {label}
      </label>
      <div ref={boxRef} className="relative">
        <div className="relative group">
          {value ? (
            <img
              src={value.imageUrl}
              alt=""
              className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full object-cover bg-surface-elevated"
            />
          ) : (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-onSurface/40 group-focus-within:text-primary transition-colors text-lg">
              🔍
            </span>
          )}
          <input
            id={id}
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-listbox`}
            aria-autocomplete="list"
            disabled={disabled}
            className="w-full bg-background/50 border border-border rounded-xl py-3.5 pl-12 pr-10 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-onSurface transition-all disabled:opacity-50 touch-target"
            placeholder={placeholder}
            value={value ? value.name : query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(0);
              // 清空已选值当用户修改文本
              if (value) onChange(null);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, filtered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (open && filtered[highlight]) pick(filtered[highlight]);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
          />
          {value && (
            <button
              type="button"
              aria-label={`Clear ${label}`}
              onClick={clear}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full hover:bg-surface-elevated flex items-center justify-center text-onSurface/60 hover:text-onSurface transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {open && (
          <ul
            id={`${id}-listbox`}
            role="listbox"
            className="absolute z-30 mt-2 w-full max-h-72 overflow-auto custom-scrollbar bg-surface border border-border rounded-xl shadow-2xl"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-onSurface/50">No Pal found</li>
            ) : (
              filtered.map((p, i) => (
                <li
                  key={p.key}
                  role="option"
                  aria-selected={i === highlight}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(p)}
                  className={[
                    'px-4 py-2.5 cursor-pointer flex items-center justify-between gap-2',
                    i === highlight ? 'bg-primary/10 text-primary' : 'text-onSurface hover:bg-surface-elevated',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.imageUrl}
                      alt=""
                      loading="lazy"
                      className="w-8 h-8 rounded-full object-cover bg-surface-elevated shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="font-medium truncate">{p.name}</span>
                  </span>
                  <span className="text-xs text-onSurface/40 shrink-0">BV {p.breedingValue}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
