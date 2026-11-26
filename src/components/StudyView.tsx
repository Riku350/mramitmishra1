import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  VolumeX,
  Lightbulb,
  DoorClosed,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../AppContext';
import { HOSTEL_ASSETS } from '../data/hostelRules';

const PRESETS = [
  { id: 'focus25', label: '25 min Focus', seconds: 25 * 60 },
  { id: 'deep50', label: '50 min Deep Study', seconds: 50 * 60 },
  { id: 'break5', label: '5 min Break', seconds: 5 * 60 },
] as const;

export function StudyView() {
  const { setActiveTab, openRegistrationForRoom } = useApp();
  const [presetId, setPresetId] = useState<(typeof PRESETS)[number]['id']>('focus25');
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [running, setRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);

  const currentPreset = PRESETS.find((p) => p.id === presetId) || PRESETS[0];

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setCompletedSessions((c) => c + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  const selectPreset = (id: (typeof PRESETS)[number]['id'], secs: number) => {
    setRunning(false);
    setPresetId(id);
    setSecondsLeft(secs);
  };

  const resetTimer = () => {
    setRunning(false);
    setSecondsLeft(currentPreset.seconds);
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const progressPct = Math.max(
    0,
    Math.min(100, ((currentPreset.seconds - secondsLeft) / currentPreset.seconds) * 100)
  );

  const studyHabits = [
    {
      title: 'Peaceful Atmosphere',
      detail: 'Maintain silence in your room and hallways for focused study.',
      icon: VolumeX,
      tint: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Save Electricity',
      detail: 'Switch OFF lights and fans whenever you step out of your room.',
      icon: Lightbulb,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Disciplined Routine',
      detail: 'Return inside before the 9:00 PM main gate closing time.',
      icon: DoorClosed,
      tint: 'bg-sky-50 text-sky-600',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700">
              <BookOpen className="w-4 h-4" />
              <span>Read · Learn · Grow</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Today&apos;s Focus — Tomorrow&apos;s Success.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Focus on your exams and career goals while enjoying a clean, quiet, and supportive
              student hostel routine.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => openRegistrationForRoom()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <span>Register for Stay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <span>View Hostel Rules</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 p-4 sm:p-6 lg:pr-8">
            <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50/40">
              <img
                src={HOSTEL_ASSETS.studyIllustration}
                alt="Student studying peacefully at desk with lamp and books"
                className="w-full aspect-[4/3] object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Study Focus Timer</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Simple distraction-free study sessions
              </p>
            </div>
            {completedSessions > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 tabular-nums">
                <CheckCircle2 className="w-4 h-4" />
                {completedSessions} session{completedSessions > 1 ? 's' : ''} completed
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const active = preset.id === presetId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectPreset(preset.id, preset.seconds)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="py-4 text-center space-y-4">
            <div className="text-5xl sm:text-6xl font-bold text-slate-900 tracking-tight tabular-nums">
              {mins}:{secs}
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden max-w-md mx-auto">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {secondsLeft === 0 && (
              <p className="text-sm font-medium text-emerald-700">
                Session complete! Take a short break.
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (secondsLeft === 0) setSecondsLeft(currentPreset.seconds);
                setRunning((r) => !r);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{running ? 'Pause' : 'Start Study'}</span>
            </button>
            <button
              type="button"
              onClick={resetTimer}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-slate-100">
              <img
                src={HOSTEL_ASSETS.loungeIllustration}
                alt="Calm student hostel lounge and corridor"
                className="w-full aspect-video object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Study • Stay • Grow</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily habits for a calm hostel living environment
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {studyHabits.map((habit) => {
              const Icon = habit.icon;
              return (
                <div key={habit.title} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl ${habit.tint} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{habit.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{habit.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
