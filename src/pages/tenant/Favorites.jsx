import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FiHeart } from 'react-icons/fi';
import PropertyCard from '../../components/PropertyCard';
import { useAppData } from '../../context/AppDataContext';
import { LUXURY_EASE } from '../../utils/motionVariants';

export default function Favorites() {
  const { properties, favorites } = useAppData();
  const shouldReduceMotion = useReducedMotion();
  const favProperties = properties.filter((p) => (
    p.isPublished !== false && favorites.includes(String(p.id || p._id))
  ));

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: LUXURY_EASE }}
    >
      <h1 className="font-display text-2xl font-bold">Wishlist</h1>
      <p className="mt-1 mb-6 text-sm text-ink/60 dark:text-slate-400">Your saved favourite properties.</p>

      {favProperties.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: LUXURY_EASE }}
          className="card flex flex-col items-center gap-4 p-10 text-center sm:p-16"
        >
          <motion.span
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500"
          >
            <FiHeart size={30} />
          </motion.span>
          <h2 className="font-display text-xl font-semibold">Your Wishlist is Empty</h2>
          <p className="max-w-md text-ink/50 dark:text-slate-400">
            Save properties you love and find them here later.
          </p>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link to="/search" className="btn-primary shadow-md">Explore Properties</Link>
          </motion.div>
        </motion.div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {favProperties.map((p, i) => <PropertyCard key={p.id || p._id} property={p} index={i} />)}
        </div>
      )}
    </motion.div>
  );
}
