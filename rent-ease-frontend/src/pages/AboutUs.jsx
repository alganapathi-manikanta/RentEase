import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FiHome, FiCheckCircle, FiShield, FiHeart, FiArrowRight, FiLayers } from 'react-icons/fi';
import { useInfoModal } from '../context/InfoModalContext';

export default function AboutUs({ isModal = false }) {
  const shouldReduceMotion = useReducedMotion();
  const { closeModal } = useInfoModal();

  const handleActionClick = () => {
    if (isModal) {
      closeModal();
    }
  };

  const bodyContent = (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="border-b border-slate-200/70 pb-8 text-center dark:border-white/10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
          <FiLayers size={13} /> Company Overview
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-5xl">
          About Rent Ease
        </h1>
        <p
          className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300 md:text-lg"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          A modern platform designed to make property discovery simpler, transparent, and more convenient.
        </p>
      </div>

      {/* Continuous Narrative Content */}
      <div
        className="mt-8 space-y-10 text-base leading-relaxed text-slate-700 dark:text-slate-200"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Section 1: Welcome & Mission */}
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Simplifying Property Discovery
          </h2>
          <p>
            Welcome to Rent Ease — a modern platform designed to make property discovery simpler and more convenient.
          </p>
          <p>
            Finding the right property can often be time-consuming. Rent Ease brings landlords, tenants, and property seekers together in one easy-to-use platform.
          </p>
        </div>

        {/* Section 2: Property Scope */}
        <div className="space-y-4 border-t border-slate-100 pt-8 dark:border-white/5">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            What You Can Explore
          </h2>
          <p>
            Users can explore properties available for rent or sale, including:
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-slate-50/80 p-3.5 dark:border-white/5 dark:bg-white/[0.03]">
              <div className="rounded-lg bg-[var(--color-accent)]/15 p-2 text-[var(--color-accent)]">
                <FiHome size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Houses</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Villas & residences</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-slate-50/80 p-3.5 dark:border-white/5 dark:bg-white/[0.03]">
              <div className="rounded-lg bg-[var(--color-accent)]/15 p-2 text-[var(--color-accent)]">
                <FiLayers size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Flats / Apartments</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Gated communities</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-slate-50/80 p-3.5 dark:border-white/5 dark:bg-white/[0.03]">
              <div className="rounded-lg bg-[var(--color-accent)]/15 p-2 text-[var(--color-accent)]">
                <FiCheckCircle size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Land and Plots</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Sites & parcels</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            Property listings can include important details such as location, area, pricing, descriptions, room information, furnishing details, and images.
          </p>
        </div>

        {/* Section 3: Landlords and Tenants */}
        <div className="space-y-6 border-t border-slate-100 pt-8 dark:border-white/5">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Built for Landlords, Tenants & Buyers
          </h2>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <FiShield className="text-[var(--color-accent)]" size={17} />
              <span>For Landlords</span>
            </div>
            <p className="pl-6 text-sm text-slate-600 dark:text-slate-300">
              Landlords can showcase their properties by adding detailed information and images, helping potential tenants or buyers understand the property before making a decision.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <FiHeart className="text-[var(--color-accent)]" size={17} />
              <span>For Tenants & Buyers</span>
            </div>
            <p className="pl-6 text-sm text-slate-600 dark:text-slate-300">
              Users can explore available properties, view detailed information, check images and locations, and save properties they are interested in using the Wishlist feature.
            </p>
          </div>
        </div>

        {/* Section 4: Our Goal & Academic Notice */}
        <div className="space-y-4 border-t border-slate-100 pt-8 dark:border-white/5">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Our Goal
          </h2>
          <p>
            Our goal is to provide a simple, organized, and user-friendly property platform that makes finding and showcasing properties easier.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Rent Ease is developed as a diploma final-year project, demonstrating the practical use of modern web technologies to solve a real-world problem.
          </p>
        </div>

        {/* Brand Motto Callout */}
        <div className="rounded-2xl border border-[var(--color-accent)]/35 bg-gradient-to-r from-[var(--color-accent)]/10 via-[var(--color-accent)]/5 to-transparent p-5 text-center dark:border-[var(--color-accent)]/25">
          <p className="text-base font-semibold tracking-wide text-slate-900 dark:text-white sm:text-lg">
            Rent Ease — Making Property Discovery Simpler.
          </p>
        </div>

        {/* Inline Navigation Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/search"
            onClick={handleActionClick}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-[var(--color-champagne)]"
          >
            Browse Properties <FiArrowRight size={15} />
          </Link>
          <Link
            to="/help"
            onClick={handleActionClick}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
          >
            Need Help?
          </Link>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="w-full">
        {bodyContent}
      </div>
    );
  }

  return (
    <div className="section py-12 md:py-16">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-slate-200/80 bg-white/85 p-8 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-[#111e36]/90 sm:p-12 md:p-14"
        >
          {bodyContent}
        </motion.div>
      </div>
    </div>
  );
}
