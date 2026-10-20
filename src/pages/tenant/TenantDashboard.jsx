import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FiSearch } from 'react-icons/fi';
import PropertyCard from '../../components/PropertyCard';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { PROPERTY_TYPES } from '../../data/mockData';
import { LUXURY_EASE } from '../../utils/motionVariants';

export default function TenantDashboard() {
  const { user } = useAuth();
  const { properties } = useAppData();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const shouldReduceMotion = useReducedMotion();

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (p.isPublished === false) return false;
      if (type && p.type !== type) return false;
      if (query && !(`${p.title} ${p.city} ${p.area}`.toLowerCase().includes(query.toLowerCase()))) return false;
      return true;
    });
  }, [properties, query, type]);

  const visibleProperties = properties.filter((p) => p.isPublished !== false);
  const recent = [...visibleProperties].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  const recommended = [...visibleProperties].sort((a, b) => b.views - a.views).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: LUXURY_EASE }}
      className="space-y-10"
    >
      <div>
        <h1 className="font-display text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="mt-1 text-sm text-ink/60 dark:text-slate-400">Here's what's new for you today.</p>
      </div>

      <div className="card flex flex-col gap-3 p-4 md:flex-row shadow-sm">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, city, or area" className="input pl-11" />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input md:w-48">
          <option value="">All Categories</option>
          {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link to="/search" className="btn-primary md:px-8 block text-center shadow-md">Advanced Search</Link>
        </motion.div>
      </div>

      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">Recent Properties</h2>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {recent.map((p, i) => <PropertyCard key={p.id || p._id} property={p} index={i} />)}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">Recommended For You</h2>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {recommended.map((p, i) => <PropertyCard key={p.id || p._id} property={p} index={i} />)}
        </div>
      </section>

      {query || type ? (
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold">Search Results ({filtered.length})</h2>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p, i) => <PropertyCard key={p.id || p._id} property={p} index={i} />)}
          </div>
        </section>
      ) : null}
    </motion.div>
  );
}
