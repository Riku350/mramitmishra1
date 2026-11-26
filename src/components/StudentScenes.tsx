import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Backpack, Building2, Coffee, Droplet, LampDesk } from 'lucide-react';
import { HOSTEL_ASSETS } from '../data/hostelRules';

/**
 * Clean White Welcome Screen — NO Skip button, auto-transitions smoothly.
 * Re-appears on every fresh load / refresh.
 */
export function WelcomeScreen({
  greeting,
  subtitle,
  onFinish,
}: {
  greeting: string;
  subtitle: string;
  onFinish: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onFinish();
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6 py-10 select-none"
    >
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-3xl overflow-hidden border border-slate-100 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] mb-8"
        >
          <img
            src={HOSTEL_ASSETS.welcomeIllustration}
            alt="Students walking and reading outside Amit Bhaiya Lawaj"
            className="w-full aspect-video object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm animate-gentle-float">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Study · Stay · Grow</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="space-y-2 max-w-md"
        >
          <p className="text-xs font-semibold text-emerald-700 tracking-wide">
            Monthly Student Accommodation Portal
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight text-balance">
            🏠 {greeting || 'Amit Bhaiya Lawaj'}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            {subtitle || 'Safe Stay. Better Study. Better Future.'}
          </p>
        </motion.div>

        <div className="mt-8 w-44 h-1 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            transition={{ duration: 2.4, ease: 'easeInOut' }}
            className="h-full w-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Lightweight animated student-life ambience strip
 */
export function StudentLifeStrip() {
  const moments = [
    {
      title: 'Study Focus',
      subtitle: 'Quiet Study Desk & Lamp',
      icon: LampDesk,
      tint: 'bg-blue-50 text-blue-600',
      anim: 'animate-lamp-glow',
    },
    {
      title: 'Hostel Campus',
      subtitle: 'Clean & Safe Corridors',
      icon: Building2,
      tint: 'bg-emerald-50 text-emerald-600',
      anim: 'animate-walk-sway',
    },
    {
      title: 'Student Rooms',
      subtitle: 'Monthly Comfortable Stay',
      icon: Backpack,
      tint: 'bg-sky-50 text-sky-600',
      anim: 'animate-gentle-float',
    },
    {
      title: 'Peaceful Routine',
      subtitle: 'Calm Study-First Living',
      icon: Coffee,
      tint: 'bg-teal-50 text-teal-600',
      anim: 'animate-gentle-float',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {moments.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.title}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 transition-shadow hover:shadow-sm"
          >
            <div className={`w-10 h-10 rounded-xl ${m.tint} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${m.anim}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{m.title}</p>
              <p className="text-xs text-slate-500 truncate">{m.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Subtle animated water droplet for Save Water rule
 */
export function AnimatedWaterDrop() {
  return (
    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
      <Droplet className="w-5 h-5 animate-water-drop" />
    </div>
  );
}
