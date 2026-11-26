import React, { useState } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useApp, AUTHORIZED_ADMIN_EMAIL } from '../AppContext';

export function AdminLoginView() {
  const {
    user,
    isAdmin,
    loginAdminWithEmailPassword,
    loginAdminWithGoogle,
    resendAdminVerificationEmail,
    refreshAuthUser,
    logout,
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const isAuthorizedEmailSignedInUnverified =
    Boolean(user) &&
    (user?.email || '').trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL &&
    !user?.emailVerified;

  const isUnauthorizedSignedIn =
    Boolean(user) &&
    (user?.email || '').trim().toLowerCase() !== AUTHORIZED_ADMIN_EMAIL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) {
      setErrorMessage('Invalid admin credentials.');
      return;
    }

    if (normalized !== AUTHORIZED_ADMIN_EMAIL) {
      setErrorMessage(
        'Access denied. Admin access is restricted. You are not authorized to access the Admin Panel.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await loginAdminWithEmailPassword(email.trim(), password);
      if (!res.ok) {
        setErrorMessage(res.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const res = await loginAdminWithGoogle();
      if (!res.ok) {
        setErrorMessage(res.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin) return null;

  return (
    <div className="max-w-md mx-auto py-6 sm:py-10">
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Login</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Restricted access for authorized Student Hostel administrator only.
          </p>
        </div>

        {/* Unauthorized Signed-in User Warning */}
        {isUnauthorizedSignedIn && (
          <div
            role="alert"
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 text-sm text-amber-900"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">You are not authorized to access the Admin Panel.</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Currently signed in as <strong>{user?.email}</strong>. Sign out and log in with
                  the authorized admin account.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              Sign Out Current Account
            </button>
          </div>
        )}

        {/* Email Verification Helper for Email/Password Admin Accounts */}
        {isAuthorizedEmailSignedInUnverified && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3 text-sm text-blue-900">
            <p className="font-semibold">Verify Admin Email to Unlock Dashboard</p>
            <p className="text-xs text-blue-800 leading-relaxed">
              Your account <strong>{user?.email}</strong> is signed in, but Firebase requires a
              verified email token for database security rules. Click below to send a verification
              link, or sign in directly with Google using the same admin email.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  const sent = await resendAdminVerificationEmail();
                  setLoading(false);
                  if (sent) {
                    setInfoMessage('Verification email sent. Check your inbox, then click Refresh Status.');
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                Send Verification Email
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  await refreshAuthUser();
                  setLoading(false);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-800 text-xs font-semibold hover:bg-blue-100"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2.5 text-sm text-amber-900"
          >
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {infoMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-start gap-2.5 text-sm text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Email & Password Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Authorized admin email"
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Login to Admin Panel</span>
              </>
            )}
          </button>
        </form>

        <div className="relative flex items-center">
          <div className="flex-1 border-t border-slate-200" />
          <span className="px-3 text-xs text-slate-400 font-medium">OR</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        {/* Google Sign-In option (auto-verified token for GODRIKUOP@GMAIL.COM) */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleAdminLogin}
          className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Sign In with Google (Authorized Admin)</span>
        </button>
      </div>
    </div>
  );
}
