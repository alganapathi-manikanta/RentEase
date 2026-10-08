import { motion, useReducedMotion } from 'framer-motion';
import { FiFileText, FiShield, FiLock, FiDatabase, FiEye, FiCheck } from 'react-icons/fi';

const SECTIONS = [
  { id: 'section-1', num: '1.0', title: 'Information We May Collect' },
  { id: 'section-2', num: '2.0', title: 'How Information Is Used' },
  { id: 'section-3', num: '3.0', title: 'Property Information & Public Listings' },
  { id: 'section-4', num: '4.0', title: 'Password & Account Security' },
  { id: 'section-5', num: '5.0', title: 'Data Storage & Persistence' },
  { id: 'section-6', num: '6.0', title: 'Academic Project Notice' },
];

export default function PrivacyPolicy({ isModal = false }) {
  const shouldReduceMotion = useReducedMotion();

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const bodyContent = (
    <div className="mx-auto max-w-4xl">
      {/* Document Header */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <FiShield size={14} /> Official Policy Document
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Privacy Policy
        </h1>
        <div
          className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <span>Last Updated: October 2026</span>
          <span>•</span>
          <span>Version: 1.0</span>
          <span>•</span>
          <span>Scope: Platform & Services</span>
        </div>
      </motion.div>

      {/* Quick Navigation / Table of Contents */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 rounded-2xl border border-slate-200/90 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#131f3d]/70 md:p-6"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <FiFileText size={15} /> Quick Table of Contents
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:text-white"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <span className="font-semibold text-[var(--color-accent)]">{sec.num}</span>
              <span>{sec.title}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Policy Document Body */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#111c35] sm:p-10 md:p-12"
      >
        {/* Introductory Preamble */}
        <div className="border-b border-slate-200/70 pb-6 dark:border-white/10">
          <p
            className="text-base leading-relaxed text-slate-700 dark:text-slate-200"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Rent Ease respects user privacy and aims to handle information responsibly. This Privacy Policy describes how information is collected, utilized, and stored when accessing our property platform and services.
          </p>
        </div>

        <div className="mt-8 space-y-12">
          {/* Section 1 */}
          <div id="section-1" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-accent)]/15 text-xs font-bold text-[var(--color-accent)]">
                1.0
              </span>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                Information We May Collect
              </h2>
            </div>
            <p
              className="text-sm leading-relaxed text-slate-600 dark:text-slate-300"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Depending on how users interact with Rent Ease, the platform may handle:
            </p>
            <ul
              className="mt-3 space-y-2.5 pl-2 text-sm text-slate-600 dark:text-slate-300"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {[
                'Name and email address',
                'Account and login information',
                'User role, such as landlord or tenant',
                'Property details submitted by landlords',
                'Property images and media uploads',
                'Wishlist information and saved favorites',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <FiCheck className="mt-1 shrink-0 text-[var(--color-accent)]" size={15} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 2 */}
          <div id="section-2" className="scroll-mt-24 space-y-3 border-t border-slate-100 pt-8 dark:border-white/5">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-accent)]/15 text-xs font-bold text-[var(--color-accent)]">
                2.0
              </span>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                How Information Is Used
              </h2>
            </div>
            <p
              className="text-sm leading-relaxed text-slate-600 dark:text-slate-300"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              The collected data is utilized exclusively for core platform operations and service fulfillment:
            </p>
            <ul
              className="mt-3 space-y-2.5 pl-2 text-sm text-slate-600 dark:text-slate-300"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {[
                'Create and manage user accounts securely',
                'Authenticate users via secure token authorization',
                'Provide tailored landlord and tenant workflows',
                'Display published property listings to prospective seekers',
                'Allow landlords to edit, manage, and update property records',
                'Provide wishlist and bookmarking functionality',
                'Operate, maintain, and improve platform responsiveness and stability',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <FiCheck className="mt-1 shrink-0 text-[var(--color-accent)]" size={15} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3 */}
          <div id="section-3" className="scroll-mt-24 space-y-3 border-t border-slate-100 pt-8 dark:border-white/5">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-accent)]/15 text-xs font-bold text-[var(--color-accent)]">
                3.0
              </span>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                Property Information & Public Listings
              </h2>
            </div>
            <div
              className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <p>
                Information submitted by landlords as part of a property listing may be visible to other users. This can include property descriptions, images, location, pricing, size, room details, and furnishing information.
              </p>
              <div className="rounded-xl border border-amber-500/30 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <FiEye className="mt-0.5 shrink-0" size={16} />
                  <span>
                    <strong>Important Notice for Landlords:</strong> Landlords should avoid including unnecessary sensitive or confidential information (such as personal banking details, private identity proofs, or private contact records) in public listings.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div id="section-4" className="scroll-mt-24 space-y-3 border-t border-slate-100 pt-8 dark:border-white/5">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-accent)]/15 text-xs font-bold text-[var(--color-accent)]">
                4.0
              </span>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                Password & Account Security
              </h2>
            </div>
            <div
              className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <p>
                User passwords are intended to be handled through the application&apos;s authentication system and should not be displayed publicly.
              </p>
              <div className="rounded-xl border border-sky-500/30 bg-sky-50/60 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
                <div className="flex items-start gap-2.5 text-xs text-sky-800 dark:text-sky-300">
                  <FiLock className="mt-0.5 shrink-0" size={16} />
                  <span>
                    Users should also avoid sharing passwords or other sensitive information through property descriptions, public feedback, or unencrypted channels.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5 */}
          <div id="section-5" className="scroll-mt-24 space-y-3 border-t border-slate-100 pt-8 dark:border-white/5">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-accent)]/15 text-xs font-bold text-[var(--color-accent)]">
                5.0
              </span>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                Data Storage & Persistence
              </h2>
            </div>
            <p
              className="text-sm leading-relaxed text-slate-600 dark:text-slate-300"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Rent Ease uses a database to store information required for the application&apos;s functionality, including account credentials and property information.
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-white/[0.03] dark:text-slate-400">
              <FiDatabase size={16} className="text-[var(--color-accent)]" />
              <span>Structured data records are securely indexed and isolated by authenticated user scopes.</span>
            </div>
          </div>

          {/* Section 6 */}
          <div id="section-6" className="scroll-mt-24 space-y-3 border-t border-slate-100 pt-8 dark:border-white/5">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-accent)]/15 text-xs font-bold text-[var(--color-accent)]">
                6.0
              </span>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                Academic Project Notice
              </h2>
            </div>
            <p
              className="text-sm leading-relaxed text-slate-600 dark:text-slate-300"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Rent Ease is currently a diploma final-year academic project. This policy describes the general data handling of the current project and may be updated if the platform&apos;s features or data practices change.
            </p>
          </div>
        </div>

        {/* Document Sign-off */}
        <div className="mt-12 border-t border-slate-200/80 pt-6 text-center dark:border-white/10">
          <p
            className="text-sm font-semibold text-[var(--color-accent)]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Thank you for using Rent Ease.
          </p>
        </div>
      </motion.div>
    </div>
  );

  if (isModal) {
    return <div className="w-full">{bodyContent}</div>;
  }

  return (
    <div className="section py-14 md:py-20">
      {bodyContent}
    </div>
  );
}
