import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiShield,
  FiHome,
  FiUsers,
  FiEye,
  FiEyeOff,
  FiSearch,
  FiCheckCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiLogOut,
  FiPhone,
  FiMail,
  FiMapPin,
  FiDollarSign,
  FiGrid,
  FiSlash,
  FiCheck,
  FiX,
  FiUserCheck,
  FiUserX,
  FiExternalLink,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import BrandLogo from '../../components/BrandLogo';
import DarkModeToggle from '../../components/DarkModeToggle';
import MediaPlaceholder from '../../components/MediaPlaceholder';
import { resolveMediaUrl } from '../../utils/media';
import { getPropertyPricing } from '../../utils/propertyPricing';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'properties' | 'hidden' | 'users'
  const [stats, setStats] = useState(null);
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Property Filters
  const [propSearch, setPropSearch] = useState('');
  const [propStatusFilter, setPropStatusFilter] = useState('all'); // 'all' | 'active' | 'hidden'

  // User Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all'); // 'all' | 'tenant' | 'landlord' | 'admin'

  // Action Dialog state
  const [actionDialog, setActionDialog] = useState(null);
  // Inspect property state
  const [inspectProperty, setInspectProperty] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await api.get('/admin/properties');
      if (res.data?.success) {
        setProperties(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin properties:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data?.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchProperties(), fetchUsers()]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchProperties(), fetchUsers()]);
    setRefreshing(false);
    showFeedback('success', 'Admin data refreshed successfully.');
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Property Actions
  const handleHideProperty = async (property) => {
    try {
      const res = await api.put(`/admin/properties/${property._id || property.id}/hide`);
      if (res.data?.success) {
        showFeedback('success', res.data.message || `Property "${property.title}" is now hidden.`);
        await Promise.all([fetchProperties(), fetchStats()]);
      }
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to hide property.');
    } finally {
      setActionDialog(null);
    }
  };

  const handleRestoreProperty = async (property) => {
    try {
      const res = await api.put(`/admin/properties/${property._id || property.id}/restore`);
      if (res.data?.success) {
        showFeedback('success', res.data.message || `Property "${property.title}" has been restored.`);
        await Promise.all([fetchProperties(), fetchStats()]);
      }
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to restore property.');
    } finally {
      setActionDialog(null);
    }
  };

  // User Actions
  const handleToggleBlockUser = async (targetUser) => {
    try {
      const res = await api.put(`/admin/users/${targetUser._id || targetUser.id}/toggle-block`);
      if (res.data?.success) {
        showFeedback('success', res.data.message);
        await Promise.all([fetchUsers(), fetchStats()]);
      }
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to update user status.');
    } finally {
      setActionDialog(null);
    }
  };

  // Filtered Properties
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      // Tab filter
      if (activeTab === 'hidden' && p.isActive !== false) return false;
      if (activeTab === 'properties') {
        if (propStatusFilter === 'active' && p.isActive === false) return false;
        if (propStatusFilter === 'hidden' && p.isActive !== false) return false;
      }

      // Search filter
      if (propSearch.trim()) {
        const query = propSearch.toLowerCase().trim();
        const titleMatch = (p.title || '').toLowerCase().includes(query);
        const cityMatch = (p.city || '').toLowerCase().includes(query);
        const areaMatch = (p.area || '').toLowerCase().includes(query);
        const landlordNameMatch = (p.ownerName || p.landlord?.name || '').toLowerCase().includes(query);
        const landlordPhoneMatch = (p.ownerPhone || p.landlord?.phone || '').includes(query);
        if (!titleMatch && !cityMatch && !areaMatch && !landlordNameMatch && !landlordPhoneMatch) {
          return false;
        }
      }
      return true;
    });
  }, [properties, activeTab, propStatusFilter, propSearch]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (userSearch.trim()) {
        const query = userSearch.toLowerCase().trim();
        const nameMatch = (u.name || '').toLowerCase().includes(query);
        const emailMatch = (u.email || '').toLowerCase().includes(query);
        const phoneMatch = (u.phone || '').includes(query);
        const cityMatch = (u.city || '').toLowerCase().includes(query);
        if (!nameMatch && !emailMatch && !phoneMatch && !cityMatch) return false;
      }
      return true;
    });
  }, [users, userRoleFilter, userSearch]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 transition-colors dark:bg-[#0b1320] dark:text-slate-100">
      {/* Back-Office Top Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-[#13253b] px-4 py-3.5 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <BrandLogo tone="inverse" size="navbar" />
            <div className="hidden h-6 w-px bg-white/20 md:block" />
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-[#d4a84f]/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#d4a84f]">
              <FiShield className="shrink-0" /> Back-Office Admin
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-slate-300 md:inline">
              Logged in as <strong className="text-white">{user?.name || 'Administrator'}</strong> ({user?.email})
            </span>
            <DarkModeToggle className="text-white" />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh Data"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={15} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 sm:px-3 text-xs font-medium text-red-300 transition hover:bg-red-500 hover:text-white"
            >
              <FiLogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Feedback Banner */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium shadow-sm ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                  : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? <FiCheckCircle size={18} /> : <FiAlertTriangle size={18} />}
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="text-current opacity-70 hover:opacity-100">
                <FiX size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Controls */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-4 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'overview', label: 'Dashboard / Statistics', icon: FiGrid },
              { id: 'properties', label: `Manage Properties (${stats?.totalProperties ?? properties.length})`, icon: FiHome },
              { id: 'hidden', label: `Hidden Listings (${stats?.hiddenProperties ?? properties.filter(p => p.isActive === false).length})`, icon: FiEyeOff },
              { id: 'users', label: `Manage Users (${stats?.totalUsers ?? users.length})`, icon: FiUsers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-[#13253b] text-white shadow-sm dark:bg-[#d4a84f] dark:text-slate-900'
                      : 'bg-white text-ink/70 hover:bg-ink/5 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-ink/60 hover:text-primary dark:text-slate-400 dark:hover:text-[#d4a84f]"
          >
            <FiExternalLink size={13} /> View Public Website
          </Link>
        </div>

        {/* ================= TAB 1: OVERVIEW / STATISTICS ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stat Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-ink/50 dark:text-slate-400">Total Properties</p>
                    <p className="mt-1 text-2xl font-bold">{stats?.totalProperties ?? 0}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-[#d4a84f]/10 dark:text-[#d4a84f]">
                    <FiHome size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-ink/5 pt-3 text-xs dark:border-white/5">
                  <span className="text-emerald-600 font-medium dark:text-emerald-400">
                    {stats?.activeProperties ?? 0} Visible
                  </span>
                  <span className="text-amber-600 font-medium dark:text-amber-400">
                    {stats?.hiddenProperties ?? 0} Hidden
                  </span>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-ink/50 dark:text-slate-400">Active Listings</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {stats?.activeProperties ?? 0}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <FiCheckCircle size={20} />
                  </div>
                </div>
                <p className="mt-4 border-t border-ink/5 pt-3 text-xs text-ink/50 dark:border-white/5 dark:text-slate-400">
                  Visible to public search & homepage
                </p>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-ink/50 dark:text-slate-400">Hidden / Removed Listings</p>
                    <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {stats?.hiddenProperties ?? 0}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <FiEyeOff size={20} />
                  </div>
                </div>
                <p className="mt-4 border-t border-ink/5 pt-3 text-xs text-ink/50 dark:border-white/5 dark:text-slate-400">
                  Soft-deleted / hidden by admin
                </p>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-ink/50 dark:text-slate-400">Total Users</p>
                    <p className="mt-1 text-2xl font-bold">{stats?.totalUsers ?? 0}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <FiUsers size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-ink/5 pt-3 text-xs text-ink/50 dark:border-white/5 dark:text-slate-400">
                  <span>{stats?.totalLandlords ?? 0} Landlords</span>
                  <span>{stats?.totalTenants ?? 0} Tenants</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Policy Notice */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="card p-6">
                <h3 className="font-display text-base font-semibold mb-3 flex items-center gap-2">
                  <FiShield className="text-[#d4a84f]" /> Back-Office Governance Guidelines
                </h3>
                <ul className="space-y-2 text-sm text-ink/70 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold dark:text-[#d4a84f]">•</span>
                    <span><strong>Soft-Delete Protection:</strong> Listings hidden by Admin remain preserved in MongoDB and can be restored at any time.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold dark:text-[#d4a84f]">•</span>
                    <span><strong>Public API Filtering:</strong> Inactive properties are strictly excluded from public listing endpoints and search results.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold dark:text-[#d4a84f]">•</span>
                    <span><strong>Password Security:</strong> User passwords and hashes remain encrypted and strictly inaccessible in the admin panel.</span>
                  </li>
                </ul>
              </div>

              <div className="card p-6">
                <h3 className="font-display text-base font-semibold mb-3 flex items-center gap-2">
                  <FiGrid className="text-primary dark:text-[#d4a84f]" /> Quick Management Links
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setActiveTab('properties'); setPropStatusFilter('all'); }}
                    className="flex flex-col items-start gap-1 rounded-xl border border-ink/10 p-3.5 text-left transition hover:border-primary/40 hover:bg-primary/5 dark:border-white/10 dark:hover:border-[#d4a84f]/40 dark:hover:bg-[#d4a84f]/5"
                  >
                    <span className="text-sm font-semibold">All Properties</span>
                    <span className="text-xs text-ink/50 dark:text-slate-400">{properties.length} total entries</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('hidden'); }}
                    className="flex flex-col items-start gap-1 rounded-xl border border-ink/10 p-3.5 text-left transition hover:border-amber-500/40 hover:bg-amber-500/5 dark:border-white/10 dark:hover:border-amber-400/40"
                  >
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Review Hidden</span>
                    <span className="text-xs text-ink/50 dark:text-slate-400">{properties.filter(p => p.isActive === false).length} hidden listings</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('users'); setUserRoleFilter('landlord'); }}
                    className="flex flex-col items-start gap-1 rounded-xl border border-ink/10 p-3.5 text-left transition hover:border-primary/40 hover:bg-primary/5 dark:border-white/10"
                  >
                    <span className="text-sm font-semibold">Landlords</span>
                    <span className="text-xs text-ink/50 dark:text-slate-400">{stats?.totalLandlords ?? 0} registered</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('users'); setUserRoleFilter('tenant'); }}
                    className="flex flex-col items-start gap-1 rounded-xl border border-ink/10 p-3.5 text-left transition hover:border-primary/40 hover:bg-primary/5 dark:border-white/10"
                  >
                    <span className="text-sm font-semibold">Tenants</span>
                    <span className="text-xs text-ink/50 dark:text-slate-400">{stats?.totalTenants ?? 0} registered</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2 & 3: MANAGE PROPERTIES / HIDDEN LISTINGS ================= */}
        {(activeTab === 'properties' || activeTab === 'hidden') && (
          <div className="space-y-6">
            {/* Search and Filters Bar */}
            <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="relative min-w-[280px] flex-1">
                <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title, city, area, landlord name, phone..."
                  value={propSearch}
                  onChange={(e) => setPropSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>

              {activeTab === 'properties' && (
                <div className="flex items-center gap-1.5 rounded-xl bg-surface p-1 dark:bg-slate-800">
                  {['all', 'active', 'hidden'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setPropStatusFilter(status)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                        propStatusFilter === status
                          ? 'bg-white text-primary shadow-xs dark:bg-slate-700 dark:text-white'
                          : 'text-ink/60 hover:text-ink dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Properties Table / List */}
            {loading ? (
              <div className="card py-16 text-center text-sm text-ink/60 dark:text-slate-400">
                <FiRefreshCw className="mx-auto mb-2 animate-spin text-primary" size={24} />
                Loading properties...
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="card py-16 text-center">
                <FiHome className="mx-auto mb-3 text-ink/30 dark:text-slate-600" size={36} />
                <h4 className="text-base font-semibold">No properties found</h4>
                <p className="mt-1 text-sm text-ink/60 dark:text-slate-400">
                  {propSearch ? 'Try a different search query.' : 'There are no properties matching this filter.'}
                </p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-ink/10 bg-surface/50 text-xs font-semibold uppercase text-ink/60 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-400">
                      <tr>
                        <th className="px-5 py-3.5">Property</th>
                        <th className="px-5 py-3.5">Type & Price</th>
                        <th className="px-5 py-3.5">Location</th>
                        <th className="px-5 py-3.5">Landlord Contact</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5 dark:divide-white/5">
                      {filteredProperties.map((p) => {
                        const isHidden = p.isActive === false;
                        const firstPhoto = Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : null;
                        const landlordPhone = p.landlord?.phone || p.ownerPhone || '';
                        const landlordName = p.landlord?.name || p.ownerName || 'Unknown';

                        return (
                          <tr key={p._id || p.id} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                            {/* Property Column */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                                  {firstPhoto ? (
                                    <img
                                      src={resolveMediaUrl(firstPhoto)}
                                      alt={p.title}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <MediaPlaceholder type={p.type} className="h-full w-full" />
                                  )}
                                </div>
                                <div className="max-w-[220px]">
                                  <p className="font-semibold text-ink line-clamp-1 dark:text-white" title={p.title}>
                                    {p.title}
                                  </p>
                                  <p className="text-xs text-ink/50 dark:text-slate-400">
                                    ID: <span className="font-mono">{String(p._id || p.id).slice(-6)}</span>
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Type & Price */}
                            {(() => {
                              const pPricing = getPropertyPricing(p);
                              return (
                                <td className="px-5 py-4">
                                  <p className="font-semibold text-primary dark:text-[#d4a84f]">
                                    {pPricing.cardPriceDisplay}
                                  </p>
                                  <span className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary dark:bg-[#d4a84f]/15 dark:text-[#d4a84f]">
                                    {p.type} • {pPricing.badgeText}
                                  </span>
                                </td>
                              );
                            })()}

                            {/* Location */}
                            <td className="px-5 py-4 text-xs text-ink/70 dark:text-slate-300">
                              <p className="font-medium text-ink dark:text-white">{p.city}</p>
                              <p className="text-ink/50 dark:text-slate-400">{p.area || p.address || '—'}</p>
                            </td>

                            {/* Landlord Contact */}
                            <td className="px-5 py-4 text-xs">
                              <p className="font-semibold text-ink dark:text-white">{landlordName}</p>
                              {landlordPhone ? (
                                <p className="flex items-center gap-1 font-mono text-ink/60 dark:text-slate-400">
                                  <FiPhone size={11} className="text-primary" /> {landlordPhone}
                                </p>
                              ) : (
                                <p className="text-ink/40 dark:text-slate-500">No phone</p>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4">
                              {isHidden ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                  <FiEyeOff size={12} /> Hidden
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                  <FiCheckCircle size={12} /> Active
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setInspectProperty(p)}
                                  className="rounded-lg border border-ink/10 px-2.5 py-1.5 text-xs font-medium text-ink/70 transition hover:bg-ink/5 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                                  title="Inspect full property details"
                                >
                                  Inspect
                                </button>

                                {isHidden ? (
                                  <button
                                    onClick={() =>
                                      setActionDialog({
                                        type: 'restoreProperty',
                                        data: p,
                                        title: 'Restore Property to Public Website?',
                                        message: `Are you sure you want to restore "${p.title}"? It will immediately become visible to all tenants and visitors on the public website.`,
                                        confirmText: 'Restore Property',
                                        confirmColor: 'emerald',
                                      })
                                    }
                                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
                                  >
                                    <FiCheck size={13} /> Restore
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      setActionDialog({
                                        type: 'hideProperty',
                                        data: p,
                                        title: 'Hide Property from Public Website?',
                                        message: `Are you sure you want to hide "${p.title}"? It will be removed from public search results, recommendations, and homepage listings, but will remain safely stored in the database.`,
                                        confirmText: 'Hide Property',
                                        confirmColor: 'amber',
                                      })
                                    }
                                    className="flex items-center gap-1 rounded-lg border border-amber-600/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-600 hover:text-white dark:text-amber-300"
                                  >
                                    <FiEyeOff size={13} /> Hide Property
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: MANAGE USERS ================= */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Role Filter Bar */}
            <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="relative min-w-[280px] flex-1">
                <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user by name, email, phone, city..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-surface p-1 dark:bg-slate-800">
                {['all', 'tenant', 'landlord', 'admin'].map((role) => (
                  <button
                    key={role}
                    onClick={() => setUserRoleFilter(role)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                      userRoleFilter === role
                        ? 'bg-white text-primary shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-ink/60 hover:text-ink dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            {loading ? (
              <div className="card py-16 text-center text-sm text-ink/60 dark:text-slate-400">
                <FiRefreshCw className="mx-auto mb-2 animate-spin text-primary" size={24} />
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="card py-16 text-center">
                <FiUsers className="mx-auto mb-3 text-ink/30 dark:text-slate-600" size={36} />
                <h4 className="text-base font-semibold">No users found</h4>
                <p className="mt-1 text-sm text-ink/60 dark:text-slate-400">
                  {userSearch ? 'Try a different search query.' : 'There are no users with this role filter.'}
                </p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-ink/10 bg-surface/50 text-xs font-semibold uppercase text-ink/60 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-400">
                      <tr>
                        <th className="px-5 py-3.5">User</th>
                        <th className="px-5 py-3.5">Contact</th>
                        <th className="px-5 py-3.5">Role</th>
                        <th className="px-5 py-3.5">Location</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Moderation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5 dark:divide-white/5">
                      {filteredUsers.map((u) => {
                        const isSelf = (user?._id || user?.id) === (u._id || u.id);
                        const isAdminUser = u.role === 'admin';

                        return (
                          <tr key={u._id || u.id} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                            {/* User Name */}
                            <td className="px-5 py-4">
                              <p className="font-semibold text-ink dark:text-white">
                                {u.name} {isSelf && <span className="ml-1 text-xs text-primary font-normal">(You)</span>}
                              </p>
                              <p className="text-xs text-ink/50 dark:text-slate-400 font-mono">
                                ID: {String(u._id || u.id).slice(-6)}
                              </p>
                            </td>

                            {/* Contact: Email & Phone */}
                            <td className="px-5 py-4 text-xs">
                              <p className="flex items-center gap-1.5 font-medium text-ink dark:text-white">
                                <FiMail className="shrink-0 text-ink/40" /> {u.email}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1.5 font-mono text-ink/60 dark:text-slate-400">
                                <FiPhone className="shrink-0 text-primary" /> {u.phone || 'No phone'}
                              </p>
                            </td>

                            {/* Role Badge */}
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                  u.role === 'admin'
                                    ? 'bg-[#d4a84f]/20 text-[#d4a84f] border border-[#d4a84f]/30'
                                    : u.role === 'landlord'
                                    ? 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                                    : 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                }`}
                              >
                                {u.role === 'admin' && <FiShield size={11} />}
                                {u.role}
                              </span>
                            </td>

                            {/* Location */}
                            <td className="px-5 py-4 text-xs text-ink/70 dark:text-slate-300">
                              {u.city ? `${u.city}${u.state ? `, ${u.state}` : ''}` : '—'}
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4">
                              {u.isBlocked ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-500/20 dark:text-red-400">
                                  <FiUserX size={12} /> Suspended
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                  <FiUserCheck size={12} /> Active
                                </span>
                              )}
                            </td>

                            {/* Moderation Actions */}
                            <td className="px-5 py-4 text-right">
                              {isAdminUser ? (
                                <span className="text-xs text-ink/40 dark:text-slate-500">Protected</span>
                              ) : (
                                <button
                                  onClick={() =>
                                    setActionDialog({
                                      type: 'toggleBlockUser',
                                      data: u,
                                      title: u.isBlocked ? 'Reactivate User Account?' : 'Suspend User Account?',
                                      message: u.isBlocked
                                        ? `Are you sure you want to reactivate "${u.name}" (${u.email})? They will be able to log in and use Rent Ease again.`
                                        : `Are you sure you want to suspend "${u.name}" (${u.email})? They will be immediately blocked from logging in.`,
                                      confirmText: u.isBlocked ? 'Reactivate Account' : 'Suspend Account',
                                      confirmColor: u.isBlocked ? 'emerald' : 'red',
                                    })
                                  }
                                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                    u.isBlocked
                                      ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/20'
                                      : 'border border-red-500/30 text-red-600 hover:bg-red-500 hover:text-white dark:text-red-400'
                                  }`}
                                >
                                  {u.isBlocked ? 'Reactivate' : 'Suspend'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirmation Action Modal */}
      <AnimatePresence>
        {actionDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setActionDialog(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card relative z-10 w-full max-w-md p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    actionDialog.confirmColor === 'red'
                      ? 'bg-red-500/10 text-red-600 dark:bg-red-500/20'
                      : actionDialog.confirmColor === 'emerald'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20'
                  }`}
                >
                  <FiAlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-base">{actionDialog.title}</h3>
                </div>
              </div>

              <p className="mb-6 text-sm text-ink/70 dark:text-slate-300 leading-relaxed">
                {actionDialog.message}
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActionDialog(null)}
                  className="rounded-lg border border-ink/10 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5 dark:border-white/10 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (actionDialog.type === 'hideProperty') handleHideProperty(actionDialog.data);
                    else if (actionDialog.type === 'restoreProperty') handleRestoreProperty(actionDialog.data);
                    else if (actionDialog.type === 'toggleBlockUser') handleToggleBlockUser(actionDialog.data);
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                    actionDialog.confirmColor === 'red'
                      ? 'bg-red-600 hover:bg-red-700'
                      : actionDialog.confirmColor === 'emerald'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {actionDialog.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Property Details Inspection Modal */}
      <AnimatePresence>
        {inspectProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setInspectProperty(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-ink/10 pb-3 dark:border-white/10">
                <div>
                  <h3 className="font-display text-lg font-bold">{inspectProperty.title}</h3>
                  <p className="text-xs text-ink/50 dark:text-slate-400">
                    ID: {inspectProperty._id || inspectProperty.id} • {inspectProperty.type} ({getPropertyPricing(inspectProperty).badgeText})
                  </p>
                </div>
                <button
                  onClick={() => setInspectProperty(null)}
                  className="rounded-lg p-1.5 text-ink/50 hover:bg-ink/5 dark:text-slate-400 dark:hover:bg-white/5"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-surface p-4 dark:bg-slate-800/60">
                  <div>
                    <span className="text-xs text-ink/50 dark:text-slate-400">
                      {getPropertyPricing(inspectProperty).isSale ? 'Sale Price' : getPropertyPricing(inspectProperty).isBoth ? 'Sale / Rent' : 'Monthly Rent'}
                    </span>
                    <p className="font-semibold text-primary dark:text-[#d4a84f]">
                      {getPropertyPricing(inspectProperty).cardPriceDisplay}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-ink/50 dark:text-slate-400">Public Visibility</span>
                    <p className="font-semibold">
                      {inspectProperty.isActive === false ? (
                        <span className="text-amber-600 dark:text-amber-400">Hidden from Public</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">Active & Published</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-ink/50 dark:text-slate-400">Location</span>
                    <p className="font-semibold">{inspectProperty.city}, {inspectProperty.area}</p>
                    <p className="text-xs text-ink/50 dark:text-slate-400">{inspectProperty.address}</p>
                  </div>
                  <div>
                    <span className="text-xs text-ink/50 dark:text-slate-400">Associated Landlord</span>
                    <p className="font-semibold">{inspectProperty.landlord?.name || inspectProperty.ownerName}</p>
                    <p className="font-mono text-xs text-primary">{inspectProperty.landlord?.phone || inspectProperty.ownerPhone}</p>
                  </div>
                </div>

                {inspectProperty.description && (
                  <div>
                    <span className="text-xs font-semibold text-ink/60 dark:text-slate-400">Description</span>
                    <p className="mt-1 text-xs text-ink/80 dark:text-slate-300 leading-relaxed">
                      {inspectProperty.description}
                    </p>
                  </div>
                )}

                {Array.isArray(inspectProperty.photos) && inspectProperty.photos.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-ink/60 dark:text-slate-400">
                      Listing Photos ({inspectProperty.photos.length})
                    </span>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                      {inspectProperty.photos.map((photo, i) => (
                        <img
                          key={i}
                          src={resolveMediaUrl(photo)}
                          alt={`Photo ${i + 1}`}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                          className="h-20 w-28 shrink-0 rounded-lg object-cover border border-ink/10 dark:border-white/10"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-ink/10 pt-4 dark:border-white/10">
                <button
                  onClick={() => setInspectProperty(null)}
                  className="rounded-lg border border-ink/10 px-4 py-2 text-sm font-medium text-ink/70 dark:border-white/10 dark:text-slate-300"
                >
                  Close
                </button>
                {inspectProperty.isActive !== false ? (
                  <button
                    onClick={() => {
                      const prop = inspectProperty;
                      setInspectProperty(null);
                      setActionDialog({
                        type: 'hideProperty',
                        data: prop,
                        title: 'Hide Property from Public Website?',
                        message: `Are you sure you want to hide "${prop.title}"?`,
                        confirmText: 'Hide Property',
                        confirmColor: 'amber',
                      });
                    }}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
                  >
                    Hide Property
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const prop = inspectProperty;
                      setInspectProperty(null);
                      setActionDialog({
                        type: 'restoreProperty',
                        data: prop,
                        title: 'Restore Property?',
                        message: `Are you sure you want to restore "${prop.title}"?`,
                        confirmText: 'Restore Property',
                        confirmColor: 'emerald',
                      });
                    }}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    Restore Property
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
