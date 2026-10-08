import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  FiSearch, FiMapPin, FiCamera, FiVideo, FiBox, FiPieChart,
  FiHeart, FiSmartphone, FiShield, FiZap, FiArrowRight,
} from 'react-icons/fi';
import { BiBuildingHouse } from 'react-icons/bi';
import PropertyCard from '../components/PropertyCard';
import { useAppData } from '../context/AppDataContext';
import { testimonials } from '../data/mockData';

const FEATURES = [
  { icon: FiSearch, title: 'Smart Property Search', desc: 'Filter by city, budget, type, and more to find exactly what fits.' },
  { icon: FiCamera, title: 'Upload Property Photos', desc: 'Landlords can showcase listings with a clean, structured gallery.' },
  { icon: FiVideo, title: 'Upload Property Videos', desc: 'Give tenants a real walkthrough before they ever visit.' },
  { icon: FiBox, title: '3D Room Visualization', desc: 'An interactive Three.js model built from real room dimensions.' },
  { icon: FiPieChart, title: 'Smart Expense Calculator', desc: 'See rent, bills, and charges broken down with live charts.' },
  { icon: FiHeart, title: 'Favourite Properties', desc: 'Save listings and come back to compare them anytime.' },
  { icon: FiSmartphone, title: 'Responsive Design', desc: 'A smooth experience on desktop, tablet, and mobile alike.' },
  { icon: FiShield, title: 'Secure Login', desc: 'JWT-based authentication with encrypted passwords.' },
  { icon: FiZap, title: 'Fast Search', desc: 'Instant results with sorting by price, date, and relevance.' },
];

const CATEGORIES = [
  { label: 'Flats', type: 'Flat' },
  { label: 'Villas', type: 'Villa' },
  { label: 'Houses', type: 'House' },
  { label: 'Land', type: 'Land' },
  { label: 'Commercial', type: 'Commercial' },
];

