import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FiEdit2, FiTrash2, FiPlus, FiEye, FiGlobe, FiEyeOff } from 'react-icons/fi';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { resolveMediaUrl } from '../../utils/media';
import { getPropertyPricing } from '../../utils/propertyPricing';
import { LUXURY_EASE, backdropFadeVariants, modalScaleVariants } from '../../utils/motionVariants';

export default function ManageProperties() {
  const { user } = useAuth();
  const { properties, deleteProperty, togglePropertyPublished } = useAppData();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  const myProperties = useMemo(() => properties.filter((p) => p.ownerId === user?.id), [properties, user]);

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: LUXURY_EASE }}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Posted Properties</h1>
          <p className="mt-1 text-sm text-ink/60 dark:text-slate-400">{myProperties.length} posted listings</p>
        </div>
        <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}>
          <Link to="/landlord/add-property" className="btn-primary w-full sm:w-auto shadow-md">
            <FiPlus /> Add Property
          </Link>
        </motion.div>
      </div>

      {myProperties.length === 0 ? (
        <div className="card p-16 text-center text-ink/50 dark:text-slate-400">
          You haven't posted any properties yet. <Link to="/landlord/add-property" className="font-semibold text-primary hover:underline">Add Property</Link>.
        </div>
      ) : (
        <div className="card overflow-x-auto shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-black/5 text-ink/50 dark:border-white/5 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Property</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Listing</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Views</th>
                <th className="px-5 py-3 font-medium">Interested</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {myProperties.map((p) => {
                const pricing = getPropertyPricing(p);
                return (
                  <tr key={p.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {p.photos?.[0] ? (
                          <img
                            src={resolveMediaUrl(p.photos[0])}
                            alt=""
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            className="h-12 w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-16 rounded-lg bg-primary/10" />
                        )}
                        <div>
                          <p className="font-medium">{p.title}</p>
                          <p className="text-xs text-ink/50 dark:text-slate-400">{p.area}, {p.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">{p.type}</td>
                    <td className="px-5 py-4">{pricing.badgeText}</td>
                    <td className="px-5 py-4 font-semibold text-primary">{pricing.cardPriceDisplay}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.isPublished === false ? 'bg-black/5 text-ink/60 dark:bg-white/10 dark:text-slate-300' : 'bg-secondary/10 text-secondary'}`}>
                        {p.isPublished === false ? 'Unpublished' : 'Published'}
                      </span>
                    </td>
                    <td className="px-5 py-4">{p.views}</td>
                    <td className="px-5 py-4">{p.interested}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                          <Link to={`/property/${p.id}`} className="flex h-9 w-9 items-center justify-center rounded-full text-ink/50 hover:bg-black/5 dark:hover:bg-white/10" aria-label="View" title="View Property Details">
                            <FiEye size={16} />
                          </Link>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                          <Link to={`/landlord/edit-property/${p.id}`} className="flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-primary/10" aria-label="Edit" title="Edit Property">
                            <FiEdit2 size={16} />
                          </Link>
                        </motion.div>
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => togglePropertyPublished(p.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-secondary hover:bg-secondary/10"
                          aria-label={p.isPublished === false ? 'Publish' : 'Unpublish'}
                          title={p.isPublished === false ? 'Publish Property' : 'Unpublish Property'}
                        >
                          {p.isPublished === false ? <FiGlobe size={16} /> : <FiEyeOff size={16} />}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setConfirmDelete(p)}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          aria-label="Delete"
                          title="Delete Property"
                        >
                          <FiTrash2 size={16} />
                        </motion.button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal with Smooth Spring and Blur */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              variants={backdropFadeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setConfirmDelete(null)}
            />
            <motion.div
              variants={modalScaleVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative z-10 card w-full max-w-sm p-6 text-center shadow-2xl"
            >
              <h3 className="mb-2 font-display text-lg font-semibold">Delete this property?</h3>
              <p className="mb-6 text-sm text-ink/60 dark:text-slate-400">"{confirmDelete.title}" will be permanently removed.</p>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setConfirmDelete(null)}
                  className="btn-ghost flex-1 border border-black/10 dark:border-white/10"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { deleteProperty(confirmDelete.id); setConfirmDelete(null); }}
                  className="flex-1 rounded-full bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-600 shadow-md"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
