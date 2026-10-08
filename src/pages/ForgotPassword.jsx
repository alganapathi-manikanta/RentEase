import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiCheckCircle, FiArrowLeft, FiAlertCircle, FiExternalLink } from 'react-icons/fi';
import api from '../utils/api';
import { getAuthErrorMessage } from '../utils/authErrors';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: trimmed });
      setSent(true);
      if (data?.devResetUrl) {
        setDevResetUrl(data.devResetUrl);
      }
    } catch (err) {
      console.error('[AUTH FORGOT PASSWORD ERROR]', err);
      setError(getAuthErrorMessage(err, 'Failed to send reset link. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Convert absolute devResetUrl to relative path for internal router Link if it points to current origin
  const getRelativeDevPath = (url) => {
    try {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return url;
    }
  };

  return (
    <div className="section flex min-h-[calc(100vh-4.5rem)] items-center justify-center py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card w-full max-w-md p-6 sm:p-8">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <FiCheckCircle size={36} />
            </div>
            <h1 className="mb-2 font-display text-2xl font-bold text-slate-900 dark:text-white">Check your inbox</h1>
            <p className="mb-6 text-sm text-ink/70 dark:text-slate-300 leading-relaxed">
              If an account exists for <strong className="text-slate-900 dark:text-white">{email}</strong>, a password reset link has been sent. Please check your spam folder if you do not see it within a few minutes.
            </p>

            {devResetUrl && (
              <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left dark:bg-amber-500/15">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Development Mode Only
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  SMTP is unconfigured in development. Click below to proceed with password reset:
                </p>
                <Link
                  to={getRelativeDevPath(devResetUrl)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition"
                >
                  <FiExternalLink size={14} /> Open Password Reset Page
                </Link>
              </div>
            )}

            <div className="space-y-3">
              <Link to="/login" className="btn-primary w-full !py-3 flex items-center justify-center gap-2">
                <FiArrowLeft /> Back to Login
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setDevResetUrl('');
                  setEmail('');
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Send to a different email
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 text-left">
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Forgot password?</h1>
              <p className="mt-1 text-sm text-ink/60 dark:text-slate-400">
                Enter your registered Rent Ease email address and we'll send you instructions to reset your password.
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                <FiAlertCircle className="shrink-0" size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <FiMail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30 dark:text-slate-500" />
                  <input
                    required
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input pl-11"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full !py-3"
              >
                {loading ? 'Sending Reset Link…' : 'Send Reset Link'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <FiArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
