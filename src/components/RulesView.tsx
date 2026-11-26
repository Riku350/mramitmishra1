import React, { useMemo, useState } from 'react';
import {
  Wallet,
  IdCard,
  Brush,
  UserX,
  DoorClosed,
  CalendarClock,
  Sparkles,
  Lightbulb,
  Fan,
  Wrench,
  CalendarCheck,
  Bath,
  Home,
  AlertTriangle,
  VolumeX,
  PlugZap,
  Bike,
  ShieldCheck,
  Calendar,
  X,
  ZapOff,
  CheckCircle2,
  Clock,
  ArrowRight,
  Droplet,
} from 'lucide-react';
import { useApp, LodgeRule } from '../AppContext';
import { BATHROOM_CLEANING_SCHEDULE } from '../data/hostelRules';
import { AnimatedWaterDrop } from './StudentScenes';

const RULE_CATEGORIES = [
  { id: 'all', label: 'All Rules' },
  { id: 'rent', label: 'Rent & Notice' },
  { id: 'room', label: 'Room & Cleaning' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'discipline', label: 'Discipline & Safety' },
] as const;

type CategoryFilter = (typeof RULE_CATEGORIES)[number]['id'];

export function RuleIcon({ icon, variant }: { icon?: string; variant?: string }) {
  if (icon === 'droplet') {
    return <AnimatedWaterDrop />;
  }

  if (icon === 'lightbulb-fan') {
    return (
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center gap-0.5 shrink-0">
        <Lightbulb className="w-4 h-4" />
        <Fan className="w-4 h-4" />
      </div>
    );
  }

  const iconTone =
    variant === 'warning'
      ? 'bg-amber-50 text-amber-700'
      : variant === 'important'
        ? 'bg-blue-50 text-blue-600'
        : 'bg-slate-100/80 text-slate-700';

  const iconClass = 'w-5 h-5';
  let IconNode: React.ReactNode = <ShieldCheck className={iconClass} />;

  switch (icon) {
    case 'wallet':
      IconNode = <Wallet className={iconClass} />;
      break;
    case 'id-card':
      IconNode = <IdCard className={iconClass} />;
      break;
    case 'brush':
      IconNode = <Brush className={iconClass} />;
      break;
    case 'user-x':
      IconNode = <UserX className={iconClass} />;
      break;
    case 'door-closed':
      IconNode = <DoorClosed className={iconClass} />;
      break;
    case 'calendar-clock':
      IconNode = <CalendarClock className={iconClass} />;
      break;
    case 'sparkles':
      IconNode = <Sparkles className={iconClass} />;
      break;
    case 'wrench':
      IconNode = <Wrench className={iconClass} />;
      break;
    case 'calendar-check':
      IconNode = <CalendarCheck className={iconClass} />;
      break;
    case 'bath':
      IconNode = <Bath className={iconClass} />;
      break;
    case 'home':
      IconNode = <Home className={iconClass} />;
      break;
    case 'alert-triangle':
      IconNode = <AlertTriangle className={iconClass} />;
      break;
    case 'volume-x':
      IconNode = <VolumeX className={iconClass} />;
      break;
    case 'plug-zap':
      IconNode = <PlugZap className={iconClass} />;
      break;
    case 'bike':
      IconNode = <Bike className={iconClass} />;
      break;
    default:
      IconNode = <ShieldCheck className={iconClass} />;
  }

  return (
    <div className={`w-10 h-10 rounded-xl ${iconTone} flex items-center justify-center shrink-0`}>
      {IconNode}
    </div>
  );
}

