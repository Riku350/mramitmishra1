import React, { Component, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Home,
  ScrollText,
  BedDouble,
  Sparkles,
  BookOpen,
  Phone,
  User as UserIcon,
  ShieldCheck,
  LogIn,
  LogOut,
  ArrowRight,
  Share2,
  Users,
  Maximize2,
  CheckCircle2,
  Clock,
  Wrench,
  X,
  MapPin,
  MessageCircle,
  Mail,
  Car,
  Sun,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  ClipboardEdit,
  Download,
  Loader2,
  Printer,
} from 'lucide-react';
import { useApp, AppTab, Room, GeneralSettings, StayRegistration } from './AppContext';
import { HOSTEL_ASSETS } from './data/hostelRules';
import { WelcomeScreen, StudentLifeStrip } from './components/StudentScenes';
import { RulesView, CleaningScheduleModal } from './components/RulesView';
import { StudyView } from './components/StudyView';
import { StayRegistrationView } from './components/StayRegistrationView';
import { AdminPanel } from './components/AdminPanel';
import {
  PrivacyPolicyView,
  TermsConditionsView,
  NotFoundView,
  AppErrorView,
} from './components/LegalPages';
import { FaqSection, FaqPageView } from './components/FaqSection';
import { generateRegistrationPdf } from './utils/registrationPdf';

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
          <AppErrorView onRetry={() => window.location.reload()} />
        </div>
      );
    }
    return this.props.children;
  }
}

function getAppShareLink(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
}

function buildRoomShareMessage(room: Room, settings: GeneralSettings): string {
  const statusMap: Record<Room['status'], string> = {
    available: 'Available',
    occupied: 'Occupied',
    maintenance: 'Under Maintenance',
    cleaning: 'Under Cleaning',
  };

  const lines: string[] = [
    `*${settings.lodgeName || 'Amit Bhaiya Lawaj'}* — Monthly Student Accommodation`,
    `Room: *${room.name}* (#${room.roomNumber})`,
    `Type: ${room.roomType}${room.size ? ` · Size: ${room.size}` : ''}`,
    `Capacity: Up to ${room.maxGuests} student${room.maxGuests > 1 ? 's' : ''}`,
    `Status: ${statusMap[room.status] || room.status}`,
  ];

  const rentParts: string[] = [];
  if (room.price1 != null) rentParts.push(`1 Student: ₹${room.price1}/Month`);
  if (room.price2 != null) rentParts.push(`2 Students: ₹${room.price2}/Month`);
  if (room.price3 != null) rentParts.push(`3 Students: ₹${room.price3}/Month`);

  if (rentParts.length > 0) {
    lines.push(`Monthly Rent: ${rentParts.join(' | ')}`);
  }

  if (room.facilities && room.facilities.length > 0) {
    lines.push(`Facilities: ${room.facilities.join(', ')}`);
  }

  if (room.description) {
    lines.push(`Details: ${room.description}`);
  }

  const link = getAppShareLink();
  if (link) {
    lines.push('');
    lines.push(`View room & register online: ${link}`);
  }

  return lines.join('\n');
}

function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function getRoomPhotos(room: Room): string[] {
  const list: string[] = [];
  if (room.imageUrl) list.push(room.imageUrl);
  if (Array.isArray(room.photos)) {
    for (const p of room.photos) {
      if (p && !list.includes(p)) list.push(p);
    }
  }
  return list.length > 0 ? list : [HOSTEL_ASSETS.roomPreview];
}

