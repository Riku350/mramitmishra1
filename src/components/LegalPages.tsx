import React from 'react';
import {
  ShieldCheck,
  FileText,
  Lock,
  EyeOff,
  Camera,
  Database,
  Clock,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  AlertCircle,
  Home,
  RefreshCw,
  CheckCircle2,
  Cookie,
} from 'lucide-react';
import { useApp } from '../AppContext';

export function PrivacyPolicyView() {
  const { generalSettings, contactSettings, locationSettings, ownerProfile, setActiveTab } = useApp();

  const hostelName = generalSettings.lodgeName || 'Student Hostel';
  const phone = contactSettings.phone || ownerProfile.phone;
  const whatsappRaw = contactSettings.whatsapp || ownerProfile.whatsapp || phone;
  const whatsapp = whatsappRaw.replace(/[^0-9]/g, '');
  const email = contactSettings.email || ownerProfile.email;
  const retentionText =
    generalSettings.dataRetentionPolicy ||
    'Student registration records, identity verification documents, and signed hostel agreements are retained in accordance with hostel administration operational, legal, and documentation requirements, and may be reviewed or removed once no longer needed for hostel residency records.';

  const collectedItems = [
    'Student Full Name',
    'Date of Birth',
    'Gender',
    'Mobile Number',
    'Email Address',
    'Student Permanent Address',
    "Father's Name and Mother's Name",
    'Parent / Guardian Mobile Number (and optional alternate emergency contact)',
    'Identity Proof (Aadhaar Card or Other Valid ID)',
    'Student Photo',
    'Room Preference & Stay Information',
    'Joining Date & Expected Stay Duration',
    'Registration Date & Time (IST)',
    'Hostel Rules & Agreement Acceptance',
    'Generated Registration Document & Signed Copy',
  ];

  return (
    <article className="max-w-4xl mx-auto space-y-6">
      <header className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-2 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700">
          <ShieldCheck className="w-4 h-4" />
          <span>Data Protection &amp; Student Privacy</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          This Privacy Policy explains in clear and simple terms what personal information{' '}
          <strong className="text-slate-900">{hostelName}</strong> collects during monthly stay
          registration, how student documents are protected, and how you can contact hostel
          administration.
        </p>
      </header>

      {/* 1. Information We Collect */}
      <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span>1. Information We Collect</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          When a student completes a monthly stay registration on this website, we may collect the
          following details required for hostel admission and resident verification:
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-slate-700">
          {collectedItems.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. Identity Proof Privacy */}
      <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <EyeOff className="w-5 h-5 text-emerald-600" />
          <span>2. Identity Proof Privacy</span>
        </h2>
        <p className="text-sm font-semibold text-slate-900">
          Identity proof is collected only for hostel registration and verification purposes.
        </p>
        <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
          <li>Identity proof documents are never publicly displayed on the website.</li>
          <li>Other website visitors or normal student accounts cannot view your identity proof.</li>
          <li>
            Only authorized hostel administration (and the submitting student inside their own
            private registration session) can access the uploaded identity document.
          </li>
          <li>
            Identity proof files are stored securely using Firebase Storage and private database
            records protected by strict server-side Security Rules that block unauthorized access.
          </li>
        </ul>
      </section>

      {/* 3. Student Photo Privacy */}
      <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-600" />
          <span>3. Student Photo Privacy</span>
        </h2>
        <p className="text-sm font-semibold text-slate-900">
          Student photos are collected for hostel registration and identification purposes.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Student registration photos are kept completely separate from the public hostel photo
          gallery. Your submitted registration photo is never automatically published to the public
          gallery or shared publicly.
        </p>
      </section>

      {/* 4. Data Security */}
      <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-600" />
          <span>4. Data Security</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          We apply reasonable technical and administrative security controls to protect student
          information and uploaded documents:
        </p>
        <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
          <li>
            <strong className="text-slate-800">Firebase Authentication:</strong> Verifies student
            sign-in and restricts administrative access strictly to the authorized hostel
            administrator account.
          </li>
          <li>
            <strong className="text-slate-800">Firestore Security Rules:</strong> Prevents public
            users from reading student registrations, parent contact details, or identity proofs,
            and blocks unauthorized changes to rooms, rent, gallery, or hostel rules.
          </li>
          <li>
            <strong className="text-slate-800">Firebase Storage Security Rules:</strong> Protects
            private student uploads so admin-only documents are never openly accessible through
            public URLs.
          </li>
        </ul>
      </section>

      {/* 5. Data Sharing */}
      <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <span>5. Data Sharing</span>
        </h2>
        <p className="text-sm font-semibold text-slate-900">
          We do not sell student personal information.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Student details and registration documents are not shared with unrelated third parties for
          marketing or commercial purposes. Information may only be disclosed if strictly required
          by applicable law, lawful government/police verification, or emergency parent/guardian
          notification in accordance with hostel rules.
        </p>
      </section>

      {/* 6. Data Retention */}
      <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <span>6. Data Retention</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">{retentionText}</p>
      </section>

      {/* 7. Browser Storage & Cookies */}
      <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Cookie className="w-5 h-5 text-blue-600" />
          <span>7. Cookies &amp; Browser Storage</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          This website does not use advertising trackers or third-party marketing cookies. Standard
          browser storage (such as IndexedDB and session tokens managed by Firebase Authentication)
          is used strictly to keep signed-in students and the hostel administrator securely
          authenticated while using the website.
        </p>
      </section>

      {/* 8. User Rights & Contact */}
      <section className="bg-blue-50/60 border border-blue-200/80 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">8. Your Rights &amp; Contact Information</h2>
        <p className="text-sm font-medium text-slate-800">
          If you have any question about your personal information, please contact the hostel
          administration.
        </p>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2.5 text-sm text-slate-700">
          <p className="font-bold text-slate-900">
            {hostelName} — {ownerProfile.name} ({ownerProfile.role})
          </p>
          {locationSettings.address && (
            <p className="flex items-start gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                {[locationSettings.address, locationSettings.landmark, locationSettings.city]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </p>
          )}
          <div className="flex flex-wrap gap-2.5 pt-1">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{phone}</span>
              </a>
            )}
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{email}</span>
              </a>
            )}
            {!phone && !whatsapp && !email && (
              <button
                type="button"
                onClick={() => setActiveTab('contact')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Open Contact Us Page →
              </button>
            )}
          </div>
        </div>
      </section>
    </article>
  );
}

