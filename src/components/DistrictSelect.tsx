import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { INDIAN_STATE_DISTRICTS } from '../data/indianDistricts';

interface DistrictSelectProps {
  id?: string;
  value: string;
  onChange: (district: string, stateName: string) => void;
  hasError?: boolean;
  triggerRef?: (el: HTMLButtonElement | null) => void;
  placeholder?: string;
}

export function DistrictSelect({
  id,
  value,
  onChange,
  hasError = false,
  triggerRef,
  placeholder = 'Select your district',
}: DistrictSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
    } else {
      setQuery('');
    }
  }, [open]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INDIAN_STATE_DISTRICTS;
    return INDIAN_STATE_DISTRICTS.map((group) => {
      const stateMatch = group.state.toLowerCase().includes(q);
      const matchingDistricts = stateMatch
        ? group.districts
        : group.districts.filter((d) => d.toLowerCase().includes(q));
      return {
        state: group.state,
        districts: matchingDistricts,
      };
    }).filter((g) => g.districts.length > 0);
  }, [query]);

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={hasError}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-left flex items-center justify-between gap-2 transition-colors focus:outline-none focus:ring-2 ${
          hasError
            ? 'border-red-500 ring-1 ring-red-500/20 focus:border-red-500 focus:ring-red-500/25'
            : open
              ? 'border-blue-500 ring-2 ring-blue-500/15'
              : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/15'
        }`}
      >
        <span className={value ? 'text-slate-900 font-medium truncate' : 'text-slate-400 truncate'}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180 text-blue-600' : hasError ? 'text-red-500' : 'text-slate-400'
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-40 mt-1.5 w-full bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Search Bar */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search district or state..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear district search"
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Grouped District Options */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-2">
            {filteredGroups.length === 0 ? (
              <p className="py-6 px-3 text-center text-xs text-slate-500">
                No district matched &ldquo;{query}&rdquo;. Try another spelling.
              </p>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.state} className="space-y-0.5">
                  <p className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 sticky top-0 bg-white/95">
                    {group.state}
                  </p>
                  {group.districts.map((dist) => {
                    const selected = value === dist;
                    return (
                      <button
                        key={`${group.state}-${dist}`}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          onChange(dist, group.state);
                          setOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-sm text-left flex items-center justify-between gap-2 transition-colors ${
                          selected
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{dist}</span>
                        {selected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
