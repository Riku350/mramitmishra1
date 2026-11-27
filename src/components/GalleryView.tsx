import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ClipboardEdit,
  BedDouble,
} from 'lucide-react';
import { useApp, GalleryCategory, GalleryItem, BRAND_NAME } from '../AppContext';
import { HOSTEL_ASSETS } from '../data/hostelRules';

type GalleryFilterKey =
  | 'all'
  | 'hostel'
  | 'rooms'
  | 'study_area'
  | 'parking'
  | 'rooftop'
  | 'facilities'
  | 'other';

const GALLERY_FILTER_TABS: Array<{ id: GalleryFilterKey; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'hostel', label: 'Hostel Building' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'study_area', label: 'Study Area' },
  { id: 'parking', label: 'Parking' },
  { id: 'rooftop', label: 'Rooftop' },
  { id: 'facilities', label: 'Facilities' },
  { id: 'other', label: 'Other Photos' },
];

function matchesFilter(category: GalleryCategory, filter: GalleryFilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'hostel') return category === 'hostel' || category === 'lodge';
  if (filter === 'rooms') return category === 'rooms';
  if (filter === 'study_area') return category === 'study_area';
  if (filter === 'parking') return category === 'parking';
  if (filter === 'rooftop') return category === 'rooftop';
  if (filter === 'facilities') return category === 'facilities' || category === 'bathroom';
  return category === 'other' || category === 'surroundings' || category === 'owner';
}

function getCategoryLabel(category: GalleryCategory): string {
  switch (category) {
    case 'hostel':
    case 'lodge':
      return 'Hostel Building';
    case 'rooms':
      return 'Rooms';
    case 'study_area':
      return 'Study Area';
    case 'parking':
      return 'Parking';
    case 'rooftop':
      return 'Rooftop';
    case 'facilities':
    case 'bathroom':
      return 'Facilities';
    default:
      return 'Other Photos';
  }
}