export function TermsConditionsView() {
  const { generalSettings, setActiveTab } = useApp();
  const hostelName = generalSettings.lodgeName || 'Student Hostel';

  const terms = [
    {
      title: '1. Accurate & Truthful Information',
      body: 'Students must provide complete, accurate, and truthful personal, parent/guardian, and stay details during online registration. Submitting false, misleading, or incomplete information may result in rejection of the application or cancellation of hostel residency.',
    },
    {
      title: '2. Valid Identity Proof',
      body: 'Every applicant must upload a genuine, legible government-issued identity proof (such as Aadhaar Card or another valid official ID) for verification by hostel management.',
    },
    {
      title: '3. Compliance with Hostel Rules',
      body: 'All residents are required to read, understand, and strictly follow the published Hostel Rules—including monthly rent dates, 1-month advance rent, 1-month prior vacating notice, gate closing timing, cleanliness, electricity/water conservation, and peaceful conduct.',
    },
    {
      title: '4. Review & Verification Before Submission',
      body: 'Before submitting the Stay Registration form, students must carefully verify all entered information, selected monthly room preference, joining date, cropped photo, and identity proof copy.',
    },
    {
      title: '5. Generated PDF & Physical Signature',
      body: 'After successful online registration, students must download and verify the generated A4 registration PDF (including the Hindi consent agreement and separate Identity Proof page), print it, sign it with a pen, and submit the signed physical copy to the hostel administration.',
    },
    {
      title: '6. Room Allocation & Monthly Tariff',
      body: 'Online registration records your stay request and preferences. Final room number assignment and admission approval are confirmed by hostel administration subject to bed availability, document verification, and applicable monthly rent payment.',
    },
    {
      title: '7. Disciplinary Action',
      body: 'Violation of hostel rules, creating disturbance, or submitting fraudulent documentation entitles hostel management to revoke stay permission and inform the student’s parent/guardian as outlined in the Hindi Stay Agreement.',
    },
  ];

  return (
    <article className="max-w-4xl mx-auto space-y-6">
      <header className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-2 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700">
          <FileText className="w-4 h-4" />
          <span>Website &amp; Registration Terms</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          By accessing the <strong className="text-slate-900">{hostelName}</strong> website and
          submitting a monthly stay registration, you agree to the following terms and conditions.
        </p>
      </header>

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-5">
        {terms.map((t) => (
          <section key={t.title} className="space-y-1.5 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
            <h2 className="text-base font-bold text-slate-900">{t.title}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{t.body}</p>
          </section>
        ))}

        <div className="pt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Read Hostel Rules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            Read Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            Contact Us
          </button>
        </div>
      </div>
    </article>
  );
}

export function NotFoundView() {
  const { setActiveTab } = useApp();

  return (
    <section className="min-h-[58vh] flex items-center justify-center py-8">
      <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-3xl p-8 text-center space-y-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto font-bold text-xl">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
          <p className="text-sm text-slate-600">
            The page you are looking for could not be found.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Go to Home</span>
        </button>
      </div>
    </section>
  );
}

export function AppErrorView({ onRetry }: { onRetry?: () => void }) {
  return (
    <section className="min-h-[58vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-5 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
          <p className="text-sm text-slate-600">Please try again after a moment.</p>
        </div>
        <button
          type="button"
          onClick={() => (onRetry ? onRetry() : window.location.reload())}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    </section>
  );
}
