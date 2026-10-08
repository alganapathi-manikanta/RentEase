import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export default function PageTransition({ children, className = '' }) {
  const { pathname } = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const variants = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, y: 22, scale: 0.986 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -14, scale: 0.992 },
        transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={pathname}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={variants.transition}
        className={className}
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}