export function GalleryView() {
  const { gallery, generalSettings, setActiveTab, openRegistrationForRoom } = useApp();
  const [activeFilter, setActiveFilter] = useState<GalleryFilterKey>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const hostelBrandName = generalSettings.lodgeName || BRAND_NAME;

  const allPhotos: GalleryItem[] = useMemo(() => {
    if (gallery.length > 0) return gallery;
    return [
      {
        id: 'starter-hostel',
        title: `${hostelBrandName} Building`,
        category: 'hostel',
        imageUrl: HOSTEL_ASSETS.lodgeExterior,
        description: 'Clean and peaceful student accommodation building.',
      },
      {
        id: 'starter-room',
        title: 'Clean Student Room',
        category: 'rooms',
        imageUrl: HOSTEL_ASSETS.roomPreview,
        description: 'Well-ventilated rooms with beds, fans, and study desks.',
      },
      {
        id: 'starter-study',
        title: 'Peaceful Study Environment',
        category: 'study_area',
        imageUrl: HOSTEL_ASSETS.studyIllustration,
        description: 'Quiet space focused on academic preparation and daily study.',
      },
      {
        id: 'starter-parking',
        title: 'Dedicated Parking Area',
        category: 'parking',
        imageUrl: HOSTEL_ASSETS.parkingArea,
        description: 'Safe parking space for student bicycles and motorcycles.',
      },
      {
        id: 'starter-rooftop',
        title: 'Open Rooftop Terrace',
        category: 'rooftop',
        imageUrl: HOSTEL_ASSETS.rooftopView,
        description: 'Fresh air and calm terrace views for study breaks.',
      },
    ];
  }, [gallery, hostelBrandName]);

  const filteredPhotos = useMemo(
    () => allPhotos.filter((item) => matchesFilter(item.category, activeFilter)),
    [allPhotos, activeFilter]
  );

  // Close lightbox cleanly if filter changes
  useEffect(() => {
    setLightboxIndex(null);
  }, [activeFilter]);

  const showPrev = useCallback(() => {
    setLightboxIndex((curr) => {
      if (curr === null || filteredPhotos.length === 0) return null;
      return (curr - 1 + filteredPhotos.length) % filteredPhotos.length;
    });
  }, [filteredPhotos.length]);

  const showNext = useCallback(() => {
    setLightboxIndex((curr) => {
      if (curr === null || filteredPhotos.length === 0) return null;
      return (curr + 1) % filteredPhotos.length;
    });
  }, [filteredPhotos.length]);

  // Keyboard navigation + body scroll lock when fullscreen viewer is open
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        showNext();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxIndex, showPrev, showNext]);

  const activePhoto =
    lightboxIndex !== null && filteredPhotos[lightboxIndex] ? filteredPhotos[lightboxIndex] : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-blue-700 tracking-wide">
            🏠 {hostelBrandName}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Hostel Photo Gallery
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
            Browse real photos of our hostel building, student rooms, study spaces, parking,
            rooftop, and facilities. Tap any photo to view fullscreen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('rooms')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <BedDouble className="w-4 h-4 text-blue-600" />
            <span>Explore Rooms</span>
          </button>
          <button
            type="button"
            onClick={() => openRegistrationForRoom()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <ClipboardEdit className="w-4 h-4" />
            <span>Register for Stay</span>
          </button>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div
        role="tablist"
        aria-label="Photo gallery categories"
        className="flex flex-wrap items-center gap-2 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
      >
        {GALLERY_FILTER_TABS.map((tab) => {
          const count = allPhotos.filter((p) => matchesFilter(p.category, tab.id)).length;
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] tabular-nums ${
                  isActive ? 'text-blue-100' : 'text-slate-400'
                }`}
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Gallery Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-3 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Camera className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">No photos in this category yet</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Photos for this section will appear here as soon as they are uploaded by{' '}
            {hostelBrandName} administration.
          </p>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
          >
            View All Photos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPhotos.map((item, idx) => (
            <figure
              key={item.id}
              className="group bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-all flex flex-col"
            >
              <button
                type="button"
                onClick={() => setLightboxIndex(idx)}
                aria-label={`View ${item.title} fullscreen`}
                className="relative aspect-[4/3] bg-slate-100 overflow-hidden w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/95 text-slate-800 text-[11px] font-semibold shadow-xs">
                  {getCategoryLabel(item.category)}
                </span>
                <span className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-slate-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="w-4 h-4" />
                </span>
              </button>
              <figcaption className="p-4 space-y-1 flex-1">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {item.title}
                </h2>
                {item.description && (
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Image Viewer */}
      {activePhoto && lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activePhoto.title}
          className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-sm flex flex-col justify-between p-3 sm:p-6"
          onClick={() => setLightboxIndex(null)}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
            const delta = endX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(delta) > 45) {
              if (delta > 0) showPrev();
              else showNext();
            }
          }}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between gap-3 text-white max-w-6xl w-full mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-300">
                {getCategoryLabel(activePhoto.category)} ·{' '}
                <span className="tabular-nums">
                  {lightboxIndex + 1} / {filteredPhotos.length}
                </span>
              </p>
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                {activePhoto.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              aria-label="Close fullscreen viewer"
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center shrink-0 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Image + Desktop Prev/Next Arrows */}
          <div
            className="flex-1 flex items-center justify-center relative my-3 min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {filteredPhotos.length > 1 && (
              <button
                type="button"
                onClick={showPrev}
                aria-label="Previous photo"
                className="hidden sm:flex absolute left-2 lg:left-4 z-10 w-11 h-11 rounded-2xl bg-white/15 hover:bg-white/25 text-white items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={activePhoto.imageUrl}
              alt={activePhoto.title}
              className="max-h-[80vh] max-w-[90vw] sm:max-w-[82vw] w-auto h-auto object-contain rounded-2xl shadow-2xl select-none"
              referrerPolicy="no-referrer"
            />

            {filteredPhotos.length > 1 && (
              <button
                type="button"
                onClick={showNext}
                aria-label="Next photo"
                className="hidden sm:flex absolute right-2 lg:right-4 z-10 w-11 h-11 rounded-2xl bg-white/15 hover:bg-white/25 text-white items-center justify-center transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Caption + Mobile Navigation Controls */}
          <div
            className="max-w-3xl w-full mx-auto space-y-3 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {activePhoto.description && (
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {activePhoto.description}
              </p>
            )}

            {filteredPhotos.length > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={showPrev}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-semibold transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs sm:text-sm font-semibold transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-semibold transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