export function CleaningScheduleModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/25 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Room-wise Bathroom Cleaning Schedule</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Monday to Saturday routine · Inform the next room after completing your turn.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close schedule"
            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 px-6 py-2 max-h-[60vh] overflow-y-auto">
          {BATHROOM_CLEANING_SCHEDULE.map((row) => (
            <div key={row.day} className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{row.day}</p>
                <p className="text-xs text-slate-500 mt-0.5">{row.nextStep}</p>
              </div>
              <span className="text-xs font-semibold text-blue-700 shrink-0 tabular-nums">
                {row.turn}
              </span>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Please notify the next room once your turn is done.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function RulesView() {
  const { rules, openRegistrationForRoom } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const activeRules = useMemo(() => {
    return rules
      .filter((r) => r.enabled)
      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  }, [rules]);

  const filteredRules = useMemo(() => {
    if (selectedCategory === 'all') return activeRules;
    return activeRules.filter((r) => (r.category || 'discipline') === selectedCategory);
  }, [activeRules, selectedCategory]);

  const isBathroomRule = (rule: LodgeRule) =>
    rule.icon === 'bath' ||
    rule.id.toLowerCase().includes('bathroom') ||
    rule.title.toLowerCase().includes('bathroom');

  const topHighlights = [
    { title: '9:00 PM — Gate Closing', sub: 'Main gate closes daily', icon: DoorClosed, tone: 'bg-blue-50 text-blue-600' },
    { title: '1–5 — Regular Rent Date', sub: 'Up to 10th in emergency', icon: CalendarCheck, tone: 'bg-emerald-50 text-emerald-600' },
    { title: '1 Month — Leaving Notice', sub: 'Inform 1 month in advance', icon: CalendarClock, tone: 'bg-blue-50 text-blue-600' },
    { title: 'Guests — Not Allowed', sub: 'Emergency: ₹100 / person / day', icon: UserX, tone: 'bg-amber-50 text-amber-700' },
    { title: 'Save Electricity & Water', sub: 'Switch OFF lights & fans', icon: Droplet, tone: 'bg-sky-50 text-sky-600' },
    { title: 'Maintain Silence', sub: 'Peaceful study environment', icon: VolumeX, tone: 'bg-teal-50 text-teal-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Hostel Rules
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Please read all hostel rules carefully before applying for a stay.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setScheduleOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-colors self-start sm:self-auto"
        >
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Cleaning Schedule</span>
        </button>
      </div>

      {/* Top 6 Important Rules Highlights */}
      <section aria-label="Important rules summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {topHighlights.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
            >
              <div className={`w-10 h-10 rounded-xl ${item.tone} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 tabular-nums">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3">
        {RULE_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* All 17 Rules Grid */}
      {filteredRules.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center">
          <p className="text-sm text-slate-600">No rules listed in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRules.map((rule, index) => {
            const cardStyle =
              rule.variant === 'warning'
                ? 'bg-amber-50/35 border-amber-200/80'
                : rule.variant === 'important'
                  ? 'bg-white border-blue-200/90'
                  : 'bg-white border-slate-200/80';

            const labelStyle =
              rule.variant === 'warning'
                ? 'text-amber-800'
                : rule.variant === 'important'
                  ? 'text-blue-700'
                  : 'text-emerald-700';

            return (
              <article
                key={rule.id}
                className={`${cardStyle} border rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition-shadow hover:shadow-sm`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <RuleIcon icon={rule.icon} variant={rule.variant} />
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-slate-400 tracking-wide tabular-nums block">
                        RULE {String(rule.sortOrder || index + 1).padStart(2, '0')}
                      </span>
                      <h2 className="text-base font-bold text-slate-900 leading-snug">
                        {rule.title}
                      </h2>
                    </div>
                  </div>

                  {rule.description && (
                    <p className="text-sm text-slate-700 leading-relaxed">{rule.description}</p>
                  )}
                </div>

                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  {rule.englishLabel && (
                    <p className={`text-xs font-semibold ${labelStyle}`}>{rule.englishLabel}</p>
                  )}

                  {rule.highlights && rule.highlights.length > 0 && (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {rule.highlights.join('  ·  ')}
                    </p>
                  )}

                  {isBathroomRule(rule) && (
                    <button
                      type="button"
                      onClick={() => setScheduleOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 pt-1"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>View Room-wise Cleaning Schedule (Mon–Sat)</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Restricted Devices Callout */}
      <section className="bg-white border border-amber-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <ZapOff className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Restricted Electrical Devices</h2>
              <p className="text-sm text-slate-700 leading-relaxed max-w-2xl">
                Unnecessary electrical devices other than a mobile charger are not allowed unless
                permitted by management. Violators will be asked to vacate the room.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0">
            {['Iron', 'Water Heater', 'Heater'].map((device) => (
              <div
                key={device}
                className="bg-amber-50/50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 text-center"
              >
                <p className="text-xs font-semibold text-amber-900">{device}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Not Allowed</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ready to Stay? CTA Section */}
      <section className="bg-white border border-blue-200/90 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ready to Stay?</h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl">
            Please make sure you have read and understood all hostel rules before registration.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openRegistrationForRoom()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shrink-0 self-start sm:self-auto"
        >
          <span>Continue to Stay Registration</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      <CleaningScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </div>
  );
}
