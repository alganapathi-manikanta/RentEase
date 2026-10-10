/**
 * Unified Framer Motion animation tokens and variants for Rent Ease.
 * Provides consistent luxury easing curves, spring physics, and reusable component variants.
 */

// Premium real-estate easing curves
export const LUXURY_EASE = [0.16, 1, 0.3, 1];
export const ACCELERATE_EASE = [0.4, 0, 1, 1];
export const DECELERATE_EASE = [0, 0, 0.2, 1];

// Spring physics configurations
export const SMOOTH_SPRING = {
  type: 'spring',
  stiffness: 350,
  damping: 28,
  mass: 0.8,
};

export const GENTLE_SPRING = {
  type: 'spring',
  stiffness: 240,
  damping: 24,
  mass: 1,
};

export const BOUNCE_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 18,
  mass: 0.6,
};

export const HEART_SPRING = {
  type: 'spring',
  stiffness: 500,
  damping: 15,
};

// Reusable variant creators with reduced-motion support
export const createFadeInUp = (distance = 22, duration = 0.52) => ({
  hidden: { opacity: 0, y: distance },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration, ease: LUXURY_EASE },
  },
  exit: {
    opacity: 0,
    y: -distance * 0.5,
    transition: { duration: duration * 0.6, ease: ACCELERATE_EASE },
  },
});

export const createFadeInDown = (distance = 20, duration = 0.45) => ({
  hidden: { opacity: 0, y: -distance },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration, ease: LUXURY_EASE },
  },
  exit: {
    opacity: 0,
    y: distance * 0.5,
    transition: { duration: duration * 0.6, ease: ACCELERATE_EASE },
  },
});

export const createFadeInScale = (scaleFrom = 0.96, duration = 0.45) => ({
  hidden: { opacity: 0, scale: scaleFrom },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration, ease: LUXURY_EASE },
  },
  exit: {
    opacity: 0,
    scale: scaleFrom,
    transition: { duration: duration * 0.6, ease: ACCELERATE_EASE },
  },
});

export const createStaggerContainer = (staggerChildren = 0.08, delayChildren = 0.04) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

// Interactive hover/tap variants
export const buttonTapVariants = {
  hover: { scale: 1.025, y: -1, transition: { duration: 0.18, ease: LUXURY_EASE } },
  tap: { scale: 0.968, y: 1, transition: { duration: 0.12, ease: LUXURY_EASE } },
};

export const iconButtonTapVariants = {
  hover: { scale: 1.1, transition: { type: 'spring', stiffness: 400, damping: 20 } },
  tap: { scale: 0.9, transition: { type: 'spring', stiffness: 450, damping: 20 } },
};

export const cardHoverVariants = {
  hover: {
    y: -5,
    scale: 1.012,
    transition: { duration: 0.28, ease: LUXURY_EASE },
  },
  tap: {
    scale: 0.988,
    transition: { duration: 0.15, ease: LUXURY_EASE },
  },
};

// Modal and dialog animations
export const backdropFadeVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.26, ease: DECELERATE_EASE },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: ACCELERATE_EASE },
  },
};

export const modalScaleVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.36,
      ease: LUXURY_EASE,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 12,
    transition: {
      duration: 0.22,
      ease: ACCELERATE_EASE,
    },
  },
};

// Drawer navigation panel
export const drawerSlideVariants = (fromLeft = false) => ({
  hidden: {
    x: fromLeft ? '-100%' : '100%',
    opacity: 0.8,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 340,
      damping: 32,
    },
  },
  exit: {
    x: fromLeft ? '-100%' : '100%',
    opacity: 0,
    transition: {
      duration: 0.25,
      ease: ACCELERATE_EASE,
    },
  },
});
