import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FiMapPin, FiHeart } from 'react-icons/fi';
import { BiBed, BiBath, BiArea } from 'react-icons/bi';
import MediaPlaceholder from './MediaPlaceholder';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { resolveMediaUrl, computePropertyStats } from '../utils/media';
import { isPlotOrLandType } from '../utils/propertyFormHelpers';
import { getPropertyPricing } from '../utils/propertyPricing';

export default function PropertyCard({ property, index = 0 }) {
  const { user } = useAuth();
  const { favorites, toggleFavorite } = useAppData();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const isTenant = user?.role === 'tenant';
  const isFav = favorites?.includes(String(property.id || property._id));

  const rawCover = property.photos?.[0] || property.rooms?.find((r) => r.photos?.length)?.photos?.[0];
  const coverPhoto = resolveMediaUrl(rawCover);
  const stats = computePropertyStats(property);
  const isLand = isPlotOrLandType(property.type || property.propertyType);
  const pricing = getPropertyPricing(property);

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 100, scale: shouldReduceMotion ? 1 : 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={shouldReduceMotion ? {} : { y: -7, scale: 1.028 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.988 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: shouldReduceMotion ? 0.2 : 0.7,
        delay: shouldReduceMotion ? 0 : (index % 3) * 0.13,
        ease: [0.22, 1, 0.36, 1],
      }}
      role="link"
      tabIndex={0}
      aria-label={`View details for ${property.title}`}
      onClick={(event) => {
        if (!event.target.closest('a, button')) navigate(`/property/${property.id || property._id}`);
      }}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          navigate(`/property/${property.id || property._id}`);
        }
      }}
      className="card group overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/15 hover:border-primary/40 flex flex-col justify-between"
    >
      <div>
        <div className="relative overflow-hidden">
          {coverPhoto ? (
            <img
              src={coverPhoto}
              alt={property.title}
              className="h-48 w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
            />
          ) : (
            <MediaPlaceholder icon="home" label="Image Placeholder" className="h-48 w-full" />
          )}
          <span
            className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-xs ${pricing.badgeColor}`}
          >
            {pricing.badgeText}
          </span>
          {isTenant && (
            <motion.button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(property.id || property._id);
              }}
              aria-label={isFav ? 'Remove from wishlist' : 'Save to wishlist'}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition-colors duration-200 ${
                isFav
                  ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/40 hover:bg-rose-600'
                  : 'bg-white/95 text-slate-700 border-white/80 hover:text-rose-600 hover:border-rose-300 hover:bg-white dark:bg-slate-900/95 dark:text-slate-100 dark:border-slate-700/80 dark:hover:text-rose-400 dark:hover:border-rose-500/50'
              }`}
            >
              <FiHeart size={18} className={isFav ? 'fill-current text-white' : 'stroke-[2.2]'} />
            </motion.button>
          )}
        </div>

        <div className="p-5">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">
              {property.title}
            </h3>
          </div>
          <p className="mb-3 flex items-center gap-1 text-sm text-ink/50 dark:text-slate-400">
            <FiMapPin size={14} className="shrink-0 text-primary/70" /> {property.area}, {property.city}
          </p>
          <p className="mb-4 font-display text-xl font-bold text-primary">
            {pricing.cardPriceDisplay}
          </p>

          {!isLand && (
            <div className="mb-4 flex items-center gap-4 text-sm text-ink/60 dark:text-slate-400">
              <span className="flex items-center gap-1"><BiBed size={16} /> {stats.bedrooms}</span>
              <span className="flex items-center gap-1"><BiBath size={16} /> {stats.bathrooms}</span>
              <span className="flex items-center gap-1"><BiArea size={16} /> {stats.sqft} sqft</span>
            </div>
          )}
          {isLand && (
            <div className="mb-4 flex items-center gap-1 text-sm text-ink/60 dark:text-slate-400">
              <BiArea size={16} /> {stats.sqft || property.squareFeet || property.size || 0} sqft plot
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 pt-0">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            to={`/property/${property.id}`}
            className="btn-outline w-full !py-2.5 text-sm text-center block"
          >
            View Details
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
