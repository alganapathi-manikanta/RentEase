import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiLock, FiMapPin, FiHome, FiUsers } from 'react-icons/fi';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../utils/authErrors';
import { LUXURY_EASE, SMOOTH_SPRING } from '../utils/motionVariants';

const initialForm = { name: '', email: '', phone: '', address: '', city: '', state: '', country: '', password: '', confirmPassword: '' };

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [role, setRole] = useState('tenant');
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const value = e.target.name === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value;
    setForm((f) => ({ ...f, [e.target.name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!/^\d{10}$/.test(form.phone)) {
      setError('Phone number must contain exactly 10 digits.');
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, role });
      navigate('/');
    } catch (err) {
      console.error('[AUTH REGISTER ERROR]', err);
      setError(getAuthErrorMessage(err, 'Registration failed. Please try again.'));
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
        <h1 className="mb-1 font-display text-2xl font-bold">Create your account</h1>
        <p className="mb-6 text-sm text-ink/60 dark:text-slate-400">Join Rent Ease as a tenant or landlord.</p>

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
                layoutId="registerActiveRole"
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
                layoutId="registerActiveRole"
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
            <label className="label">Full Name</label>
            <div className="relative">
              <FiUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
              <input required name="name" value={form.name} onChange={handleChange} placeholder="Jane Doe" className="input input-with-icon" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <FiMail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
                <input required type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className="input input-with-icon" />
              </div>
            </div>
            <div>
              <label className="label">Phone</label>
              <div className="relative">
                <FiPhone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
                <input required type="tel" name="phone" value={form.phone} onChange={handleChange} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="90000 00000" className="input input-with-icon" />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {role === 'landlord' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: LUXURY_EASE }}
                className="space-y-4 overflow-hidden"
              >
                <div>
                  <label className="label">Address</label>
                  <div className="relative">
                    <FiMapPin className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
                    <input required name="address" value={form.address} onChange={handleChange} placeholder="Street, City, State" className="input input-with-icon" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {['city', 'state', 'country'].map((field) => (
                    <div key={field}>
                      <label className="label capitalize">{field}</label>
                      <input required name={field} value={form[field]} onChange={handleChange} className="input" />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-4 sm:grid-cols-2">
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

            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
                <input
                  required
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="••••••••"
                  className="input input-with-icon pr-11"
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800 transition dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </motion.button>
              </div>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 450, damping: 24 }}
            className="btn-primary w-full !py-3 shadow-md"
          >
            {loading ? 'Creating account…' : `Register as ${role === 'tenant' ? 'Tenant' : 'Landlord'}`}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">Login</Link>
        </p>
      </motion.div>
    </div>
  );
}