/* =========================== HOME VIEW (CLEAN ENGLISH, NO RULES MIXED IN) =========================== */
function HomeView() {
  const { generalSettings, setActiveTab, openRegistrationForRoom } = useApp();

  const quickInfoCards = [
    {
      title: 'Monthly Rooms',
      subtitle: 'Single, Double & Triple Sharing',
      icon: BedDouble,
      tint: 'bg-blue-50 text-blue-600',
      action: () => setActiveTab('rooms'),
    },
    {
      title: 'Hostel Facilities',
      subtitle: 'Clean Rooms, Study & Parking',
      icon: Sparkles,
      tint: 'bg-emerald-50 text-emerald-600',
      action: () => setActiveTab('facilities'),
    },
    {
      title: 'Peaceful Study',
      subtitle: 'Calm Academic Environment',
      icon: BookOpen,
      tint: 'bg-sky-50 text-sky-600',
      action: () => setActiveTab('study'),
    },
    {
      title: 'Online Registration',
      subtitle: 'Apply & Print Official PDF',
      icon: ClipboardEdit,
      tint: 'bg-teal-50 text-teal-600',
      action: () => openRegistrationForRoom(),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 space-y-5">
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-emerald-700 tracking-wide">
                Monthly Student Accommodation · {generalSettings.lodgeName || 'Amit Bhaiya Lawaj'}
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                🏠 {generalSettings.introGreeting || 'Amit Bhaiya Lawaj'}
              </h1>
              <p className="text-lg sm:text-xl font-semibold text-blue-700">
                {generalSettings.introSubtitle || 'Safe Stay. Better Study. Better Future.'}
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg">
                {generalSettings.welcomeBannerText ||
                  'Comfortable monthly accommodation for students in a peaceful and student-friendly environment.'}
              </p>
            </div>

            {/* 3 Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => openRegistrationForRoom()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <ClipboardEdit className="w-4 h-4" />
                <span>Register for Stay</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rooms')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                <span>View Rooms</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                <span>View Hostel Rules</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 p-4 sm:p-6 lg:pr-8">
            <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50/40">
              <img
                src={generalSettings.heroImageUrl || HOSTEL_ASSETS.welcomeIllustration}
                alt="Amit Bhaiya Lawaj accommodation"
                className="w-full aspect-video object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4 Quick Info Cards */}
      <section aria-label="Hostel overview" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickInfoCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              type="button"
              onClick={card.action}
              className="text-left bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-blue-200 hover:shadow-sm transition-all flex flex-col gap-3.5"
            >
              <div className={`w-11 h-11 rounded-xl ${card.tint} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{card.title}</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{card.subtitle}</p>
              </div>
            </button>
          );
        })}
      </section>

      {/* About & Study Motivation Section */}
      <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6">
          <div className="md:col-span-5">
            <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50/40">
              <img
                src={HOSTEL_ASSETS.studyIllustration}
                alt="Student reading book at study desk"
                className="w-full aspect-[4/3] object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <div className="md:col-span-7 space-y-4">
            <p className="text-xs font-semibold text-blue-700 tracking-wide">
              Study • Stay • Grow
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
              Focus on your studies while we provide a safe, simple monthly stay.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {generalSettings.aboutLodge ||
                'Before applying, browse our monthly rooms and read the dedicated Hostel Rules page so every resident enjoys a calm, respectful environment.'}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                <span>Read Hostel Rules</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => setActiveTab('study')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
              >
                <span>Open Study Focus Timer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Lightweight Animated Student Life Strip */}
      <StudentLifeStrip />
    </div>
  );
}

/* =========================== ROOMS & MONTHLY RENT VIEW =========================== */
function RoomsView() {
  const { rooms, generalSettings, openRegistrationForRoom, showToast } = useApp();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openDetail = (room: Room) => {
    setSelectedRoom(room);
    setActivePhotoIdx(0);
  };

  const handleCopyShareText = async (room: Room) => {
    const message = buildRoomShareMessage(room, generalSettings);
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(room.id);
      showToast('Room details copied for sharing.', 'success');
      window.setTimeout(() => setCopiedId((curr) => (curr === room.id ? null : curr)), 2200);
    } catch {
      showToast('Unable to copy. Please use Share on WhatsApp.', 'info');
    }
  };

  const renderStatus = (status: Room['status']) => {
    if (status === 'available') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Available</span>
        </span>
      );
    }
    if (status === 'maintenance' || status === 'cleaning') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <Wrench className="w-3.5 h-3.5" />
          <span>{status === 'maintenance' ? 'Maintenance' : 'Cleaning'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Clock className="w-3.5 h-3.5" />
        <span>Occupied</span>
      </span>
    );
  };

  const sharingTiers = [
    { label: 'Single Sharing', sub: '1 Student', price: generalSettings.defaultPrice1 },
    { label: 'Double Sharing', sub: '2 Students', price: generalSettings.defaultPrice2 },
    { label: 'Triple Sharing', sub: '3 Students', price: generalSettings.defaultPrice3 },
  ];

  const generalShareMessage = [
    `*${generalSettings.lodgeName || 'Amit Bhaiya Lawaj'}* — Rooms & Monthly Rent`,
    generalSettings.defaultPrice1 != null
      ? `Single Sharing: ₹${generalSettings.defaultPrice1}/Month`
      : 'Single / Double / Triple Sharing monthly rooms available.',
    generalSettings.defaultPrice2 != null
      ? `Double Sharing: ₹${generalSettings.defaultPrice2}/Month`
      : '',
    '',
    `View details & register: ${getAppShareLink()}`,
  ]
    .filter(Boolean)
    .join('\n');

  const detailPhotos = selectedRoom ? getRoomPhotos(selectedRoom) : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Rooms &amp; Monthly Rent
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
            {generalSettings.monthlyStayInfo ||
              'Monthly student accommodation managed dynamically by hostel administration. Select any room to view photos, share via WhatsApp, or apply for stay.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openRegistrationForRoom()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 self-start sm:self-auto"
        >
          <ClipboardEdit className="w-4 h-4" />
          <span>Register for Stay</span>
        </button>
      </div>

      {/* Monthly Sharing Tiers Overview (Dynamic from Firebase) */}
      <section aria-label="Monthly sharing plans" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sharingTiers.map((tier) => (
          <div
            key={tier.label}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between gap-2 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
          >
            <div>
              <p className="text-xs font-medium text-slate-500">{tier.sub}</p>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">{tier.label}</h2>
            </div>
            <p className="text-lg font-bold text-blue-700 tabular-nums pt-1">
              {tier.price != null ? (
                <>
                  ₹{tier.price.toLocaleString('en-IN')}
                  <span className="text-xs font-normal text-slate-500"> / Month</span>
                </>
              ) : (
                <span className="text-sm font-medium text-slate-500">
                  Information will be updated soon.
                </span>
              )}
            </p>
          </div>
        ))}
      </section>

      {/* Individual Room Cards */}
      {rooms.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            <div className="lg:col-span-5">
              <img
                src={HOSTEL_ASSETS.roomPreview}
                alt="Clean student hostel room preview"
                className="w-full h-full min-h-[240px] object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="lg:col-span-7 p-6 sm:p-8 space-y-5">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-blue-700">Room Detail</p>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Monthly Student Rooms
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Individual room numbers, photos, and monthly rents will appear here as soon as
                  published by the hostel admin. You can still submit your monthly stay registration
                  now.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => openRegistrationForRoom()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                  <span>Apply for Monthly Stay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href={buildWhatsAppShareUrl(generalShareMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {rooms.map((room) => {
            const shareUrl = buildWhatsAppShareUrl(buildRoomShareMessage(room, generalSettings));
            const roomPhotos = getRoomPhotos(room);
            return (
              <article
                key={room.id}
                className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between transition-shadow hover:shadow-md"
              >
                <div>
                  <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                    <img
                      src={roomPhotos[0]}
                      alt={room.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {roomPhotos.length > 1 && (
                      <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-900/75 text-white text-[11px] font-semibold">
                        {roomPhotos.length} Photos
                      </span>
                    )}
                  </div>

                  <div className="p-5 space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Room #{room.roomNumber} · {room.roomType}
                        </p>
                        <h2 className="text-lg font-bold text-slate-900 mt-0.5">{room.name}</h2>
                      </div>
                      {renderStatus(room.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Capacity {room.maxGuests}
                        {room.availableBeds != null ? ` · ${room.availableBeds} beds free` : ''}
                      </span>
                      {room.size && (
                        <span className="inline-flex items-center gap-1">
                          <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                          {room.size}
                        </span>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-1">
                      {room.price1 != null || room.price2 != null || room.price3 != null ? (
                        <div className="space-y-1 text-sm tabular-nums">
                          {room.price1 != null && (
                            <p className="font-semibold text-slate-900">
                              1 Student —{' '}
                              <span className="text-blue-700">
                                ₹{room.price1.toLocaleString('en-IN')} / Month
                              </span>
                            </p>
                          )}
                          {room.price2 != null && (
                            <p className="font-semibold text-slate-900">
                              2 Students —{' '}
                              <span className="text-blue-700">
                                ₹{room.price2.toLocaleString('en-IN')} / Month
                              </span>
                            </p>
                          )}
                          {room.price3 != null && (
                            <p className="font-semibold text-slate-900">
                              3 Students —{' '}
                              <span className="text-blue-700">
                                ₹{room.price3.toLocaleString('en-IN')} / Month
                              </span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Information will be updated soon.</p>
                      )}
                    </div>

                    {room.facilities && room.facilities.length > 0 && (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {room.facilities.join(' · ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openDetail(room)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Room Details
                  </button>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Share ${room.name} on WhatsApp`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium hover:bg-emerald-100 transition-colors shrink-0"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ROOM DETAIL MODAL WITH MULTI-PHOTO VIEWER, WHATSAPP SHARE & REGISTER BUTTON */}
      {selectedRoom && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setSelectedRoom(null)}
        >
          <div
            className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/9] bg-slate-100 shrink-0">
              <img
                src={detailPhotos[activePhotoIdx] || detailPhotos[0]}
                alt={selectedRoom.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                aria-label="Close room detail"
                className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/95 border border-slate-200 text-slate-700 hover:bg-white flex items-center justify-center shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailPhotos.length > 1 && (
              <div className="px-6 pt-3 flex items-center gap-2 overflow-x-auto bg-white">
                {detailPhotos.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePhotoIdx(i)}
                    className={`w-16 h-12 rounded-xl overflow-hidden border-2 shrink-0 ${
                      activePhotoIdx === i ? 'border-blue-600' : 'border-slate-200 opacity-75'
                    }`}
                  >
                    <img src={src} alt={`Room photo ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="p-6 sm:p-7 overflow-y-auto space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-blue-700">
                    Room Detail · Room #{selectedRoom.roomNumber} · {selectedRoom.roomType}
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">{selectedRoom.name}</h2>
                </div>
                {renderStatus(selectedRoom.status)}
              </div>

              {selectedRoom.description && (
                <p className="text-sm text-slate-600 leading-relaxed">{selectedRoom.description}</p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 border border-slate-100 rounded-2xl p-4">
                <div>
                  <p className="text-xs text-slate-500">Capacity / Free</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">
                    {selectedRoom.maxGuests}
                    {selectedRoom.availableBeds != null ? ` (${selectedRoom.availableBeds} free)` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">1 Student</p>
                  <p className="text-sm font-bold text-blue-700 mt-0.5 tabular-nums">
                    {selectedRoom.price1 != null ? `₹${selectedRoom.price1}/mo` : 'TBD'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">2 Students</p>
                  <p className="text-sm font-bold text-blue-700 mt-0.5 tabular-nums">
                    {selectedRoom.price2 != null ? `₹${selectedRoom.price2}/mo` : 'TBD'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">3 Students</p>
                  <p className="text-sm font-bold text-blue-700 mt-0.5 tabular-nums">
                    {selectedRoom.price3 != null ? `₹${selectedRoom.price3}/mo` : 'TBD'}
                  </p>
                </div>
              </div>

              {selectedRoom.facilities && selectedRoom.facilities.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Available Facilities
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {selectedRoom.facilities.join('  ·  ')}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={buildWhatsAppShareUrl(
                    buildRoomShareMessage(selectedRoom, generalSettings)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleCopyShareText(selectedRoom)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  {copiedId === selectedRoom.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                disabled={selectedRoom.status !== 'available'}
                onClick={() => {
                  const id = selectedRoom.id;
                  setSelectedRoom(null);
                  openRegistrationForRoom(id);
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {selectedRoom.status === 'available'
                  ? 'Register for This Room'
                  : 'Currently Unavailable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================== FACILITIES VIEW =========================== */
function FacilitiesView() {
  const { facilities, parkingSettings, rooftopSettings } = useApp();
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const visibleFacilities = useMemo(() => {
    const enabled = facilities.filter((f) => f.enabled);
    if (enabled.length > 0) return enabled;
    return [
      { id: 'def-1', name: 'Bed', icon: '🛏️', description: 'Clean individual student beds', enabled: true },
      { id: 'def-2', name: 'Bathroom', icon: '🚿', description: 'Clean bathrooms with Mon–Sat schedule', enabled: true },
      { id: 'def-3', name: 'Electricity', icon: '💡', description: 'Room lighting & charging points', enabled: true },
      { id: 'def-4', name: 'Fan', icon: '🌀', description: 'Ceiling fan in every room', enabled: true },
      { id: 'def-5', name: 'Cleaning', icon: '🧹', description: 'Clean corridors & room-wise bathroom routine', enabled: true },
      { id: 'def-6', name: 'Parking', icon: '🚗', description: 'Dedicated cycle & motorcycle parking area', enabled: true },
      { id: 'def-7', name: 'Rooftop / Terrace', icon: '🌇', description: 'Open airy terrace for peaceful breaks', enabled: true },
    ];
  }, [facilities]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Hostel Facilities
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Essential student amenities configured and maintained by hostel management.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setScheduleOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 self-start sm:self-auto"
        >
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Bathroom Cleaning Schedule</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleFacilities.map((fac) => (
          <div
            key={fac.id}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-start gap-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
          >
            {'imageUrl' in fac && fac.imageUrl ? (
              <img
                src={fac.imageUrl}
                alt={fac.name}
                className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0">
                {fac.icon || '✨'}
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900">{fac.name}</h2>
              {fac.description && (
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{fac.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <img
            src={parkingSettings.imageUrl || HOSTEL_ASSETS.parkingArea}
            alt="Hostel parking area"
            className="w-full aspect-video object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="p-6 space-y-2.5">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700">
              <Car className="w-4 h-4" />
              <span>Parking</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{parkingSettings.headline}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{parkingSettings.capacity}</p>
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
              {parkingSettings.rules}
            </p>
          </div>
        </section>

        <section className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <img
            src={rooftopSettings.imageUrl || HOSTEL_ASSETS.rooftopView}
            alt="Hostel rooftop terrace"
            className="w-full aspect-video object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="p-6 space-y-2.5">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <Sun className="w-4 h-4" />
              <span>Rooftop / Terrace</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{rooftopSettings.headline}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{rooftopSettings.description}</p>
            {rooftopSettings.features && rooftopSettings.features.length > 0 && (
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                {rooftopSettings.features.join('  ·  ')}
              </p>
            )}
          </div>
        </section>
      </div>

      <CleaningScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </div>
  );
}

/* =========================== CONTACT & GALLERY VIEW =========================== */
function ContactView() {
  const { generalSettings, ownerProfile, contactSettings, locationSettings, gallery } = useApp();
  const [galleryFilter, setGalleryFilter] = useState<string>('all');

  const phone = contactSettings.phone || ownerProfile.phone;
  const whatsappRaw = contactSettings.whatsapp || ownerProfile.whatsapp || phone;
  const whatsapp = whatsappRaw.replace(/[^0-9]/g, '');
  const contactEmail = contactSettings.email || ownerProfile.email;

  const galleryItems = useMemo(() => {
    if (gallery.length > 0) return gallery;
    return [
      { id: 'g-1', title: 'Hostel Building', category: 'hostel' as const, imageUrl: HOSTEL_ASSETS.lodgeExterior },
      { id: 'g-2', title: 'Student Room', category: 'rooms' as const, imageUrl: HOSTEL_ASSETS.roomPreview },
      { id: 'g-3', title: 'Parking Area', category: 'parking' as const, imageUrl: HOSTEL_ASSETS.parkingArea },
      { id: 'g-4', title: 'Rooftop Terrace', category: 'rooftop' as const, imageUrl: HOSTEL_ASSETS.rooftopView },
    ];
  }, [gallery]);

  const filteredGallery =
    galleryFilter === 'all'
      ? galleryItems
      : galleryItems.filter((g) => {
          if (galleryFilter === 'hostel') return g.category === 'hostel' || g.category === 'lodge';
          return g.category === galleryFilter;
        });

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Contact Us
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Reach out to hostel management for room visits, admission assistance, location details,
          and hostel gallery photos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-4">
            {ownerProfile.photoUrl ? (
              <img
                src={ownerProfile.photoUrl}
                alt={ownerProfile.name}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 font-bold text-xl flex items-center justify-center shrink-0">
                {ownerProfile.name.slice(0, 1)}
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-emerald-700">{ownerProfile.role}</p>
              <h2 className="text-xl font-bold text-slate-900">{ownerProfile.name}</h2>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">{ownerProfile.about}</p>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            {phone || whatsapp || contactEmail ? (
              <div className="flex flex-wrap gap-2.5">
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call {phone}</span>
                  </a>
                )}
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                )}
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{contactEmail}</span>
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Information will be updated soon.</p>
            )}
          </div>
        </section>

        <section className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700">
              <MapPin className="w-4 h-4" />
              <span>Hostel Address &amp; Stay Info</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              🏠 {generalSettings.lodgeName || 'Amit Bhaiya Lawaj'}
            </h2>
            {locationSettings.address || locationSettings.city ? (
              <div className="text-sm text-slate-600 space-y-1">
                {locationSettings.address && <p>{locationSettings.address}</p>}
                {locationSettings.landmark && <p>Landmark: {locationSettings.landmark}</p>}
                {locationSettings.city && <p>{locationSettings.city}</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Information will be updated soon.</p>
            )}
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
              {generalSettings.checkInTime && (
                <p>
                  <strong className="text-slate-700">Check-in:</strong> {generalSettings.checkInTime}
                </p>
              )}
              {generalSettings.checkOutTime && (
                <p>
                  <strong className="text-slate-700">Check-out:</strong>{' '}
                  {generalSettings.checkOutTime}
                </p>
              )}
            </div>
          </div>

          {locationSettings.googleMapsUrl && (
            <div className="pt-2">
              <a
                href={locationSettings.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </section>
      </div>

      {/* Frequently Asked Questions */}
      <FaqSection compact />

      {/* Photo Gallery */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Hostel Gallery</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'hostel', label: 'Hostel' },
              { id: 'rooms', label: 'Rooms' },
              { id: 'bathroom', label: 'Bathroom' },
              { id: 'parking', label: 'Parking' },
              { id: 'rooftop', label: 'Rooftop' },
              { id: 'study_area', label: 'Study Area' },
              { id: 'other', label: 'Other' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGalleryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  galleryFilter === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredGallery.map((item) => (
            <figure
              key={item.id}
              className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full aspect-[4/3] object-cover"
                referrerPolicy="no-referrer"
              />
              <figcaption className="px-4 py-3 text-sm font-medium text-slate-800">
                {item.title}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}

/* =========================== PROFILE & MY REGISTRATIONS VIEW =========================== */
function ProfileView() {
  const {
    user,
    isAdmin,
    registrations,
    generalSettings,
    signInWithGoogle,
    logout,
    setActiveTab,
    openRegistrationForRoom,
    loadRegistrationAssets,
    showToast,
  } = useApp();

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadOrPrintMyPdf = async (reg: StayRegistration, mode: 'download' | 'print') => {
    setDownloadingId(reg.id);
    try {
      const assets = await loadRegistrationAssets(reg);
      const generated = await generateRegistrationPdf({
        registrationId: reg.registrationId,
        registrationDateIST: reg.registrationDateIST,
        registrationTimeIST: reg.registrationTimeIST,
        hostelName: generalSettings.lodgeName || 'Amit Bhaiya Lawaj',
        hostelSubName: generalSettings.lodgeNameHindi,
        fullName: reg.fullName,
        gender: reg.gender,
        mobile: reg.mobile,
        addressHouse: reg.addressHouse,
        addressPostOffice: reg.addressPostOffice,
        addressDistrict: reg.addressDistrict,
        addressState: reg.addressState,
        addressPin: reg.addressPin,
        fatherName: reg.fatherName,
        motherName: reg.motherName,
        parentMobile: reg.parentMobile,
        emergencyContact: reg.emergencyContact,
        emergencyRelation: reg.emergencyRelation,
        roomPreference: reg.roomPreference,
        selectedRoomName: reg.selectedRoomName,
        assignedRoomNumber: reg.assignedRoomNumber,
        monthlyRent: reg.monthlyRent,
        securityDeposit: reg.securityDeposit,
        advanceRent: reg.advanceRent,
        totalPayable: reg.totalPayable,
        joiningDate: reg.joiningDate,
        stayDuration: reg.stayDuration,
        idProofType: reg.idProofType,
        idProofFileName: reg.idProofFileName,
        idProofMimeType: reg.idProofMimeType,
        idProofDataUrl: assets.idProofDataUrl,
        photoDataUrl: assets.photoDataUrl,
      });

      if (mode === 'print') {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = generated.blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            // fallback
          }
          window.setTimeout(() => {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            URL.revokeObjectURL(generated.blobUrl);
          }, 60000);
        };
      } else {
        const link = document.createElement('a');
        link.href = generated.blobUrl;
        link.download = generated.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => URL.revokeObjectURL(generated.blobUrl), 30000);
      }
    } catch {
      showToast('Unable to generate PDF right now. Please try again.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Student Account &amp; Registrations
        </h1>
        <p className="text-sm text-slate-600">
          View your submitted monthly stay registrations, download or print your PDF, or access
          hostel links.
        </p>
      </div>

      {/* Account Card */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {user ? (
          <>
            <div className="flex items-center gap-3.5 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center">
                  {(user.displayName || 'S').slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-900 truncate">
                  {user.displayName || 'Hostel Student'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user.email} {isAdmin ? '· Authorized Admin' : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                {isAdmin ? 'Open Admin Panel' : 'Admin Login'}
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-base font-bold text-slate-900">Sign In with Google</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sign in to submit your stay registration and download your print-ready PDF anytime.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                <LogIn className="w-4 h-4" />
                <span>Student Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Admin Login</span>
              </button>
            </div>
          </>
        )}
      </section>

      {/* Quick Links */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { tab: 'facilities' as AppTab, label: 'Facilities', desc: 'Rooms, parking & rooftop', icon: Sparkles },
          { tab: 'study' as AppTab, label: 'Study Corner', desc: 'Focus timer & routine', icon: BookOpen },
          { tab: 'contact' as AppTab, label: 'Contact & Photos', desc: 'Management & location', icon: Phone },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => setActiveTab(item.tab)}
              className="text-left bg-white border border-slate-200/80 rounded-2xl p-4 hover:border-blue-200 flex items-center gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </section>

      {/* Student's Submitted Monthly Stay Registrations */}
      {user && (
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">My Stay Registrations</h2>
            <button
              type="button"
              onClick={() => openRegistrationForRoom()}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              + New Registration
            </button>
          </div>
          {registrations.length === 0 ? (
            <p className="text-sm text-slate-500">
              You have not submitted a monthly stay registration yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {registrations.map((reg) => (
                <div
                  key={reg.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-900">
                      <span className="text-blue-700 tabular-nums">{reg.registrationId}</span> ·{' '}
                      {reg.roomPreference} Sharing
                      {reg.assignedRoomNumber ? ` (Room #${reg.assignedRoomNumber})` : ''}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      Joining: {reg.joiningDate} · Submitted {reg.registrationDateIST} (
                      {reg.registrationTimeIST})
                    </p>
                    <p className="text-xs font-semibold text-emerald-700 capitalize">
                      Status: {reg.status.replace(/_/g, ' ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      disabled={downloadingId === reg.id}
                      onClick={() => handleDownloadOrPrintMyPdf(reg, 'print')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Print</span>
                    </button>
                    <button
                      type="button"
                      disabled={downloadingId === reg.id}
                      onClick={() => handleDownloadOrPrintMyPdf(reg, 'download')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {downloadingId === reg.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Preparing...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                          <span>Download PDF</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* =========================== MAIN APP SHELL =========================== */
function HostelAppShell() {
  const {
    user,
    isAdmin,
    showIntro,
    setShowIntro,
    activeTab,
    setActiveTab,
    generalSettings,
    contactSettings,
    ownerProfile,
    dataError,
    toast,
    signInWithGoogle,
    logout,
  } = useApp();

  // Keep canonical URL, og:url, and document title cleanly synced per page
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const baseName = generalSettings.lodgeName || 'Amit Bhaiya Lawaj';
    const titleMap: Record<AppTab, string> = {
      home: `${baseName} — Monthly Stay Registration`,
      rooms: `Rooms & Monthly Rent | ${baseName}`,
      rent: `Rooms & Monthly Rent | ${baseName}`,
      facilities: `Hostel Facilities | ${baseName}`,
      rules: `Hostel Rules | ${baseName}`,
      register: `Stay Registration | ${baseName}`,
      study: `Study Corner | ${baseName}`,
      contact: `Contact Us | ${baseName}`,
      profile: `My Registrations | ${baseName}`,
      admin: `Admin Panel | ${baseName}`,
      privacy: `Privacy Policy | ${baseName}`,
      terms: `Terms & Conditions | ${baseName}`,
      faqs: `FAQs | ${baseName}`,
      not_found: `Page Not Found | ${baseName}`,
    };
    document.title = titleMap[activeTab] || `${baseName} — Monthly Stay Registration`;

    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    let ogUrlMeta = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
    if (!ogUrlMeta) {
      ogUrlMeta = document.createElement('meta');
      ogUrlMeta.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrlMeta);
    }
    ogUrlMeta.content = canonicalUrl;
  }, [activeTab, generalSettings.lodgeName]);

  const footerPhone = contactSettings.phone || ownerProfile.phone;
  const footerWhatsappRaw = contactSettings.whatsapp || ownerProfile.whatsapp || footerPhone;
  const footerWhatsapp = footerWhatsappRaw.replace(/[^0-9]/g, '');
  const footerEmail = contactSettings.email || ownerProfile.email;

  const desktopNav: {
    id: AppTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'rooms', label: 'Rooms & Rent', icon: BedDouble },
    { id: 'facilities', label: 'Facilities', icon: Sparkles },
    { id: 'rules', label: 'Hostel Rules', icon: ScrollText },
    { id: 'register', label: 'Stay Registration', icon: ClipboardEdit },
    { id: 'study', label: 'Study Corner', icon: BookOpen },
    { id: 'contact', label: 'Contact', icon: Phone },
  ];

  const mobileNav: {
    id: AppTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'rooms', label: 'Rooms', icon: BedDouble },
    { id: 'rules', label: 'Rules', icon: ScrollText },
    { id: 'register', label: 'Register', icon: ClipboardEdit },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  const handleSelectTab = (tab: AppTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col lg:flex-row">
      {/* Clean White Welcome Screen (re-appears on fresh load, NO Skip button) */}
      <AnimatePresence>
        {showIntro && (
          <WelcomeScreen
            greeting={generalSettings.introGreeting}
            subtitle={generalSettings.introSubtitle}
            onFinish={() => setShowIntro(false)}
          />
        )}
      </AnimatePresence>

      {/* DESKTOP LEFT SIDEBAR */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200/80 z-30">
        <div className="px-6 py-5 border-b border-slate-100">
          <button
            type="button"
            onClick={() => handleSelectTab('home')}
            className="text-left flex items-center gap-3 w-full"
          >
            {generalSettings.logoUrl ? (
              <img
                src={generalSettings.logoUrl}
                alt={generalSettings.lodgeName || 'Amit Bhaiya Lawaj'}
                className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-base shrink-0">
                🏠
              </div>
            )}
            <div className="min-w-0">
              <span className="text-base font-bold text-slate-900 tracking-tight block truncate">
                {generalSettings.lodgeName || 'Amit Bhaiya Lawaj'}
              </span>
              <span className="text-xs text-slate-500 block mt-0.5 truncate">
                Monthly Stay Registration
              </span>
            </div>
          </button>
        </div>

        <nav className="flex-1 px-3.5 py-4 space-y-1 overflow-y-auto">
          {desktopNav.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleSelectTab('admin')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'admin'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <ShieldCheck
                className={`w-4 h-4 ${activeTab === 'admin' ? 'text-emerald-600' : 'text-slate-400'}`}
              />
              <span>{isAdmin ? 'Admin Panel' : 'Admin Login'}</span>
            </button>
          </div>
        </nav>

        {/* Sidebar Auth Footer */}
        <div className="p-4 border-t border-slate-100">
          {user ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleSelectTab('profile')}
                className="flex items-center gap-2.5 min-w-0 text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {(user.displayName || user.email || 'S').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {user.displayName || 'Student'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {isAdmin ? 'Authorized Admin' : 'My Registrations'}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={logout}
                aria-label="Sign out"
                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <LogIn className="w-4 h-4 text-blue-600" />
              <span>Student Sign In</span>
            </button>
          )}
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="lg:hidden sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleSelectTab('home')}
          className="text-left flex items-center gap-2 min-w-0"
        >
          {generalSettings.logoUrl ? (
            <img
              src={generalSettings.logoUrl}
              alt={generalSettings.lodgeName || 'Amit Bhaiya Lawaj'}
              className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <span className="text-base" aria-hidden="true">🏠</span>
          )}
          <span className="text-base font-bold text-slate-900 tracking-tight truncate">
            {generalSettings.lodgeName || 'Amit Bhaiya Lawaj'}
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSelectTab('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              activeTab === 'admin'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {isAdmin ? 'Admin' : 'Admin Login'}
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('contact')}
            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center"
            aria-label="Contact Hostel"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA + PROFESSIONAL FOOTER */}
      <main className="flex-1 lg:pl-64 pb-24 lg:pb-0 flex flex-col min-h-screen">
        <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
          {dataError &&
          activeTab !== 'privacy' &&
          activeTab !== 'terms' &&
          activeTab !== 'faqs' &&
          activeTab !== 'not_found' ? (
            <AppErrorView onRetry={() => window.location.reload()} />
          ) : (
            <>
              {activeTab === 'home' && <HomeView />}
              {activeTab === 'rooms' && <RoomsView />}
              {activeTab === 'rent' && <RoomsView />}
              {activeTab === 'facilities' && <FacilitiesView />}
              {activeTab === 'rules' && <RulesView />}
              {activeTab === 'register' && <StayRegistrationView />}
              {activeTab === 'study' && <StudyView />}
              {activeTab === 'contact' && <ContactView />}
              {activeTab === 'profile' && <ProfileView />}
              {activeTab === 'admin' && <AdminPanel />}
              {activeTab === 'privacy' && <PrivacyPolicyView />}
              {activeTab === 'terms' && <TermsConditionsView />}
              {activeTab === 'faqs' && <FaqPageView />}
              {activeTab === 'not_found' && <NotFoundView />}
            </>
          )}
        </div>

        {/* PROFESSIONAL PRODUCTION FOOTER */}
        <footer className="bg-white border-t border-slate-200/80 mt-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {generalSettings.logoUrl ? (
                  <img
                    src={generalSettings.logoUrl}
                    alt={generalSettings.lodgeName || 'Amit Bhaiya Lawaj'}
                    className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <span className="text-lg" aria-hidden="true">🏠</span>
                )}
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {generalSettings.lodgeName || 'Amit Bhaiya Lawaj'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Safe, peaceful monthly accommodation for students · Managed by {ownerProfile.name}
                  </p>
                </div>
              </div>

              <nav
                aria-label="Legal and support links"
                className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm font-medium text-slate-600"
              >
                <button
                  type="button"
                  onClick={() => handleSelectTab('faqs')}
                  className={`hover:text-blue-600 transition-colors ${
                    activeTab === 'faqs' ? 'text-blue-600 font-semibold' : ''
                  }`}
                >
                  FAQs
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTab('privacy')}
                  className={`hover:text-blue-600 transition-colors ${
                    activeTab === 'privacy' ? 'text-blue-600 font-semibold' : ''
                  }`}
                >
                  Privacy Policy
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTab('terms')}
                  className={`hover:text-blue-600 transition-colors ${
                    activeTab === 'terms' ? 'text-blue-600 font-semibold' : ''
                  }`}
                >
                  Terms &amp; Conditions
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTab('rules')}
                  className={`hover:text-blue-600 transition-colors ${
                    activeTab === 'rules' ? 'text-blue-600 font-semibold' : ''
                  }`}
                >
                  Hostel Rules
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTab('contact')}
                  className={`hover:text-blue-600 transition-colors ${
                    activeTab === 'contact' ? 'text-blue-600 font-semibold' : ''
                  }`}
                >
                  Contact Us
                </button>
              </nav>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {footerPhone && (
                  <a href={`tel:${footerPhone}`} className="hover:text-blue-600 font-medium text-slate-700">
                    Phone: {footerPhone}
                  </a>
                )}
                {footerWhatsapp && (
                  <a
                    href={`https://wa.me/${footerWhatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-emerald-700 font-medium text-emerald-700"
                  >
                    WhatsApp Support
                  </a>
                )}
                {footerEmail && (
                  <a href={`mailto:${footerEmail}`} className="hover:text-blue-600">
                    {footerEmail}
                  </a>
                )}
              </div>
              <p>
                © {new Date().getFullYear()} {generalSettings.lodgeName || 'Amit Bhaiya Lawaj'}. All rights
                reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200/90 px-2 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`min-h-[56px] flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? 'text-blue-600 font-semibold' : 'text-slate-500'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* GLOBAL LIGHTWEIGHT TOAST */}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 max-w-sm">
          <div
            className={`px-4 py-3 rounded-2xl border shadow-md text-sm font-medium bg-white flex items-center gap-2.5 ${
              toast.type === 'error'
                ? 'border-amber-300 text-amber-900'
                : toast.type === 'info'
                  ? 'border-blue-200 text-slate-800'
                  : 'border-emerald-200 text-emerald-900'
            }`}
          >
            <CheckCircle2
              className={`w-4 h-4 shrink-0 ${
                toast.type === 'error'
                  ? 'text-amber-600'
                  : toast.type === 'info'
                    ? 'text-blue-600'
                    : 'text-emerald-600'
              }`}
            />
            <span>{toast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HostelAppShell />
    </ErrorBoundary>
  );
}
