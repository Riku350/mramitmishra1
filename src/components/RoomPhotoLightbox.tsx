import React, { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface RoomPhotoLightboxProps {
  open: boolean;
  photos: string[];
  activeIndex: number;
  title: string;
  subtitle?: string;
  onChangeIndex: (nextIndex: number) => void;
  onClose: () => void;
}

/**
 * Clean, responsive Image Preview / Lightbox for Room Photos.
 * - Never covers the full screen unnecessarily: strictly constrained to max-w-[90vw] & max-h-[80vh].
 * - Preserves original aspect ratio via object-contain (no crop, no stretch).
 * - Zero horizontal overflow on mobile (360px+) and desktop.
 * - Supports Close (X), Previous / Next controls, keyboard arrows/Escape, and touch swipe.
 */
export function RoomPhotoLightbox({
  open,
  photos,
  activeIndex,
  title,
  subtitle,
  onChangeIndex,
  onClose,
}: RoomPhotoLightboxProps) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const count = photos.length;
  const safeIdx = count > 0 ? ((activeIndex % count) + count) % count : 0;
  const currentSrc = photos[safeIdx] || '';

  const showPrev = useCallback(() => {
    if (count <= 1) return;
    onChangeIndex((safeIdx - 1 + count) % count);
  }, [count, onChangeIndex, safeIdx]);

  const showNext = useCallback(() => {
    if (count <= 1) return;
    onChangeIndex((safeIdx + 1) % count);
  }, [count, onChangeIndex, safeIdx]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        showNext();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, showPrev, showNext]);

  if (!open || !currentSrc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} photo preview`}
      className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden"
      onClick={onClose}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
        touchStartY.current = e.touches[0]?.clientY ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
        const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
        const deltaX = endX - touchStartX.current;
        const deltaY = endY - touchStartY.current;
        touchStartX.current = null;
        touchStartY.current = null;
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0) showPrev();
          else showNext();
        }
      }}
    >
      <div
        className="w-full max-w-[92vw] sm:max-w-[90vw] max-h-[92vh] flex flex-col items-center justify-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header Bar */}
        <div className="w-full max-w-[90vw] flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-slate-900/85 border border-white/10 text-white shadow-lg">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
            <p className="text-[11px] text-slate-300 truncate tabular-nums">
              {subtitle ? `${subtitle} · ` : ''}
              Photo {safeIdx + 1} of {count}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close photo preview"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Centered Image Frame — strictly max-w-[90vw] & max-h-[80vh], object-contain, zero crop/stretch */}
        <div className="relative flex items-center justify-center w-full max-w-[90vw] overflow-hidden">
          {count > 1 && (
            <button
              type="button"
              onClick={showPrev}
              aria-label="Previous photo"
              className="hidden sm:inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-white/15 text-white shadow-md mr-3 shrink-0 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-slate-900/50 border border-white/10 shadow-2xl max-w-[90vw] max-h-[80vh]">
            <img
              src={currentSrc}
              alt={`${title} — Photo ${safeIdx + 1}`}
              className="block w-auto h-auto max-w-[90vw] max-h-[80vh] object-contain select-none"
              referrerPolicy="no-referrer"
              draggable={false}
            />
          </div>

          {count > 1 && (
            <button
              type="button"
              onClick={showNext}
              aria-label="Next photo"
              className="hidden sm:inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-white/15 text-white shadow-md ml-3 shrink-0 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Bottom Prev / Next Controls + Dots (Touch-friendly on 360px mobile & desktop) */}
        {count > 1 && (
          <div className="flex items-center justify-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={showPrev}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-900 border border-white/15 text-white text-xs sm:text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1.5 px-2">
              {photos.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChangeIndex(idx)}
                  aria-label={`View photo ${idx + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    idx === safeIdx ? 'w-5 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={showNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-900 border border-white/15 text-white text-xs sm:text-sm font-semibold transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
