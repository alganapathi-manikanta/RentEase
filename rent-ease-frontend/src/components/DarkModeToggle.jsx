import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMoon, FiSun } from 'react-icons/fi';

export default function DarkModeToggle({ className = '' }) {
  const getIsDark = () => {
    const saved = localStorage.getItem('rentease_theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    if (saved === 'system') {
      return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  };

  const [dark, setDark] = useState(getIsDark);

  useEffect(() => {
    const syncTheme = () => setDark(getIsDark());
    window.addEventListener('rentease_theme_change', syncTheme);
    return () => window.removeEventListener('rentease_theme_change', syncTheme);
  }, []);

  const handleToggle = () => {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
    localStorage.setItem('rentease_theme', nextDark ? 'dark' : 'light');
    window.dispatchEvent(new Event('rentease_theme_change'));
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92, rotate: dark ? -20 : 20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={handleToggle}
      aria-label="Toggle dark mode"
      className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-black/10 text-ink/70 transition-colors duration-300 hover:bg-black/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10 ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={dark ? 'dark' : 'light'}
          initial={{ y: -16, opacity: 0, rotate: -45, scale: 0.7 }}
          animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
          exit={{ y: 16, opacity: 0, rotate: 45, scale: 0.7 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center"
        >
          {dark ? <FiSun size={18} className="text-amber-400" /> : <FiMoon size={18} />}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
