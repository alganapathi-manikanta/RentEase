import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FiPhone, FiLock, FiHome, FiUsers } from 'react-icons/fi';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../utils/authErrors';
import { LUXURY_EASE, SMOOTH_SPRING } from '../utils/motionVariants';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const [role, setRole] = useState('tenant');
  const [form, setForm] = useState({ identifier: '', password: '', remember: true });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setForm((f) => ({ ...f, [name]: nextValue }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const identifier = String(form.identifier || '').trim();
    const password = String(form.password || '').trim();

    if (!identifier) {
      setError('Please enter your email or phone number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login({ identifier, password, role, remember: form.remember });
      console.log(`[AUTH] Login successful as ${user.role}: ${user.email || user.name}`);
      navigate(user.role === 'admin' ? '/admin' : user.role === 'landlord' ? '/landlord/dashboard' : '/tenant/wishlist');
    } catch (err) {
      console.error('[AUTH LOGIN ERROR]', err);
      setError(getAuthErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword, demoRole) => {
    setError('');
    setLoading(true);
    setRole(demoRole);
    setForm({ identifier: demoEmail, password: demoPassword, remember: true });
    try {
      const user = await login({ identifier: demoEmail, password: demoPassword, role: demoRole, remember: true });
      console.log(`[AUTH] Demo login successful as ${user.role}: ${user.email}`);
      navigate(user.role === 'admin' ? '/admin' : user.role === 'landlord' ? '/landlord/dashboard' : '/tenant/wishlist');
    } catch (err) {
      console.error('[AUTH DEMO LOGIN ERROR]', err);
      setError(getAuthErrorMessage(err, 'Demo login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section flex min-h-[calc(100vh-4.5rem)] items-center justify-center py-16">
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20, scale: shouldReduceMotion ? 1 : 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: LUXURY_EASE }}
        className="card w-full max-w-lg p-5 sm:p-8"
      >
        <h1 className="mb-1 font-display text-2xl font-bold">Welcome back</h1>
        <p className="mb-6 text-sm text-ink/60 dark:text-slate-400">Login to continue to Rent Ease.</p>

        <div className="mb-6 relative grid grid-cols-2 gap-2 rounded-full bg-surface p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setRole('tenant')}
            className={`relative z-10 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors duration-200 ${
              role === 'tenant' ? 'text-primary dark:text-white' : 'text-ink/50 dark:text-slate-400'
            }`}
          >
            {role === 'tenant' && (
              <motion.div
                layoutId="activeRoleTab"
                transition={SMOOTH_SPRING}
                className="absolute inset-0 rounded-full bg-white shadow-soft dark:bg-slate-700 -z-10"
              />
            )}
            <FiUsers size={16} /> Tenant
          </button>

          <button
            type="button"
            onClick={() => setRole('landlord')}
            className={`relative z-10 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors duration-200 ${
              role === 'landlord' ? 'text-primary dark:text-white' : 'text-ink/50 dark:text-slate-400'
            }`}
          >
            {role === 'landlord' && (
              <motion.div
                layoutId="activeRoleTab"
                transition={SMOOTH_SPRING}
                className="absolute inset-0 rounded-full bg-white shadow-soft dark:bg-slate-700 -z-10"
              />
            )}
            <FiHome size={16} /> Landlord
          </button>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.25, ease: LUXURY_EASE }}
              className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-500/10 overflow-hidden"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email or Phone Number</label>
            <div className="relative">
              <FiPhone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
              <input
                required
                type="text"
                name="identifier"
                value={form.identifier}
                onChange={handleChange}
                placeholder="you@example.com or 90000 00000"
                className="input input-with-icon"
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <FiLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
              <input
                required
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                maxLength={100}
                placeholder="••••••••"
                className="input input-with-icon pr-11"
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800 transition dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
              </motion.button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-ink/60 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={handleChange}
                className="rounded border-black/20 text-primary focus:ring-primary"
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="font-medium text-primary hover:underline">Forgot Password?</Link>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 450, damping: 24 }}
            className="btn-primary w-full !py-3 shadow-md"
          >
            {loading ? 'Signing in…' : `Login as ${role === 'tenant' ? 'Tenant' : 'Landlord'}`}
          </motion.button>
        </form>

        {/* Demo Login Credentials Section */}
        <div className="mt-8 border-t border-black/10 pt-6 dark:border-white/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-ink/70 dark:text-slate-300">
              Demo Login (Test Credentials)
            </h2>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              Instant Testing
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Landlord Demo Card */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-primary">Landlord Demo</span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Landlord</span>
              </div>
              <p className="mt-1 text-[11px] text-ink/70 dark:text-slate-300">
                <span className="font-medium text-ink/50 dark:text-slate-400">Email:</span>{' '}
                <span className="font-mono font-semibold select-all">landlord.demo@rentease.com</span>
              </p>
              <p className="text-[11px] text-ink/70 dark:text-slate-300">
                <span className="font-medium text-ink/50 dark:text-slate-400">Password:</span>{' '}
                <span className="font-mono font-semibold select-all">Landlord@123</span>
              </p>
              <motion.button
                type="button"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleDemoLogin('landlord.demo@rentease.com', 'Landlord@123', 'landlord')}
                className="mt-3 w-full rounded-lg bg-primary py-2 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
              >
                Login as Landlord
              </motion.button>
            </motion.div>

            {/* Tenant Demo Card */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 dark:border-secondary/30 dark:bg-secondary/10"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-secondary">Tenant Demo</span>
                <span className="rounded bg-secondary/10 px-1.5 py-0.5 text-[10px] font-semibold text-secondary">Tenant</span>
              </div>
              <p className="mt-1 text-[11px] text-ink/70 dark:text-slate-300">
                <span className="font-medium text-ink/50 dark:text-slate-400">Email:</span>{' '}
                <span className="font-mono font-semibold select-all">tenant.demo@rentease.com</span>
              </p>
              <p className="text-[11px] text-ink/70 dark:text-slate-300">
                <span className="font-medium text-ink/50 dark:text-slate-400">Password:</span>{' '}
                <span className="font-mono font-semibold select-all">Tenant@123</span>
              </p>
              <motion.button
                type="button"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleDemoLogin('tenant.demo@rentease.com', 'Tenant@123', 'tenant')}
                className="mt-3 w-full rounded-lg bg-secondary py-2 text-xs font-bold text-white shadow-sm transition hover:bg-secondary/90 disabled:opacity-50"
              >
                Login as Tenant
              </motion.button>
            </motion.div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-ink/60 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" state={{ from: location }} className="font-semibold text-primary hover:underline">Register</Link>
        </p>
      </motion.div>
    </div>
  );
}
