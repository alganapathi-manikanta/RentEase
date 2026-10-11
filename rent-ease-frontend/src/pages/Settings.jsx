import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSettings,
  FiUser,
  FiLock,
  FiMoon,
  FiSun,
  FiTv,
  FiBell,
  FiLogOut,
  FiCheck,
  FiSave,
  FiAlertCircle,
  FiCheckCircle,
  FiList,
  FiPlus,
  FiBarChart2,
  FiHeart,
  FiSearch,
  FiShield,
  FiPhone,
  FiMail,
  FiMapPin,
  FiChevronRight,
  FiRefreshCw,
} from 'react-icons/fi';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { id: 'profile', label: 'Profile', icon: FiUser },
  { id: 'security', label: 'Security', icon: FiLock },
  { id: 'appearance', label: 'Appearance', icon: FiMoon },
  { id: 'notifications', label: 'Notifications', icon: FiBell },
  { id: 'actions', label: 'Shortcuts & Session', icon: FiShield },
];

export default function Settings() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile');

  // --- Profile State ---
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    about: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Sync profileForm when user loads or updates
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        country: user.country || '',
        about: user.about || '',
      });
    }
  }, [user]);

  // --- Security / Password State ---
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNextPw, setShowNextPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [securityError, setSecurityError] = useState('');

  // --- Appearance / Theme State ---
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('rentease_theme');
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    return 'system';
  });

  useEffect(() => {
    const syncFromStorage = () => {
      const saved = localStorage.getItem('rentease_theme') || 'system';
      setThemeMode(saved);
    };
    window.addEventListener('rentease_theme_change', syncFromStorage);
    return () => window.removeEventListener('rentease_theme_change', syncFromStorage);
  }, []);

  const applyTheme = (mode) => {
    setThemeMode(mode);
    localStorage.setItem('rentease_theme', mode);

    let shouldBeDark = false;
    if (mode === 'dark') {
      shouldBeDark = true;
    } else if (mode === 'light') {
      shouldBeDark = false;
    } else {
      // system
      shouldBeDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    document.documentElement.classList.toggle('dark', shouldBeDark);
    window.dispatchEvent(new Event('rentease_theme_change'));
  };

  // --- Notifications State ---
  const defaultPrefs = {
    propertyUpdates: true,
    inquiries: true,
    wishlistAlerts: true,
    accountSecurity: true,
    marketingUpdates: false,
  };
  const [notifications, setNotifications] = useState(() => ({
    ...defaultPrefs,
    ...(user?.preferences || {}),
  }));
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState('');
  const [notifError, setNotifError] = useState('');

  useEffect(() => {
    if (user?.preferences) {
      setNotifications((prev) => ({ ...prev, ...user.preferences }));
    }
  }, [user]);

  // --- Logout Confirmation Dialog ---
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // --- Handlers ---
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const trimmedName = profileForm.name.trim();
    const trimmedPhone = profileForm.phone.trim();

    if (!trimmedName) {
      setProfileError('Full name is required.');
      return;
    }
    if (!trimmedPhone) {
      setProfileError('Phone number is required.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile({
        name: trimmedName,
        phone: trimmedPhone,
        address: profileForm.address.trim(),
        city: profileForm.city.trim(),
        state: profileForm.state.trim(),
        country: profileForm.country.trim(),
        about: profileForm.about.trim(),
      });
      setProfileSuccess('Profile updated successfully! Changes are active across your account.');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');

    if (!passwordForm.current) {
      setSecurityError('Please enter your current password.');
      return;
    }
    if (passwordForm.next.length < 6) {
      setSecurityError('New password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setSecurityError('New passwords do not match. Please verify and try again.');
      return;
    }
    if (passwordForm.current === passwordForm.next) {
      setSecurityError('New password must be different from your current password.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(passwordForm.current, passwordForm.next);
      setSecuritySuccess('Your password has been changed securely.');
      setPasswordForm({ current: '', next: '', confirm: '' });
      setTimeout(() => setSecuritySuccess(''), 4000);
    } catch (err) {
      setSecurityError(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleNotificationsSubmit = async (e) => {
    e.preventDefault();
    setNotifError('');
    setNotifSuccess('');

    setIsSavingNotifications(true);
    try {
      await updateProfile({ preferences: notifications });
      setNotifSuccess('Notification preferences saved successfully.');
      setTimeout(() => setNotifSuccess(''), 4000);
    } catch (err) {
      setNotifError(err.message || 'Failed to save notification preferences.');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleConfirmLogout = () => {
    logout();
    navigate('/');
  };

  const isLandlord = user?.role === 'landlord';
  const isTenant = user?.role === 'tenant';

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header Banner */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d4a84f]/30 bg-[#d4a84f]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#d4a84f]">
          <FiSettings size={15} /> Settings & Preferences
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-ink/60 dark:text-slate-400">
          {isLandlord
            ? 'Manage your landlord profile, property notification alerts, credentials, and luxury theme.'
            : 'Manage your tenant profile details, wishlist alerts, security, and luxury theme.'}
        </p>

        {/* User Identity Chip */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white/70 p-4 shadow-xs backdrop-blur-md dark:border-white/5 dark:bg-slate-900/70">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#102743] to-[#07152B] text-white shadow-inner">
              <span className="font-display text-lg font-bold text-[#ddbb72]">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {user?.name}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                    isLandlord
                      ? 'bg-[#d4a84f]/15 text-[#b98a3c] dark:text-[#ddbb72]'
                      : 'bg-primary/10 text-primary dark:text-[#76d7f5]'
                  }`}
                >
                  {user?.role || 'User'}
                </span>
              </div>
              <span className="text-xs text-ink/50 dark:text-slate-400">{user?.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 px-3.5 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500/10"
              title="Log out of your account"
            >
              <FiLogOut size={13} /> Log out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-black/5 pb-2 dark:border-white/5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-slate-900 text-[#ddbb72] shadow-sm dark:bg-white/10 dark:text-[#ddbb72]'
                  : 'text-ink/60 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/5'
              }`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PROFILE SETTINGS */}
      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card p-6 sm:p-8"
        >
          <div className="mb-6 border-b border-black/5 pb-4 dark:border-white/5">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Profile Information</h2>
            <p className="mt-1 text-xs text-ink/50 dark:text-slate-400">
              Update your personal details. Changes are saved directly to your account.
            </p>
          </div>

          {profileSuccess && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
              <FiCheckCircle size={18} className="shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-300">
              <FiAlertCircle size={18} className="shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Full Name */}
              <div>
                <label className="label">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="input pl-10"
                    placeholder="e.g. John Doe"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                  <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="label">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    className="input pl-10"
                    placeholder="e.g. 9876543210"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                  <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
              </div>

              {/* Email Address (Read-only) */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Email Address</label>
                  <span className="text-[11px] font-medium text-slate-400">Read-only</span>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    readOnly
                    className="input cursor-not-allowed bg-slate-100/70 pl-10 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"
                    value={user?.email || ''}
                  />
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
                <p className="mt-1 text-[11px] text-ink/40 dark:text-slate-500">
                  Email is locked to your login identity for account security.
                </p>
              </div>

              {/* Account Role (Read-only) */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Account Role</label>
                  <span className="text-[11px] font-medium text-slate-400">Fixed</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    readOnly
                    className="input cursor-not-allowed bg-slate-100/70 pl-10 text-slate-500 capitalize dark:bg-slate-800/60 dark:text-slate-400"
                    value={user?.role || ''}
                  />
                  <FiShield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
                <p className="mt-1 text-[11px] text-ink/40 dark:text-slate-500">
                  Role is assigned at registration ({user?.role}).
                </p>
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="label">Street Address</label>
                <div className="relative">
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="e.g. 104 Ocean View Residency, Linking Rd"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  />
                  <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="label">City</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Mumbai"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                />
              </div>

              {/* State */}
              <div>
                <label className="label">State / Province</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Maharashtra"
                  value={profileForm.state}
                  onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                />
              </div>

              {/* Country */}
              <div>
                <label className="label">Country</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. India"
                  value={profileForm.country}
                  onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                />
              </div>

              {/* About / Bio */}
              <div className="sm:col-span-2">
                <label className="label">About / Bio</label>
                <textarea
                  rows={3}
                  className="input"
                  placeholder={
                    isLandlord
                      ? 'Introduce yourself to tenants and outline your leasing experience...'
                      : 'Tell landlords a little about yourself...'
                  }
                  value={profileForm.about}
                  onChange={(e) => setProfileForm({ ...profileForm, about: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-black/5 pt-5 dark:border-white/5">
              <span className="text-xs text-ink/40 dark:text-slate-500">
                Registered on: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (user) {
                      setProfileForm({
                        name: user.name || '',
                        phone: user.phone || '',
                        address: user.address || '',
                        city: user.city || '',
                        state: user.state || '',
                        country: user.country || '',
                        about: user.about || '',
                      });
                      setProfileError('');
                      setProfileSuccess('');
                    }
                  }}
                  className="btn-ghost border border-black/10 px-4 py-2.5 text-xs font-semibold dark:border-white/10"
                >
                  <FiRefreshCw size={14} /> Reset
                </button>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="btn-primary inline-flex items-center gap-2 !px-6 !py-2.5 text-sm"
                >
                  {isSavingProfile ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FiSave size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      )}

      {/* TAB 2: ACCOUNT SECURITY */}
      {activeTab === 'security' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card p-6 sm:p-8"
        >
          <div className="mb-6 border-b border-black/5 pb-4 dark:border-white/5">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Account Security</h2>
            <p className="mt-1 text-xs text-ink/50 dark:text-slate-400">
              Update your account password. We verify your current credentials with secure bcrypt encryption before updating.
            </p>
          </div>

          {securitySuccess && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
              <FiCheckCircle size={18} className="shrink-0" />
              <span>{securitySuccess}</span>
            </div>
          )}

          {securityError && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-300">
              <FiAlertCircle size={18} className="shrink-0" />
              <span>{securityError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="max-w-xl space-y-5">
            {/* Current Password */}
            <div>
              <label className="label">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  required
                  className="input pr-11"
                  placeholder="Enter current password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPw ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="label">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNextPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="input pr-11"
                  placeholder="At least 6 characters"
                  value={passwordForm.next}
                  onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowNextPw((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={showNextPw ? 'Hide password' : 'Show password'}
                >
                  {showNextPw ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="label">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="input pr-11"
                  placeholder="Re-enter new password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPw ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                </button>
              </div>
            </div>

            {/* Password Requirement Notes */}
            <div className="rounded-xl border border-black/5 bg-slate-50/70 p-4 text-xs text-ink/60 dark:border-white/5 dark:bg-slate-900/60 dark:text-slate-400">
              <p className="font-semibold text-slate-900 dark:text-white">Password Requirements:</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                <li className={passwordForm.next.length >= 6 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                  Must be at least 6 characters long
                </li>
                <li
                  className={
                    passwordForm.next && passwordForm.next === passwordForm.confirm
                      ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                      : ''
                  }
                >
                  Confirmation password must match
                </li>
                <li>New password must be different from current password</li>
              </ul>
            </div>

            <div className="border-t border-black/5 pt-5 dark:border-white/5">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="btn-primary inline-flex items-center gap-2 !px-6 !py-2.5 text-sm"
              >
                {isChangingPassword ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Verifying & Updating...</span>
                  </>
                ) : (
                  <>
                    <FiLock size={16} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* TAB 3: APPEARANCE */}
      {activeTab === 'appearance' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card p-6 sm:p-8"
        >
          <div className="mb-6 border-b border-black/5 pb-4 dark:border-white/5">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Theme & Appearance</h2>
            <p className="mt-1 text-xs text-ink/50 dark:text-slate-400">
              Select how Rent Ease renders across your session. This preference synchronizes with the header theme toggle.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Light Mode Option */}
            <div
              onClick={() => applyTheme('light')}
              className={`cursor-pointer rounded-2xl border p-5 transition-all ${
                themeMode === 'light'
                  ? 'border-[#d4a84f] bg-[#d4a84f]/5 shadow-md'
                  : 'border-black/5 bg-white hover:border-black/15 dark:border-white/5 dark:bg-slate-900 dark:hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <FiSun size={22} />
                </div>
                {themeMode === 'light' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#d4a84f] px-2.5 py-0.5 text-[11px] font-bold text-slate-950">
                    <FiCheck size={12} /> Active
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-slate-900 dark:text-white">Light Mode</h3>
              <p className="mt-1 text-xs text-ink/60 dark:text-slate-400">
                Crisp, high-contrast surfaces designed for daylight readability.
              </p>
            </div>

            {/* Dark Mode Option */}
            <div
              onClick={() => applyTheme('dark')}
              className={`cursor-pointer rounded-2xl border p-5 transition-all ${
                themeMode === 'dark'
                  ? 'border-[#d4a84f] bg-[#d4a84f]/5 shadow-md'
                  : 'border-black/5 bg-white hover:border-black/15 dark:border-white/5 dark:bg-slate-900 dark:hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#07152B] text-[#76d7f5] shadow-xs">
                  <FiMoon size={22} />
                </div>
                {themeMode === 'dark' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#d4a84f] px-2.5 py-0.5 text-[11px] font-bold text-slate-950">
                    <FiCheck size={12} /> Active
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-slate-900 dark:text-white">Dark Mode</h3>
              <p className="mt-1 text-xs text-ink/60 dark:text-slate-400">
                Deep midnight navy palette with glowing champagne-gold and ice-blue accents.
              </p>
            </div>

            {/* System Default Option */}
            <div
              onClick={() => applyTheme('system')}
              className={`cursor-pointer rounded-2xl border p-5 transition-all ${
                themeMode === 'system'
                  ? 'border-[#d4a84f] bg-[#d4a84f]/5 shadow-md'
                  : 'border-black/5 bg-white hover:border-black/15 dark:border-white/5 dark:bg-slate-900 dark:hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <FiTv size={22} />
                </div>
                {themeMode === 'system' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#d4a84f] px-2.5 py-0.5 text-[11px] font-bold text-slate-950">
                    <FiCheck size={12} /> Active
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-slate-900 dark:text-white">System Preference</h3>
              <p className="mt-1 text-xs text-ink/60 dark:text-slate-400">
                Automatically synchronizes with your operating system light/dark theme.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-black/5 bg-slate-50/70 p-4 text-xs text-ink/60 dark:border-white/5 dark:bg-slate-900/60 dark:text-slate-400">
            <p>
              Current theme setting is <strong className="text-slate-900 capitalize dark:text-white">{themeMode}</strong>.
              Your choice is persisted locally and applied instantly without requiring a page reload.
            </p>
          </div>
        </motion.div>
      )}

      {/* TAB 4: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card p-6 sm:p-8"
        >
          <div className="mb-6 border-b border-black/5 pb-4 dark:border-white/5">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Notification Preferences</h2>
            <p className="mt-1 text-xs text-ink/50 dark:text-slate-400">
              Customize real-time in-app dashboard alerts for your account and listings.
            </p>
          </div>

          {notifSuccess && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
              <FiCheckCircle size={18} className="shrink-0" />
              <span>{notifSuccess}</span>
            </div>
          )}

          {notifError && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-300">
              <FiAlertCircle size={18} className="shrink-0" />
              <span>{notifError}</span>
            </div>
          )}

          <form onSubmit={handleNotificationsSubmit} className="space-y-4">
            {/* Preference Items Tailored to Role */}
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {/* Item 1: Inquiries / Applications */}
              <div className="flex items-center justify-between py-4">
                <div className="pr-4">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    {isLandlord ? 'Tenant Inquiry Notifications' : 'Landlord Inquiries & Responses'}
                  </h3>
                  <p className="mt-0.5 text-xs text-ink/60 dark:text-slate-400">
                    {isLandlord
                      ? 'Receive instant alerts when prospective tenants send inquiries regarding your properties.'
                      : 'Receive alerts when landlords reply to your property inquiries.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifications({ ...notifications, inquiries: !notifications.inquiries })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifications.inquiries ? 'bg-[#d4a84f]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-pressed={notifications.inquiries}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      notifications.inquiries ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Item 2: Property Updates / Approvals or Wishlist Alerts */}
              <div className="flex items-center justify-between py-4">
                <div className="pr-4">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    {isLandlord ? 'Property Listing Status Updates' : 'Wishlist Price & Availability Alerts'}
                  </h3>
                  <p className="mt-0.5 text-xs text-ink/60 dark:text-slate-400">
                    {isLandlord
                      ? 'Alerts when your properties are reviewed, approved, or published.'
                      : 'Get notified if properties in your wishlist update their rent price or become unavailable.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotifications({
                      ...notifications,
                      [isLandlord ? 'propertyUpdates' : 'wishlistAlerts']: !notifications[
                        isLandlord ? 'propertyUpdates' : 'wishlistAlerts'
                      ],
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifications[isLandlord ? 'propertyUpdates' : 'wishlistAlerts']
                      ? 'bg-[#d4a84f]'
                      : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-pressed={notifications[isLandlord ? 'propertyUpdates' : 'wishlistAlerts']}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      notifications[isLandlord ? 'propertyUpdates' : 'wishlistAlerts'] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Item 3: Account Security Alerts */}
              <div className="flex items-center justify-between py-4">
                <div className="pr-4">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    Security & Sign-in Alerts
                  </h3>
                  <p className="mt-0.5 text-xs text-ink/60 dark:text-slate-400">
                    Receive safety notifications about password updates, new browser logins, or session revocations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifications({ ...notifications, accountSecurity: !notifications.accountSecurity })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifications.accountSecurity ? 'bg-[#d4a84f]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-pressed={notifications.accountSecurity}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      notifications.accountSecurity ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Item 4: Marketing / Platform Tips */}
              <div className="flex items-center justify-between py-4">
                <div className="pr-4">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    Platform Updates & Real-Estate Digest
                  </h3>
                  <p className="mt-0.5 text-xs text-ink/60 dark:text-slate-400">
                    Occasional announcements on new platform tools, 3D visualization enhancements, and rental guidelines.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotifications({ ...notifications, marketingUpdates: !notifications.marketingUpdates })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifications.marketingUpdates ? 'bg-[#d4a84f]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-pressed={notifications.marketingUpdates}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      notifications.marketingUpdates ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-black/5 bg-slate-50/70 p-4 text-xs text-ink/60 dark:border-white/5 dark:bg-slate-900/60 dark:text-slate-400">
              <p>
                <strong>Privacy Note:</strong> Rent Ease delivers alerts strictly inside your authenticated account panel.
                We never sell or disclose your phone number or email to third-party ad networks.
              </p>
            </div>

            <div className="border-t border-black/5 pt-5 dark:border-white/5">
              <button
                type="submit"
                disabled={isSavingNotifications}
                className="btn-primary inline-flex items-center gap-2 !px-6 !py-2.5 text-sm"
              >
                {isSavingNotifications ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Saving Preferences...</span>
                  </>
                ) : (
                  <>
                    <FiSave size={16} />
                    <span>Save Preferences</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* TAB 5: SHORTCUTS & ACCOUNT ACTIONS */}
      {activeTab === 'actions' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Role-Specific Quick Shortcuts Card */}
          <div className="card p-6 sm:p-8">
            <div className="mb-6 border-b border-black/5 pb-4 dark:border-white/5">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                {isLandlord ? 'Landlord Dashboard Shortcuts' : 'Tenant Quick Shortcuts'}
              </h2>
              <p className="mt-1 text-xs text-ink/50 dark:text-slate-400">
                Direct access to your core workspace features and tools.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {isLandlord ? (
                <>
                  <Link
                    to="/landlord/posted-properties"
                    className="group flex items-center justify-between rounded-2xl border border-black/5 p-4 transition hover:border-[#d4a84f] hover:bg-black/[0.02] dark:border-white/5 dark:hover:border-[#d4a84f] dark:hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4a84f]/15 text-[#b98a3c] dark:text-[#ddbb72]">
                        <FiList size={18} />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-[#b98a3c] dark:text-white dark:group-hover:text-[#ddbb72]">
                          Manage Posted Properties
                        </h3>
                        <p className="text-xs text-ink/50 dark:text-slate-400">View, edit, or remove listings</p>
                      </div>
                    </div>
                    <FiChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    to="/landlord/add-property"
                    className="group flex items-center justify-between rounded-2xl border border-black/5 p-4 transition hover:border-[#d4a84f] hover:bg-black/[0.02] dark:border-white/5 dark:hover:border-[#d4a84f] dark:hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-[#76d7f5]">
                        <FiPlus size={18} />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-primary dark:text-white dark:group-hover:text-[#76d7f5]">
                          Add New Property
                        </h3>
                        <p className="text-xs text-ink/50 dark:text-slate-400">Publish a new apartment or home</p>
                      </div>
                    </div>
                    <FiChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    to="/landlord/reports"
                    className="group flex items-center justify-between rounded-2xl border border-black/5 p-4 transition hover:border-[#d4a84f] hover:bg-black/[0.02] dark:border-white/5 dark:hover:border-[#d4a84f] dark:hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <FiBarChart2 size={18} />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-emerald-600 dark:text-white">
                          Listing Performance & Reports
                        </h3>
                        <p className="text-xs text-ink/50 dark:text-slate-400">Occupancy and analytics</p>
                      </div>
                    </div>
                    <FiChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    to="/landlord/profile"
                    className="group flex items-center justify-between rounded-2xl border border-black/5 p-4 transition hover:border-[#d4a84f] hover:bg-black/[0.02] dark:border-white/5 dark:hover:border-[#d4a84f] dark:hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <FiUser size={18} />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-purple-600 dark:text-white">
                          Public Landlord Profile
                        </h3>
                        <p className="text-xs text-ink/50 dark:text-slate-400">View public profile page</p>
                      </div>
                    </div>
                    <FiChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/tenant/wishlist"
                    className="group flex items-center justify-between rounded-2xl border border-black/5 p-4 transition hover:border-[#d4a84f] hover:bg-black/[0.02] dark:border-white/5 dark:hover:border-[#d4a84f] dark:hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                        <FiHeart size={18} />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-red-500 dark:text-white">
                          Saved Wishlist
                        </h3>
                        <p className="text-xs text-ink/50 dark:text-slate-400">View and track favorite properties</p>
                      </div>
                    </div>
                    <FiChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    to="/search"
                    className="group flex items-center justify-between rounded-2xl border border-black/5 p-4 transition hover:border-[#d4a84f] hover:bg-black/[0.02] dark:border-white/5 dark:hover:border-[#d4a84f] dark:hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-[#76d7f5]">
                        <FiSearch size={18} />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-primary dark:text-white dark:group-hover:text-[#76d7f5]">
                          Search Available Properties
                        </h3>
                        <p className="text-xs text-ink/50 dark:text-slate-400">Explore houses, apartments, and villas</p>
                      </div>
                    </div>
                    <FiChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    to="/tenant/profile"
                    className="group flex items-center justify-between rounded-2xl border border-black/5 p-4 transition hover:border-[#d4a84f] hover:bg-black/[0.02] dark:border-white/5 dark:hover:border-[#d4a84f] dark:hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <FiUser size={18} />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-purple-600 dark:text-white">
                          Tenant Profile View
                        </h3>
                        <p className="text-xs text-ink/50 dark:text-slate-400">View public profile page</p>
                      </div>
                    </div>
                    <FiChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Account Actions & Logout Card */}
          <div className="card p-6 sm:p-8">
            <div className="mb-6 border-b border-black/5 pb-4 dark:border-white/5">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Session & Sign Out</h2>
              <p className="mt-1 text-xs text-ink/50 dark:text-slate-400">
                Safely end your session on this browser.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-50/50 p-4 dark:border-red-500/20 dark:bg-red-950/20">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">End Active Session</h4>
                <p className="text-xs text-ink/60 dark:text-slate-400">
                  You will need your password to log back into Rent Ease.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-700"
              >
                <FiLogOut size={14} /> Log out of Rent Ease
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setShowLogoutConfirm(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="relative z-10 w-full max-w-sm card p-6 text-center shadow-2xl border border-black/10 dark:border-white/10"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                <FiLogOut size={26} />
              </div>

              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Log Out of Rent Ease?
              </h3>
              <p className="mt-2 text-xs text-ink/60 dark:text-slate-400">
                Are you sure you want to sign out of your account? You will need to log back in to access your dashboard.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="btn-ghost flex-1 border border-black/10 text-xs font-semibold dark:border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogout}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-red-700"
                >
                  Yes, Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
