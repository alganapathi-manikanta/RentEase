import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiLayers, FiBriefcase, FiShield } from 'react-icons/fi';
import { useInfoModal } from '../context/InfoModalContext';
import AboutUs from '../pages/AboutUs';
import Careers from '../pages/Careers';
import PrivacyPolicy from '../pages/PrivacyPolicy';

const MODAL_CONFIGS = {
  about: {
    title: 'About Rent Ease',
    subtitle: 'Company Overview & Mission',
    icon: FiLayers,
    badgeColor: 'border-[var(--color-accent)]/30 text-[var(--color-accent)] bg-[var(--color-accent)]/10',
    component: AboutUs,
  },
  careers: {
    title: 'Careers at Rent Ease',
    subtitle: 'Opportunities & Innovation Roadmap',
    icon: FiBriefcase,
    badgeColor: 'border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/10',
    component: Careers,
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'Data Handling & User Security',
    icon: FiShield,
    badgeColor: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    component: PrivacyPolicy,
  },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.28, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.22, ease: 'easeIn' },
  },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 22 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1], // spring-like smooth deceleration
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 18,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function InfoModalOverlay() {
  const { activeModal, closeModal } = useInfoModal();

  const config = activeModal ? MODAL_CONFIGS[activeModal] : null;

  return (
    <AnimatePresence mode="wait">
      {activeModal && config && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="info-modal-title"
        >
          {/* Subtle Dark / Blurred Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeModal}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Full-Screen Glass Modal Window */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex h-[92vh] max-h-[92vh] w-[95vw] sm:w-[92vw] max-w-5xl flex-col rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0f1b2e]/95 overflow-hidden"
          >
            {/* Modal Header Bar with Title & Animated Close Button */}
            <div className="flex shrink-0 items-center justify-between border-b border-black/5 bg-white/50 px-5 py-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.02] sm:px-8">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${config.badgeColor}`}>
                  <config.icon size={18} />
                </span>
                <div>
                  <h2
                    id="info-modal-title"
                    className="font-display text-lg font-bold text-slate-900 dark:text-white sm:text-xl"
                  >
                    {config.title}
                  </h2>
                  <p
                    className="text-xs text-slate-500 dark:text-slate-400"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {config.subtitle}
                  </p>
                </div>
              </div>

              {/* Animated Close Button at top-right */}
              <motion.button
                whileHover={{ scale: 1.12, rotate: 90 }}
                whileTap={{ scale: 0.92 }}
                onClick={closeModal}
                className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700 shadow-sm transition hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-accent)] hover:text-slate-950 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-[var(--color-accent)] dark:hover:text-slate-950"
                aria-label="Close modal"
              >
                <FiX size={20} />
              </motion.button>
            </div>

            {/* Scrollable Content Body (internal scrolling only) */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-10 sm:py-8 md:px-12 md:py-10 custom-modal-scrollbar">
              <config.component isModal={true} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