const STATS = [
  { value: '12,000+', label: 'Verified Listings' },
  { value: '8,500+', label: 'Happy Tenants' },
  { value: '3,200+', label: 'Trusted Landlords' },
  { value: '45+', label: 'Cities Covered' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { properties } = useAppData();
  const [city, setCity] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const shouldReduceMotion = useReducedMotion();

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    navigate(`/search?${params.toString()}`);
  };

  const featured = properties.filter((property) => property.isPublished !== false && property.isActive !== false).slice(0, 6);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.12,
        delayChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 22 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const ctaVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.14,
      },
    },
  };
  const ctaItemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 58 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0.2 : 0.68, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <div>
      {/* Hero */}
      <section className="hero-section relative overflow-hidden">
        <div
          className="hero-image-background absolute inset-0 -z-20"
          aria-hidden="true"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2400&q=88')" }}
        />
        <div className="hero-overlay absolute inset-0 -z-10" />

        {/* Gentle floating ambient glow behind hero elements */}
        {!shouldReduceMotion && (
          <motion.div
            animate={{
              y: [0, -12, 0],
              opacity: [0.15, 0.25, 0.15],
              scale: [1, 1.05, 1],
            }}
            transition={{
              repeat: Infinity,
              duration: 7,
              ease: 'easeInOut',
            }}
            className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[var(--color-accent)] blur-3xl filter"
          />
        )}

        <div className="section flex flex-col items-center gap-8 py-20 lg:py-28">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center max-w-3xl text-ink"
          >
            <motion.div variants={itemVariants} className="inline-block">
              <motion.span
                whileHover={{ scale: 1.05 }}
                className="hero-badge mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold shadow-soft cursor-default"
              >
                <BiBuildingHouse className="text-primary" /> Renting & Selling, made simple
              </motion.span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="hero-heading hero-title text-ink tracking-tight">
              <span className="block">Find Your Place</span>
              <span className="hero-accent block mt-1">Start Your Story</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="hero-subtitle mt-6 max-w-lg mx-auto text-lg text-ink/80 leading-relaxed">
              Rent Ease connects landlords and tenants with smart search and transparent expense breakdowns — explore listings and their 3D room previews on property pages.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 28, scale: shouldReduceMotion ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.65, delay: shouldReduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex justify-center"
          >
            <form onSubmit={handleSearch} className="hero-search card mt-4 w-full max-w-3xl flex flex-col gap-3 p-3 md:flex-row items-center shadow-xl">
              <div className="flex flex-1 items-center gap-2 px-3">
                <FiMapPin className="hero-search-icon flex-none" />
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City or area"
                  className="hero-search-field w-full border-none bg-transparent py-2 text-sm outline-none"
                />
              </div>
              <select value={type} onChange={(e) => setType(e.target.value)} className="hero-search-field input md:w-40">
                <option value="">Any Type</option>
                {CATEGORIES.map((c) => <option key={c.type} value={c.type}>{c.label}</option>)}
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="hero-search-field input md:w-36">
                <option value="">Rent/Sale</option>
                <option value="Rent">Rent</option>
                <option value="Sale">Sale</option>
              </select>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97, y: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="hero-search-button btn-primary w-full md:w-auto !py-3 md:px-8 shadow-md"
              >
                <FiSearch /> Search
              </motion.button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="hero-popular mt-2 text-sm flex items-center flex-wrap justify-center gap-2"
          >
            <span className="opacity-80">Popular:</span>
            {['Hyderabad', 'Bengaluru', 'Pune'].map((c) => (
              <motion.button
                key={c}
                whileHover={{ scale: 1.08, y: -1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={() => navigate(`/search?city=${c}`)}
                className="hero-popular-link font-medium underline-offset-4 hover:underline px-1 py-0.5"
              >
                {c}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="section py-14">
        <div className="flex flex-wrap justify-center gap-4">
          {CATEGORIES.map((c, i) => (
            <motion.button
              key={c.type}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ y: -6, scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: shouldReduceMotion ? 0 : i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => navigate(`/search?type=${c.type}`)}
              className="card group flex min-w-[125px] flex-col items-center gap-2 px-6 py-5 shadow-sm transition hover:shadow-lg hover:border-primary/40"
            >
              <motion.div
                whileHover={{ rotate: 10, scale: 1.15 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              >
                <BiBuildingHouse size={28} className="text-primary transition-colors group-hover:text-accent" />
              </motion.div>
              <span className="text-sm font-semibold">{c.label}</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Featured Properties */}
      <section className="section py-12">
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex items-end justify-between"
        >
          <div>
            <h2 className="font-display text-3xl font-bold">Featured Properties</h2>
            <p className="mt-2 text-ink/60 dark:text-slate-400">Hand-picked listings from verified landlords.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04, x: 2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/search')}
            className="btn-outline hidden md:inline-flex items-center gap-1.5"
          >
            <span>View All</span>
            <FiArrowRight size={15} />
          </motion.button>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p, i) => (
            <PropertyCard key={p.id} property={p} index={i} />
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="mt-12 bg-primary py-16 text-white overflow-hidden relative">
        <div className="section grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 22, scale: shouldReduceMotion ? 1 : 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: shouldReduceMotion ? 0 : i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-1"
            >
              <p className="font-display text-3xl font-extrabold md:text-4xl text-white">{s.value}</p>
              <p className="text-sm font-medium text-white/80">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why Choose Rent Ease / Features */}
      <section id="features" className="section py-20">
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 text-center"
        >
          <h2 className="font-display text-3xl font-bold">Why Choose Rent Ease</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink/60 dark:text-slate-400">
            Everything a landlord or tenant needs, built into one seamless experience.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 100, scale: shouldReduceMotion ? 1 : 0.97 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={shouldReduceMotion ? {} : { y: -6, scale: 1.02 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                delay: shouldReduceMotion ? 0 : (i % 3) * 0.13,
                duration: shouldReduceMotion ? 0.2 : 0.72,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="card group p-6 transition-all duration-300 hover:shadow-xl hover:border-primary/40"
            >
              <motion.div
                initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.88 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: shouldReduceMotion ? 0 : 0.4, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white"
              >
                <f.icon size={22} />
              </motion.div>
              <h3 className="mb-2 font-display text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-ink/60 dark:text-slate-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-surface py-20 dark:bg-slate-900/40">
        <div className="section">
          <motion.h2
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12 text-center font-display text-3xl font-bold"
          >
            What People Say
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 84, scale: shouldReduceMotion ? 1 : 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={shouldReduceMotion ? {} : { y: -5, scale: 1.015 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : i * 0.13,
                  duration: shouldReduceMotion ? 0.2 : 0.68,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="mb-4 text-ink/70 dark:text-slate-300 italic leading-relaxed">"{t.quote}"</p>
                <div className="border-t border-black/5 dark:border-white/5 pt-3">
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-ink/50 dark:text-slate-400">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section py-20">
        <motion.div
          variants={ctaVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          className="card flex flex-col items-center gap-6 bg-gradient-to-br from-primary to-secondary p-12 text-center text-white shadow-xl"
        >
          <motion.h2 variants={ctaItemVariants} className="font-display text-3xl font-bold">
            Ready to find or list your next property?
          </motion.h2>
          <motion.p variants={ctaItemVariants} className="max-w-lg text-white/80 text-base leading-relaxed">
            Join thousands of landlords and tenants already using Rent Ease.
          </motion.p>
          <motion.div variants={ctaItemVariants} className="flex flex-wrap justify-center gap-4 mt-2">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95, y: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              onClick={() => navigate('/register')}
              className="rounded-full bg-white px-7 py-3.5 font-semibold text-primary shadow-lg transition hover:bg-slate-50"
            >
              Create Free Account
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95, y: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              onClick={() => navigate('/search')}
              className="rounded-full border-2 border-white/80 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10"
            >
              Browse Properties
            </motion.button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
