import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLock, FiCheckCircle, FiAlertCircle, FiArrowLeft, FiLoader } from 'react-icons/fi';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import api from '../utils/api';
import { getAuthErrorMessage } from '../utils/authErrors';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [tokenEmail, setTokenEmail] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setIsValidToken(false);
      setError('No password reset token was provided.');
      return;
    }

    const checkToken = async () => {
      setValidating(true);
      setError('');
      try {
        const { data } = await api.get(`/auth/reset-password/validate/${token}`);
        if (data.success) {
          setIsValidToken(true);
          if (data.email) setTokenEmail(data.email);
        } else {
          setIsValidToken(false);
          setError(data.message || 'Password reset link is invalid or has expired.');
        }
      } catch (err) {
        console.error('[AUTH RESET TOKEN VALIDATE ERROR]', err);
        setIsValidToken(false);
        setError(getAuthErrorMessage(err, 'Password reset link is invalid or has expired.'));
      } finally {
        setValidating(false);
      }
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, {
        password,
        confirmPassword,
      });

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error('[AUTH RESET PASSWORD ERROR]', err);
      setError(getAuthErrorMessage(err, 'Failed to reset password. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="section flex min-h-[calc(100vh-4.5rem)] items-center justify-center py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-md p-6 sm:p-8"
      >
        {validating ? (
          <div className="py-12 text-center">
            <FiLoader className="mx-auto mb-3 animate-spin text-primary" size={36} />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Validating reset link…
            </p>
          </div>
        ) : success ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <FiCheckCircle size={36} />
            </div>
            <h1 className="mb-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
              Password Reset Successfully
            </h1>
            <p className="mb-6 text-sm text-ink/70 dark:text-slate-300 leading-relaxed">
              Your password has been updated. You can now log in with your new password.
            </p>
            <Link
              to="/login"
              className="btn-primary w-full !py-3 flex items-center justify-center gap-2"
            >
              <FiArrowLeft /> Back to Login
            </Link>
          </div>
        ) : !isValidToken ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
              <FiAlertCircle size={36} />
            </div>
            <h1 className="mb-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
              Invalid or Expired Link
            </h1>
            <p className="mb-6 text-sm text-ink/70 dark:text-slate-300 leading-relaxed">
              {error || 'This password reset link is invalid or has expired. Password reset links are valid for 30 minutes and can only be used once.'}
            </p>
            <div className="space-y-3">
              <Link to="/forgot-password" className="btn-primary w-full !py-3">
                Request a New Link
              </Link>
              <div>
                <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <FiArrowLeft size={14} /> Back to Login
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 text-left">
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Reset your password
              </h1>
              <p className="mt-1 text-sm text-ink/60 dark:text-slate-400">
                {tokenEmail ? `Choose a new secure password for ${tokenEmail}.` : 'Choose a new secure password for your account.'}
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
                <label className="label">New Password</label>
                <div className="relative">
                  <FiLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30 dark:text-slate-500" />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    maxLength={100}
                    className="input input-with-icon pr-11"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800 transition dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Confirm New Password</label>
                <div className="relative">
                  <FiLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30 dark:text-slate-500" />
                  <input
                    required
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    maxLength={100}
                    className="input input-with-icon pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800 transition dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full !py-3"
              >
                {submitting ? 'Updating Password…' : 'Reset Password'}
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
