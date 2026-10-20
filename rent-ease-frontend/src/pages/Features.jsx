import { motion, useReducedMotion } from 'framer-motion';
import {
  FiSearch, FiMapPin, FiCamera, FiVideo, FiBox, FiPieChart,
  FiHeart, FiSmartphone, FiShield, FiZap, FiBarChart2,
  FiUserCheck, FiList, FiPlus, FiGrid, FiHome
} from 'react-icons/fi';
import { LUXURY_EASE } from '../utils/motionVariants';

const FEATURE_GROUPS = [
  {
    title: 'Property Discovery',
    icon: FiSearch,
    items: [
      { name: 'Smart property search', description: 'Filter by city, area, property type, and rent or sale status in seconds.' },
      { name: 'Advanced filtering', description: 'Refine results by budget, listing type, and preferred location.' },
      { name: 'Featured listings', description: 'Showcase the best properties prominently on the landing page.' },
    ],
  },
  {
    title: 'Tenant Experience',
    icon: FiUserCheck,
    items: [
      { name: 'Favorites list', description: 'Save properties and revisit them anytime for comparison.' },
      { name: 'Property details', description: 'View complete listings, amenities, pricing, and property information.' },
      { name: 'Responsive browsing', description: 'Explore listings smoothly across desktop, tablet, and mobile screens.' },
    ],
  },
  {
    title: 'Landlord Tools',
    icon: FiList,
    items: [
      { name: 'Add new property', description: 'Publish listings with complete details including price, location, and rooms.' },
      { name: 'Manage listings', description: 'Edit, update, and remove properties from one dashboard.' },
      { name: 'Reports and insights', description: 'Track listing performance, views, and interest levels.' },
    ],
  },
  {
    title: 'Media & Visualization',
    icon: FiCamera,
    items: [
      { name: 'Photo gallery uploads', description: 'Landlords can add multiple property photos to create a rich visual showcase.' },
      { name: 'Video walkthroughs', description: 'Upload property videos to help tenants evaluate homes before visiting.' },
      { name: '3D room preview', description: 'Use room dimensions and a Three.js model to visualize the layout clearly.' },
    ],
  },
  {
    title: 'Finance & Planning',
    icon: FiPieChart,
    items: [
      { name: 'Expense calculator', description: 'Break down landlord or tenant costs with a transparent monthly estimate.' },
      { name: 'Budget clarity', description: 'Review charges and insights before making renting or buying decisions.' },
      { name: 'Live analytics', description: 'Use charts and summaries to understand trends and property value.' },
    ],
  },
  {
    title: 'Security & UX',
    icon: FiShield,
    items: [
      { name: 'Protected accounts', description: 'Role-based routes and secure login flow for tenants and landlords.' },
      { name: 'Dark mode', description: 'Switch between light and dark themes for a comfortable experience.' },
      { name: 'Fast interface', description: 'Designed for quick navigation and a clean user experience throughout the app.' },
    ],
  },
];

const FEATURE_SUMMARY = [
  { icon: FiHome, label: 'Property listings' },
  { icon: FiPlus, label: 'Add property' },
  { icon: FiGrid, label: 'Dashboards' },
  { icon: FiBarChart2, label: 'Analytics' },
  { icon: FiHeart, label: 'Saved favourites' },
  { icon: FiMapPin, label: 'Location search' },
  { icon: FiVideo, label: 'Video tours' },
  { icon: FiBox, label: '3D mode' },
  { icon: FiZap, label: 'Fast results' },
  { icon: FiSmartphone, label: 'Mobile-ready UI' },
];

export default function Features() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="section py-16 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: LUXURY_EASE }}
        className="mb-10 text-center"
      >
        <p className="mb-3 inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
          Platform Highlights
        </p>
        <h1 className="font-display text-4xl font-bold md:text-5xl">Everything included in Rent Ease</h1>
        <p className="mx-auto mt-4 max-w-2xl text-ink/60 dark:text-slate-300">
          This platform brings together search, listings, dashboards, media, smart planning, and secure access to make property buying and renting easier for everyone.
        </p>
      </motion.div>

      <div className="mb-14 flex flex-wrap justify-center gap-3">
        {FEATURE_SUMMARY.map(({ icon: Icon, label }, idx) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            whileHover={{ scale: 1.04, y: -2 }}
            transition={{
              delay: shouldReduceMotion ? 0 : idx * 0.03,
              duration: 0.35,
              ease: LUXURY_EASE,
            }}
            className="card flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-default"
          >
            <Icon size={16} className="text-accent" />
            {label}
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {FEATURE_GROUPS.map((group, index) => {
          const Icon = group.icon;

          return (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 22, scale: shouldReduceMotion ? 1 : 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={shouldReduceMotion ? {} : { y: -5, scale: 1.012 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                delay: shouldReduceMotion ? 0 : (index % 3) * 0.08,
                duration: shouldReduceMotion ? 0.2 : 0.5,
                ease: LUXURY_EASE,
              }}
              className="card h-full p-6 transition-shadow duration-300 hover:shadow-xl hover:border-primary/40"
            >
              <motion.div
                initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: shouldReduceMotion ? 0 : 0.15, duration: 0.3, ease: LUXURY_EASE }}
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-[var(--color-champagne)] transition-transform duration-300 group-hover:scale-110"
              >
                <Icon size={22} />
              </motion.div>

              <h2 className="mb-4 font-display text-2xl font-bold">{group.title}</h2>

              <div className="space-y-4">
                {group.items.map((item) => (
                  <div key={item.name} className="rounded-2xl border border-black/10 bg-surface p-4 dark:border-white/10 dark:bg-slate-800/40">
                    <h3 className="mb-1 font-semibold">{item.name}</h3>
                    <p className="text-sm text-ink/60 dark:text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
