import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FiHome, FiEye, FiUsers, FiDollarSign, FiPlus, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { getPropertyPricing } from '../../utils/propertyPricing';
import { isPropertyOwner } from '../../utils/propertyFormHelpers';
import { LUXURY_EASE } from '../../utils/motionVariants';

export default function LandlordDashboard() {
  const { user } = useAuth();
  const { properties } = useAppData();
  const shouldReduceMotion = useReducedMotion();
  const myProperties = useMemo(() => properties.filter((p) => isPropertyOwner(p, user)), [properties, user]);

  const activeProperties = myProperties.filter((p) => p.isPublished !== false);
  const rentProperties = myProperties.filter((p) => {
    const pr = getPropertyPricing(p);
    return pr.isRent || pr.isBoth;
  });
  const saleProperties = myProperties.filter((p) => {
    const pr = getPropertyPricing(p);
    return pr.isSale || pr.isBoth;
  });

  const cards = [
    { label: 'Total Properties', value: myProperties.length, icon: FiHome, color: 'bg-primary/10 text-primary' },
    { label: 'Active Properties', value: activeProperties.length, icon: FiEye, color: 'bg-secondary/10 text-secondary' },
    { label: 'Properties for Rent', value: rentProperties.length, icon: FiUsers, color: 'bg-accent/10 text-accent' },
    { label: 'Properties for Sale', value: saleProperties.length, icon: FiDollarSign, color: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: LUXURY_EASE }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="mt-1 text-sm text-ink/60 dark:text-slate-400">Here's how your properties are performing.</p>
        </div>
        <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}>
          <Link to="/landlord/add-property" className="btn-primary shadow-md">
            <FiPlus /> Add Property
          </Link>
        </motion.div>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 22, scale: shouldReduceMotion ? 1 : 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={shouldReduceMotion ? {} : { y: -5, scale: 1.015 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              delay: shouldReduceMotion ? 0 : (i % 4) * 0.08,
              duration: shouldReduceMotion ? 0.2 : 0.45,
              ease: LUXURY_EASE,
            }}
            className="card p-6 transition-shadow duration-300 hover:shadow-xl hover:border-primary/40 cursor-default"
          >
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${c.color}`}
            >
              <c.icon size={20} />
            </motion.div>
            <p className="font-display text-3xl font-bold">{c.value}</p>
            <p className="mt-1 text-sm text-ink/50 dark:text-slate-400 font-medium">{c.label}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.15, ease: LUXURY_EASE }}
        className="card p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
          <h2 className="font-display text-lg font-semibold">Your Recent Listings</h2>
          <motion.div whileHover={{ x: 2 }}>
            <Link
              to="/landlord/posted-properties"
              className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>Posted Properties</span>
              <FiArrowRight size={14} />
            </Link>
          </motion.div>
        </div>
        {myProperties.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-ink/50 dark:text-slate-400">You haven't listed any properties yet.</p>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link to="/landlord/add-property" className="btn-primary shadow-md">
                <FiPlus /> Add Your First Property
              </Link>
            </motion.div>
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {myProperties.slice(0, 5).map((p, idx) => {
              const pricing = getPropertyPricing(p);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: shouldReduceMotion ? 0 : 0.2 + idx * 0.05, duration: 0.35, ease: LUXURY_EASE }}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5 px-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{p.title}</p>
                    <p className="text-xs text-ink/50 dark:text-slate-400">{p.area}, {p.city} · {pricing.badgeText} · {pricing.cardPriceDisplay}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-ink/60 dark:text-slate-400">
                    <span className="hidden sm:inline">{p.views} views</span>
                    <span className="hidden sm:inline">{p.interested} interested</span>
                    <motion.div whileHover={{ scale: 1.1, x: 1 }} whileTap={{ scale: 0.95 }}>
                      <Link to={`/property/${p.id}`} className="font-semibold text-primary hover:underline">
                        View
                      </Link>
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
