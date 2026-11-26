import React, { useState } from 'react';
import { ChevronDown, HelpCircle, BedDouble, IndianRupee, ShieldCheck } from 'lucide-react';
import { useApp } from '../AppContext';

type FaqCategoryId = 'all' | 'rooms' | 'payments' | 'conduct';

interface FaqItem {
  id: string;
  category: Exclude<FaqCategoryId, 'all'>;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  // Room Availability
  {
    id: 'faq-room-availability',
    category: 'rooms',
    question: 'How can I check current room availability?',
    answer:
      'Visit the Rooms & Rent page to see live room status (Available, Occupied, or Maintenance) and free beds across Single, Double, and Triple sharing rooms.',
  },
  {
    id: 'faq-room-registration',
    category: 'rooms',
    question: 'How do I book or register for a monthly stay?',
    answer:
      'Submit the online Stay Registration form with your details, valid ID proof, and photo. After submitting, print the generated PDF, sign it with a pen, and submit it to hostel management.',
  },
  {
    id: 'faq-room-allocation',
    category: 'rooms',
    question: 'When is my room number confirmed?',
    answer:
      'Your room number is confirmed by the hostel administration after verifying your identity proof, signed registration copy, and advance rent payment.',
  },
  // Payment Procedures
  {
    id: 'faq-payment-advance',
    category: 'payments',
    question: 'Do I need to pay advance rent before moving in?',
    answer:
      'Yes. One month of advance rent must be paid before moving into your room, along with any applicable security deposit listed on the Rooms & Rent page.',
  },
  {
    id: 'faq-payment-dates',
    category: 'payments',
    question: 'When is monthly rent due each month?',
    answer:
      'Monthly rent must be paid between the 1st and 5th of every month. In an emergency, payment is accepted up to the 10th of the month.',
  },
  {
    id: 'faq-payment-notice',
    category: 'payments',
    question: 'What is the rule for leaving the room?',
    answer:
      'You must give at least one month of prior notice before vacating. Belongings can be moved out after the room is properly cleaned.',
  },
  // General Hostel Conduct
  {
    id: 'faq-conduct-gate-guests',
    category: 'conduct',
    question: 'What are the gate timings and guest rules?',
    answer:
      'The main hostel gate closes at 9:00 PM daily. Guests are not allowed; in an emergency, a charge of ₹100 per person per day applies as per hostel rules.',
  },
  {
    id: 'faq-conduct-appliances',
    category: 'conduct',
    question: 'Which electrical appliances are allowed in rooms?',
    answer:
      'Only regular mobile chargers are allowed. Heavy or extra appliances like irons, water heaters, and room heaters are strictly not permitted.',
  },
  {
    id: 'faq-conduct-discipline',
    category: 'conduct',
    question: 'What conduct and cleanliness rules should residents follow?',
    answer:
      'Maintain silence for peaceful study, switch off lights and fans when leaving, keep valuables safe, bring your own broom/dustbin/dustpan, and follow the Monday–Saturday bathroom cleaning turn.',
  },
];

const CATEGORIES: Array<{
  id: FaqCategoryId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'all', label: 'All Topics', icon: HelpCircle },
  { id: 'rooms', label: 'Room Availability', icon: BedDouble },
  { id: 'payments', label: 'Payment Procedures', icon: IndianRupee },
  { id: 'conduct', label: 'Hostel Conduct', icon: ShieldCheck },
];

export function FaqSection({ compact = false }: { compact?: boolean }) {
  const [activeCategory, setActiveCategory] = useState<FaqCategoryId>('all');
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0].id);

  const visibleItems =
    activeCategory === 'all'
      ? FAQ_ITEMS
      : FAQ_ITEMS.filter((item) => item.category === activeCategory);

  return (
    <section
      aria-labelledby="faq-section-heading"
      className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
            <HelpCircle className="w-4 h-4" />
            <span>Student Help Desk</span>
          </div>
          <h2
            id="faq-section-heading"
            className={`${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-bold text-slate-900 tracking-tight`}
          >
            Frequently Asked Questions (FAQs)
          </h2>
          <p className="text-sm text-slate-600">
            Quick answers about room availability, monthly rent payments, and hostel conduct.
          </p>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                const firstInCat =
                  cat.id === 'all'
                    ? FAQ_ITEMS[0]
                    : FAQ_ITEMS.find((i) => i.category === cat.id);
                setOpenId(firstInCat?.id || null);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Accordion List */}
      <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
        {visibleItems.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div key={item.id} className="bg-white">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <span className="text-sm sm:text-base font-semibold text-slate-900">
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 pt-0.5 text-sm text-slate-600 leading-relaxed">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FaqPageView() {
  const { setActiveTab, openRegistrationForRoom } = useApp();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <FaqSection />

      <section className="bg-blue-50/60 border border-blue-200/80 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">Still have a question?</h2>
          <p className="text-sm text-slate-600">
            Contact hostel management directly or read the full list of hostel rules.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Contact Us
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            Hostel Rules
          </button>
          <button
            type="button"
            onClick={() => openRegistrationForRoom()}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            Register for Stay
          </button>
        </div>
      </section>
    </div>
  );
}
