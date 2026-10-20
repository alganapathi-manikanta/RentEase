import { motion, useReducedMotion } from 'framer-motion';
import {
  FiBriefcase,
  FiCode,
  FiLayout,
  FiSmartphone,
  FiDatabase,
  FiLock,
  FiCpu,
  FiMail,
  FiInfo,
} from 'react-icons/fi';
import { LUXURY_EASE } from '../utils/motionVariants';

const DOMAINS = [
  {
    icon: FiCode,
    title: 'Web Development',
    desc: 'Frontend architecture using React, responsive web systems, performance optimization, and interactive state management.',
  },
  {
    icon: FiLayout,
    title: 'UI/UX Design',
    desc: 'Crafting clean, accessible user flows, human-centered UI systems, design consistency, and delightful micro-interactions.',
  },
  {
    icon: FiSmartphone,
    title: 'Application Development',
    desc: 'Developing scalable web applications, RESTful services, real-time client communication, and cross-platform experiences.',
  },
  {
    icon: FiDatabase,
    title: 'Database Management',
    desc: 'Schema design with MongoDB, relational modeling, data indexing, fast query pipelines, and structured persistence.',
  },
  {
    icon: FiLock,
    title: 'Web Security',
    desc: 'Secure JWT authentication, role authorization, protected routes, input sanitization, and strict data safeguards.',
  },
  {
    icon: FiCpu,
    title: 'Technology & Automation',
    desc: 'Automating deployment pipelines, intelligent property matching, automated valuation calculations, and analytics.',
  },
];

export default function Careers({ isModal = false }) {
  const shouldReduceMotion = useReducedMotion();

  const bodyContent = (
    <div className="mx-auto max-w-5xl">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: LUXURY_EASE }}
        className="text-center"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
          <FiBriefcase size={14} /> Career Opportunities
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Careers at Rent Ease
        </h1>
        <p
          className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300 md:text-lg"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Building the Future of Property Discovery through thoughtful software engineering and modern digital design.
        </p>
      </motion.div>

      {/* Vision Statement Banner */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: LUXURY_EASE }}
        className="mt-10 rounded-2xl border border-slate-200/90 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#131f3d]/70 md:p-8"
      >
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Building the Future of Property Discovery
        </h2>
        <p
          className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Rent Ease is being developed as a technology-focused real-estate platform with the goal of making property discovery and management more convenient through digital technology. We believe that modern web applications should make finding, managing, and showcasing homes intuitive, transparent, and seamless for everyone involved.
        </p>
      </motion.div>

      {/* Current Status / Hiring Notice Banner */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.14, ease: LUXURY_EASE }}
        className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-50/70 p-6 dark:border-amber-500/20 dark:bg-amber-500/10 md:p-7"
      >
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 rounded-lg bg-amber-500/20 p-2 text-amber-700 dark:text-amber-300">
            <FiInfo size={20} />
          </div>
          <div>
            <h3
              className="text-base font-semibold text-slate-900 dark:text-white"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Current Opportunities Notice
            </h3>
            <p
              className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Rent Ease is currently an academic diploma final-year project and is not actively hiring for positions at this time. However, future development could involve areas such as web engineering, interface design, database systems, and automation.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Domains / Future Opportunities Grid */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: LUXURY_EASE }}
        className="mt-10"
      >
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Future Growth Areas & Disciplines
          </h2>
          <p
            className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Key technical domains that power the Rent Ease platform roadmap as it continues to evolve.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAINS.map((domain, i) => {
            const Icon = domain.icon;
            return (
              <motion.div
                key={i}
                whileHover={shouldReduceMotion ? {} : { y: -4, scale: 1.015 }}
                transition={{ duration: 0.25, ease: LUXURY_EASE }}
                className="group rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm transition-shadow hover:border-[var(--color-accent)]/50 hover:shadow-md dark:border-white/10 dark:bg-[#131f3d]/70 dark:hover:border-[var(--color-accent)]/40 cursor-default"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent)] transition-transform duration-300 group-hover:scale-110">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                  {domain.title}
                </h3>
                <p
                  className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {domain.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Future Possibilities & CTA */}
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: LUXURY_EASE }}
        className="mt-10 grid gap-6 md:grid-cols-2"
      >
        <div className="rounded-2xl border border-slate-200/90 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#131f3d]/70 md:p-8">
          <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Future Possibilities
          </h3>
          <p
            className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            As Rent Ease grows beyond its academic-project stage, this section will be updated with genuine career opportunities, roles, qualifications, requirements, and collaboration information.
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-6 shadow-sm dark:border-[var(--color-accent)]/20 dark:bg-[var(--color-accent)]/10 md:p-8">
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Interested in the future of Rent Ease?
            </h3>
            <p
              className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Thank you for your interest and support. If you would like to connect or collaborate with our development team, feel free to drop us a note.
            </p>
          </div>
          <div className="mt-6">
            <motion.a
              href="mailto:projectplatform15@gmail.com"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-[var(--color-champagne)]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <FiMail size={15} /> Contact Development Team
            </motion.a>
          </div>
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
