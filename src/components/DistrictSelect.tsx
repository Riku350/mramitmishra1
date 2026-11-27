import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check, X, AlertCircle, RefreshCw } from 'lucide-react';
import { getDistrictsForState } from '../data/indianDistricts';

interface DistrictSelectProps {
  selectedState: string;
  value: string;
  onChange: (district: string) => void;
  placeholder?: string;
  hasError?: boolean;
  id?: string;
  triggerRef?: React.Ref<HTMLButtonElement>;
  onRequireState?: () => void;
}

export function DistrictSelect({
  selectedState,
  value,
  onChange,
  placeholder = 'Select District',
  hasError = false,
  id,
  triggerRef,
  onRequireState,
}: DistrictSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const hasStateSelected = Boolean(selectedState && selectedState.trim().length > 0);

  // Dynamically load districts strictly for the selected State
  const districts = useMemo(() => {
    if (!hasStateSelected) return [];
    try {
      return getDistrictsForState(selectedState);
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState, hasStateSelected, reloadTick]);

  const districtLoadFailed = hasStateSelected && districts.length === 0;

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
    if (open && hasStateSelected && !districtLoadFailed) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
      return () => window.clearTimeout(timer);
    } else if (!open) {
      setSearch('');
    }
  }, [open, hasStateSelected, districtLoadFailed]);

  // Close dropdown automatically if state changes
  useEffect(() => {
    setSearch('');
  }, [selectedState]);

  const filteredDistricts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return districts;
    return districts.filter((dist) => dist.toLowerCase().includes(q));
  }, [districts, search]);

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
        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm text-left transition-colors focus:outline-none focus:ring-2 ${
          hasError
            ? 'bg-white border-red-500 ring-1 ring-red-500/20 focus:border-red-500 focus:ring-red-500/25'
            : open
              ? 'bg-white border-blue-500 ring-2 ring-blue-500/15'
              : hasStateSelected
                ? 'bg-white border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/15'
                : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/15'
        }`}
      >
        <span className={`truncate ${value ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
          {value || (hasStateSelected ? placeholder : 'Select State first')}
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
          aria-label="Select District"
          className="absolute z-40 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden"
        >
          {!hasStateSelected ? (
            <div className="p-4 text-center space-y-2.5">
              <p className="text-xs font-medium text-slate-600">
                Please select your state first to view districts.
              </p>
              {onRequireState && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onRequireState();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
                >
                  <span>Select State</span>
                </button>
              )}
            </div>
          ) : districtLoadFailed ? (
            <div className="p-4 text-center space-y-2.5">
              <div className="flex items-center justify-center gap-1.5 text-red-600 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>District list load nahi ho paayi. Please try again.</span>
              </div>
              <button
                type="button"
                onClick={() => setReloadTick((t) => t + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : (
            <>
              {/* Search Input */}
              <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 space-y-1.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search district in ${selectedState}...`}
                    className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        searchInputRef.current?.focus();
                      }}
                      aria-label="Clear district search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] font-medium text-slate-500 px-1">
                  {selectedState} · {districts.length}{' '}
                  {districts.length === 1 ? 'district' : 'districts'}
                </p>
              </div>

              {/* Scrollable Districts List */}
              <div className="max-h-60 overflow-y-auto overscroll-contain divide-y divide-slate-100">
                {filteredDistricts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-500">
                    No matching district in {selectedState} for &ldquo;{search}&rdquo;.
                  </div>
                ) : (
                  filteredDistricts.map((dist) => {
                    const isSelected = value.toLowerCase() === dist.toLowerCase();
                    return (
                      <button
                        key={dist}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onChange(dist);
                          setOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{dist}</span>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
