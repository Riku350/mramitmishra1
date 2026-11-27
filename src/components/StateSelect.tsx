import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { INDIAN_STATE_DISTRICTS } from '../data/indianDistricts';

interface StateSelectProps {
  value: string;
  onChange: (stateName: string) => void;
  placeholder?: string;
  hasError?: boolean;
  id?: string;
  triggerRef?: React.Ref<HTMLButtonElement>;
}

export function StateSelect({
  value,
  onChange,
  placeholder = 'Select State',
  hasError = false,
  id,
  triggerRef,
}: StateSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
      return () => window.clearTimeout(timer);
    } else {
      setSearch('');
    }
  }, [open]);

  const filteredStates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return INDIAN_STATE_DISTRICTS;
    return INDIAN_STATE_DISTRICTS.filter(
      (item) =>
        item.state.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={hasError}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-sm text-left transition-colors focus:outline-none focus:ring-2 ${
          hasError
            ? 'border-red-500 ring-1 ring-red-500/20 focus:border-red-500 focus:ring-red-500/25'
            : open
              ? 'border-blue-500 ring-2 ring-blue-500/15'
              : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/15'
        }`}
      >
        <span className={`truncate ${value ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-150 ${
            open ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select State"
          className="absolute z-40 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Search Input */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search state (e.g. Bihar)..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear state search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* States / UTs List */}
          <div className="max-h-60 overflow-y-auto overscroll-contain divide-y divide-slate-100">
            {filteredStates.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">
                No matching state found for &ldquo;{search}&rdquo;.
              </div>
            ) : (
              filteredStates.map((item) => {
                const isSelected = value.toLowerCase() === item.state.toLowerCase();
                return (
                  <button
                    key={item.state}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(item.state);
                      setOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{item.state}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {item.type === 'Union Territory' && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          UT
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
