import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FiHelpCircle, FiMail, FiPhone, FiMapPin, FiSearch, FiShield, FiUser } from 'react-icons/fi';
import { LUXURY_EASE } from '../utils/motionVariants';

const helpTopics = [
  {
    icon: FiSearch,
    title: 'How to search properties',
    text: 'Use the search page to filter by city, area, type, and rent or sale status. You can also sort and compare listings quickly.',
  },
  {
    icon: FiUser,
    title: 'How to sign in or register',
    text: 'Create an account to access your dashboard, save favorite properties, and manage your listing or tenant profile.',
  },
  {
    icon: FiShield,
    title: 'How to manage listings',
    text: 'Landlords can add and edit properties through the dashboard and keep the listing information up to date.',
  },
];

export default function Help() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="section py-16 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: LUXURY_EASE }}
        className="mx-auto max-w-4xl text-center"
      >
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          <FiHelpCircle size={18} /> Help Center
        </div>
        <h1 className="font-display text-4xl font-bold md:text-5xl">How can we help?</h1>
        <p className="mx-auto mt-4 max-w-2xl text-ink/60 dark:text-slate-400">
          Find the answers you need about property search, landlord tools, account access, and getting the most from Rent Ease.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {helpTopics.map(({ icon: Icon, title, text }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 22, scale: shouldReduceMotion ? 1 : 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={shouldReduceMotion ? {} : { y: -5, scale: 1.015 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              delay: shouldReduceMotion ? 0 : i * 0.08,
              duration: shouldReduceMotion ? 0.2 : 0.45,
              ease: LUXURY_EASE,
            }}
            className="card p-6 transition-shadow duration-300 hover:shadow-xl hover:border-primary/40 cursor-default"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon size={22} />
            </div>
            <h2 className="mb-2 font-display text-xl font-semibold">{title}</h2>
            <p className="text-sm text-ink/60 dark:text-slate-400 leading-relaxed">{text}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="card p-6"
        >
          <div className="mb-2 flex items-center gap-2 font-semibold text-primary">
            <FiMail /> Email Support
          </div>
          <p className="text-sm text-ink/60 dark:text-slate-400">projectplatform15@gmail.com</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="card p-6"
        >
          <div className="mb-2 flex items-center gap-2 font-semibold text-primary">
            <FiPhone /> Call Us
          </div>
          <p className="text-sm text-ink/60 dark:text-slate-400">8985211790</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="card p-6"
        >
          <div className="mb-2 flex items-center gap-2 font-semibold text-primary">
            <FiMapPin /> Office
          </div>
          <p className="text-sm text-ink/60 dark:text-slate-400">Dhanekula, Gangur</p>
        </motion.div>
      </div>

      <div className="mt-12 text-center">
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="inline-block">
          <Link to="/search" className="btn-primary inline-flex shadow-md">Browse Properties</Link>
        </motion.div>
      </div>
    </div>
  );
}
