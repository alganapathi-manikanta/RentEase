import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import rentEaseEmblem from '../assets/rent-ease-emblem.png';

const LUXURY_EASE = [0.16, 1, 0.3, 1];

// Module-level session flag: ensures the opening animation plays on initial page entry or refresh,
// but NEVER repeats during internal client-side navigation within the same SPA session.
let hasIntroPlayedInSession = false;

export default function WebsiteIntro() {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  // Only display on homepage ('/') and only once per site entry / browser refresh session
  const shouldRun = location.pathname === '/' && !hasIntroPlayedInSession;

  const [isVisible, setIsVisible] = useState(() => shouldRun && !shouldReduceMotion);
  const timerRef = useRef(null);

  const handleFinish = useCallback(() => {
    hasIntroPlayedInSession = true;
    setIsVisible(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // If reduced motion is requested or not on homepage, complete immediately without animation
    if (!shouldRun || shouldReduceMotion) {
      hasIntroPlayedInSession = true;
      setIsVisible(false);
      return;
    }

    // Auto-advance after 2.45 seconds: total intro duration including dissolve transition is ~2.8s
    timerRef.current = setTimeout(() => {
      handleFinish();
    }, 2450);

    // Keyboard listener: Escape key immediately skips the intro
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shouldRun, shouldReduceMotion, handleFinish]);

  // If already played or skipped, unmount entirely
  if (!shouldRun && !isVisible) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="website-intro-overlay"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.03,
            transition: { duration: 0.45, ease: LUXURY_EASE },
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#070d17] px-4 select-none"
          style={{
            background: 'radial-gradient(circle at 50% 45%, #0f1c31 0%, #070d17 70%, #03060c 100%)',
          }}
          aria-label="Rent Ease Welcome Animation"
          role="dialog"
          aria-modal="true"
        >
          {/* Subtle Golden Ambient Glow Blooming in Background */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 0.45, scale: 1.15 }}
            transition={{ duration: 1.4, ease: LUXURY_EASE }}
            className="pointer-events-none absolute h-72 w-72 sm:h-96 sm:w-96 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(212, 168, 79, 0.28) 0%, rgba(212, 168, 79, 0.08) 50%, transparent 70%)',
              filter: 'blur(32px)',
            }}
          />

          {/* Skip Button */}
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.3 }}
            onClick={handleFinish}
            className="absolute top-5 right-5 sm:top-7 sm:right-7 z-50 rounded-full border border-white/20 bg-white/5 px-3.5 py-1 text-xs font-medium text-white/70 backdrop-blur-sm transition-all hover:border-[#d4a84f]/60 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-1 focus:ring-[#d4a84f]"
            aria-label="Skip intro animation"
          >
            Skip ✕
          </motion.button>

          {/* Central Architectural Composition: SVG House Outline & Emblem */}
          <div className="relative flex flex-col items-center justify-center">
            {/* SVG House Outline Framing */}
            <div className="relative flex items-center justify-center w-52 h-44 sm:w-64 sm:h-56">
              <svg
                viewBox="0 0 240 200"
                className="absolute inset-0 h-full w-full pointer-events-none"
                style={{ filter: 'drop-shadow(0 0 8px rgba(212, 168, 79, 0.4))' }}
              >
                {/* 1. Thin Golden Gable / Roof Apex */}
                <motion.path
                  d="M 24 94 L 120 22 L 216 94"
                  fill="none"
                  stroke="#d4a84f"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: LUXURY_EASE }}
                />

                {/* 2. Architectural Chimney on Roof Slope */}
                <motion.path
                  d="M 164 54 L 164 30 L 180 30 L 180 66"
                  fill="none"
                  stroke="#d4a84f"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.15, ease: LUXURY_EASE }}
                />

                {/* 3. House Walls */}
                <motion.path
                  d="M 46 88 L 46 172 L 194 172 L 194 88"
                  fill="none"
                  stroke="#d4a84f"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.25, ease: LUXURY_EASE }}
                />

                {/* 4. Ground Foundation Baseline */}
                <motion.path
                  d="M 28 172 L 212 172"
                  fill="none"
                  stroke="#d4a84f"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.45, ease: LUXURY_EASE }}
                />

                {/* 5. Elegant Arched Entrance at Base */}
                <motion.path
                  d="M 106 172 L 106 142 A 14 14 0 0 1 134 142 L 134 172"
                  fill="none"
                  stroke="#d4a84f"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.55, delay: 0.5, ease: LUXURY_EASE }}
                />
              </svg>

              {/* Existing Rent Ease Emblem with Subtle Golden Glow */}
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.72,
                  filter: 'drop-shadow(0 0 0px rgba(212,168,79,0))',
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  filter: 'drop-shadow(0 0 22px rgba(212,168,79,0.55))',
                }}
                transition={{ duration: 0.7, delay: 0.5, ease: LUXURY_EASE }}
                className="relative z-10 -mt-2"
              >
                <img
                  src={rentEaseEmblem}
                  alt="Rent Ease Emblem"
                  className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-md"
                />
              </motion.div>
            </div>

            {/* RENT EASE Brand Typography */}
            <motion.div
              initial={{ opacity: 0, y: 12, letterSpacing: '0.14em' }}
              animate={{ opacity: 1, y: 0, letterSpacing: '0.26em' }}
              transition={{ duration: 0.65, delay: 0.9, ease: LUXURY_EASE }}
              className="mt-6 text-center"
            >
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-[0.26em] text-transparent bg-clip-text bg-gradient-to-r from-[#f0d18a] via-[#d4a84f] to-[#f0d18a] drop-shadow-[0_2px_14px_rgba(212,168,79,0.35)]">
                RENT EASE
              </h1>
            </motion.div>

            {/* Tagline: “Find Your Place. Feel at Home.” */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.3, ease: LUXURY_EASE }}
              className="mt-2.5 flex items-center justify-center gap-2.5 text-center"
            >
              <span className="h-px w-5 sm:w-8 bg-gradient-to-r from-transparent to-[#d4a84f]/60" />
              <p className="text-xs sm:text-sm font-light tracking-[0.18em] uppercase text-[#f2e5c8]/90">
                Find Your Place. Feel at Home.
              </p>
              <span className="h-px w-5 sm:w-8 bg-gradient-to-l from-transparent to-[#d4a84f]/60" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
