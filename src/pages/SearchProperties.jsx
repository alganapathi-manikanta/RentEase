import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FiFilter, FiX } from 'react-icons/fi';
import PropertyCard from '../components/PropertyCard';
import PropertyCardSkeleton from '../components/PropertyCardSkeleton';
import { useAppData } from '../context/AppDataContext';
import { PROPERTY_TYPES } from '../data/mockData';
import { getPropertyPricing } from '../utils/propertyPricing';
import { LUXURY_EASE } from '../utils/motionVariants';

const emptyFilters = { city: '', area: '', type: '', status: '', minBudget: '', maxBudget: '', bedrooms: '', bathrooms: '' };

export default function SearchProperties() {
  const { properties, propertiesLoading, propertiesError, isWakingServer, refreshProperties } = useAppData();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(emptyFilters);
  const [sort, setSort] = useState('latest');
  const [showFilters, setShowFilters] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setFilters((f) => ({
      ...f,
      city: searchParams.get('city') || '',
      type: searchParams.get('type') || '',
      status: searchParams.get('status') || '',
    }));
  }, [searchParams]);

  const handleChange = (e) => setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
  const clearFilters = () => setFilters(emptyFilters);

  const results = useMemo(() => {
    let list = properties.filter((p) => {
      if (p.isPublished === false || p.isActive === false) return false;
      if (filters.city && !p.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.area && !p.area?.toLowerCase().includes(filters.area.toLowerCase())) return false;
      if (filters.type && p.type !== filters.type) return false;

      const pricing = getPropertyPricing(p);
      const txType = pricing.transactionType;

      if (filters.status) {
        const filterStatusNorm = filters.status.toLowerCase();
        if (filterStatusNorm === 'rent') {
          if (txType !== 'rent' && txType !== 'both') return false;
        } else if (filterStatusNorm === 'sale') {
          if (txType !== 'sale' && txType !== 'both') return false;
        } else if (filterStatusNorm === 'both') {
          if (txType !== 'both') return false;
        } else if (txType !== filterStatusNorm) {
          return false;
        }
      }

      // Effective budget comparison
      let effectivePrice = p.price;
      if (filters.status?.toLowerCase() === 'rent') {
        effectivePrice = pricing.monthlyRent > 0 ? pricing.monthlyRent : p.price;
      } else if (filters.status?.toLowerCase() === 'sale') {
        effectivePrice = pricing.salePrice > 0 ? pricing.salePrice : p.price;
      } else {
        effectivePrice = pricing.isSale ? pricing.salePrice : pricing.monthlyRent > 0 ? pricing.monthlyRent : p.price;
      }

      if (filters.minBudget && effectivePrice < Number(filters.minBudget)) return false;
      if (filters.maxBudget && effectivePrice > Number(filters.maxBudget)) return false;
      if (filters.bedrooms && p.bedrooms < Number(filters.bedrooms)) return false;
      if (filters.bathrooms && p.bathrooms < Number(filters.bathrooms)) return false;
      return true;
    });

    switch (sort) {
      case 'oldest':
        list = [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'lowest':
        list = [...list].sort((a, b) => {
          const pA = getPropertyPricing(a);
          const pB = getPropertyPricing(b);
          const valA = pA.isSale ? pA.salePrice : (pA.monthlyRent || a.price);
          const valB = pB.isSale ? pB.salePrice : (pB.monthlyRent || b.price);
          return valA - valB;
        });
        break;
      case 'highest':
        list = [...list].sort((a, b) => {
          const pA = getPropertyPricing(a);
          const pB = getPropertyPricing(b);
          const valA = pA.isSale ? pA.salePrice : (pA.monthlyRent || a.price);
          const valB = pB.isSale ? pB.salePrice : (pB.monthlyRent || b.price);
          return valB - valA;
        });
        break;
      default:
        list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [properties, filters, sort]);

  return (
    <div className="section py-10">
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: LUXURY_EASE }}
        className="mb-8 flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-3xl font-bold">Search Properties</h1>
          <p className="mt-1 text-sm text-ink/60 dark:text-slate-400">{results.length} properties found</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-auto">
            <option value="latest">Sort: Latest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="lowest">Sort: Lowest Price</option>
            <option value="highest">Sort: Highest Price</option>
          </select>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => setShowFilters((s) => !s)}
            className="btn-outline lg:hidden"
          >
            <FiFilter /> Filters
          </motion.button>
        </div>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <motion.aside
          initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: LUXURY_EASE }}
          className={`card h-fit p-6 lg:sticky lg:top-24 ${showFilters ? 'block' : 'hidden lg:block'}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display font-semibold">Advanced Filters</h3>
            <button onClick={() => setShowFilters(false)} className="lg:hidden p-1 rounded-md"><FiX /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">City</label>
              <input name="city" value={filters.city} onChange={handleChange} className="input" placeholder="e.g. Hyderabad" />
            </div>
            <div>
              <label className="label">Area</label>
              <input name="area" value={filters.area} onChange={handleChange} className="input" placeholder="e.g. Gachibowli" />
            </div>
            <div>
              <label className="label">Property Type</label>
              <select name="type" value={filters.type} onChange={handleChange} className="input">
                <option value="">Any</option>
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Rent / Sale</label>
              <select name="status" value={filters.status} onChange={handleChange} className="input">
                <option value="">Any</option>
                <option value="Rent">Rent</option>
                <option value="Sale">Sale</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Min Budget</label>
                <input type="number" name="minBudget" value={filters.minBudget} onChange={handleChange} className="input" placeholder="0" />
              </div>
              <div>
                <label className="label">Max Budget</label>
                <input type="number" name="maxBudget" value={filters.maxBudget} onChange={handleChange} className="input" placeholder="Any" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Bedrooms</label>
                <select name="bedrooms" value={filters.bedrooms} onChange={handleChange} className="input">
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
                </select>
              </div>
              <div>
                <label className="label">Bathrooms</label>
                <select name="bathrooms" value={filters.bathrooms} onChange={handleChange} className="input">
                  <option value="">Any</option>
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
                </select>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={clearFilters}
              className="btn-ghost w-full justify-center border border-black/10 dark:border-white/10"
            >
              Clear Filters
            </motion.button>
          </div>
        </motion.aside>

        <div>
          {/* Server waking indicator for cold-starts */}
          {isWakingServer && propertiesLoading && (
            <div className="mb-6 flex items-center justify-center gap-2.5 rounded-2xl border border-[#d4a84f]/30 bg-[#d4a84f]/10 p-3 text-xs font-medium text-[#b98a3c] dark:text-[#ddbb72] animate-pulse">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Connecting to cloud server... Properties will display momentarily.</span>
            </div>
          )}

          {propertiesLoading && properties.length === 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <PropertyCardSkeleton key={i} />
              ))}
            </div>
          ) : propertiesError && properties.length === 0 ? (
            <div className="card p-10 text-center border border-red-500/20 bg-red-50/50 dark:bg-red-950/20">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{propertiesError}</p>
              <button
                onClick={() => refreshProperties()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
              >
                Retry Loading
              </button>
            </div>
          ) : results.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: LUXURY_EASE }}
              className="card p-16 text-center text-ink/50 dark:text-slate-400"
            >
              No properties match your filters yet. Try widening your search.
            </motion.div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((p, i) => <PropertyCard key={p.id || p._id} property={p} index={i} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
