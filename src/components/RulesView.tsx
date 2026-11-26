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
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useApp, LodgeRule } from '../AppContext';
import { BATHROOM_CLEANING_SCHEDULE } from '../data/hostelRules';
import { AnimatedWaterDrop } from './StudentScenes';

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

const IMPORTANT_HIGHLIGHTS = [
  { emoji: '🏠', label: '1 Month Advance Rent' },
  { emoji: '🚫', label: 'No Guests' },
  { emoji: '🕘', label: 'Gate Closes at 9 PM' },
  { emoji: '📅', label: '1 Month Leaving Notice' },
  { emoji: '💧', label: 'Save Water' },
  { emoji: '💡', label: 'Save Electricity' },
  { emoji: '🔇', label: 'Maintain Silence' },
];

export function RulesView() {
  const { rules, openRegistrationForRoom } = useApp();
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const activeRules = useMemo(() => {
    return rules
      .filter((r) => r.enabled)
      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  }, [rules]);

  const isBathroomRule = (rule: LodgeRule) =>
    rule.icon === 'bath' ||
    rule.id.toLowerCase().includes('bathroom') ||
    rule.title.toLowerCase().includes('bathroom');

  return (
    <div className="space-y-7 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Hostel Rules
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Simple &amp; clear rules for a peaceful stay at <strong>Amit Bhaiya Lawaj</strong>.
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

      {/* Top Important Rules Highlight */}
      <section
        aria-label="Important hostel rules"
        className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-3"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Important Rules at a Glance
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {IMPORTANT_HIGHLIGHTS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5"
            >
              <span className="text-lg leading-none shrink-0" aria-hidden="true">
                {item.emoji}
              </span>
              <span className="text-sm font-semibold text-slate-900">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Simple Numbered One-Line Rule Cards (01 to 17) */}
      <section aria-label="All hostel rules" className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {activeRules.map((rule, index) => {
          const ruleNum = String(rule.sortOrder || index + 1).padStart(2, '0');
          const borderStyle =
            rule.variant === 'warning'
              ? 'border-amber-200/80 bg-white'
              : rule.variant === 'important'
                ? 'border-blue-200/80 bg-white'
                : 'border-slate-200/80 bg-white';

          const numColor =
            rule.variant === 'warning'
              ? 'text-amber-700'
              : rule.variant === 'important'
                ? 'text-blue-700'
                : 'text-slate-500';

          return (
            <article
              key={rule.id}
              className={`${borderStyle} border rounded-2xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-2.5`}
            >
              <div className="space-y-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  <span className={`${numColor} tabular-nums`}>{ruleNum}</span>
                  <span className="text-slate-300 mx-2">—</span>
                  <span>{rule.title}</span>
                </h2>

                {rule.description && (
                  <p className="text-[15px] sm:text-base text-slate-700 leading-relaxed">
                    {rule.description}
                  </p>
                )}
              </div>

              {isBathroomRule(rule) && (
                <button
                  type="button"
                  onClick={() => setScheduleOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 pt-1 self-start"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>View Mon–Sat Cleaning Schedule</span>
                </button>
              )}
            </article>
          );
        })}
      </section>

      {/* Ready to Stay? CTA Section */}
      <section className="bg-white border border-blue-200/90 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Ready to Stay at Amit Bhaiya Lawaj?
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Read all 17 rules above and continue to online stay registration.
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
