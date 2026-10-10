import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import rentEaseEmblem from '../assets/rent-ease-emblem.png';

const LUXURY_EASE = [0.16, 1, 0.3, 1];

// Session-level flag: ensures the opening animation plays on initial page entry or refresh,
// but never repeats during internal client-side navigation within the same session.
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

    // Auto-advance after 3.6 seconds: overall sequence with dissolve is ~4.1s
    timerRef.current = setTimeout(() => {
      handleFinish();
    }, 3600);

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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.45, ease: 'easeOut' } }}
          exit={{
            opacity: 0,
            scale: 1.015,
            transition: { duration: 0.65, ease: LUXURY_EASE },
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#07152B] px-4 select-none"
          style={{
            background: 'radial-gradient(circle at 50% 45%, #0e2038 0%, #07152B 65%, #030813 100%)',
          }}
          aria-label="Rent Ease Welcome Animation"
          role="dialog"
          aria-modal="true"
        >
          {/* Subtle Golden Ambient Glow Blooming in Background */}
          <motion.div
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 0.35, scale: 1.15 }}
            transition={{ duration: 2.0, ease: LUXURY_EASE }}
            className="pointer-events-none absolute h-80 w-80 sm:h-[440px] sm:w-[440px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(221, 187, 114, 0.24) 0%, rgba(221, 187, 114, 0.05) 55%, transparent 70%)',
              filter: 'blur(44px)',
            }}
          />

          {/* Skip Button */}
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            onClick={handleFinish}
            className="absolute top-5 right-5 sm:top-7 sm:right-7 z-50 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/75 backdrop-blur-sm transition-all hover:border-[#DDBB72]/70 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-1 focus:ring-[#DDBB72]"
            aria-label="Skip intro animation"
          >
            Skip ✕
          </motion.button>

          {/* Central Architectural Composition: Golden House Outline & Rent Ease Emblem */}
          <div className="relative flex flex-col items-center justify-center">
            {/* Architectural House Framing */}
            <div className="relative flex items-center justify-center w-60 h-52 sm:w-72 sm:h-64">
              <svg
                viewBox="0 0 240 200"
                className="absolute inset-0 h-full w-full pointer-events-none overflow-visible"
                style={{ filter: 'drop-shadow(0 0 10px rgba(221, 187, 114, 0.45))' }}
              >
                <defs>
                  {/* Soft golden sweep gradient */}
                  <linearGradient id="intro-sweep-beam" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFF5DF" stopOpacity="0" />
                    <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                    <stop offset="100%" stopColor="#DDBB72" stopOpacity="0" />
                  </linearGradient>

                  <filter id="intro-light-glow" x="-25%" y="-25%" width="150%" height="150%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* 1. Thin Champagne-Gold Roof Gable (Draws smoothly from left eave to right eave) */}
                <motion.path
                  d="M 24 96 L 120 20 L 216 96"
                  fill="none"
                  stroke="#DDBB72"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.1, delay: 0.3, ease: LUXURY_EASE }}
                />

                {/* 2. Architectural Chimney on Roof Slope */}
                <motion.path
                  d="M 166 56 L 166 32 L 182 32 L 182 68"
                  fill="none"
                  stroke="#DDBB72"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.85 }}
                  transition={{ duration: 0.6, delay: 0.75, ease: LUXURY_EASE }}
                />

                {/* 3. House Walls (Drawing smoothly downwards) */}
                <motion.path
                  d="M 46 92 L 46 176 L 194 176 L 194 92"
                  fill="none"
                  stroke="#DDBB72"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.9, delay: 1.0, ease: LUXURY_EASE }}
                />

                {/* 4. Foundation Baseline */}
                <motion.path
                  d="M 28 176 L 212 176"
                  fill="none"
                  stroke="#DDBB72"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.4, ease: LUXURY_EASE }}
                />

                {/* 5. Elegant Arched Entrance at Base */}
                <motion.path
                  d="M 106 176 L 106 146 A 14 14 0 0 1 134 146 L 134 176"
                  fill="none"
                  stroke="#DDBB72"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.9 }}
                  transition={{ duration: 0.55, delay: 1.55, ease: LUXURY_EASE }}
                />

                {/* 6. Golden Light Sweep Reflection Travelling Along Completed Roofline */}
                <motion.path
                  d="M 24 96 L 120 20 L 216 96"
                  fill="none"
                  stroke="url(#intro-sweep-beam)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0.22, pathOffset: 0, opacity: 0 }}
                  animate={{
                    pathOffset: [0, 0.78],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    delay: 2.05,
                    duration: 0.95,
                    ease: 'easeInOut',
                  }}
                  filter="url(#intro-light-glow)"
                />

                {/* Sparkling Light Head on Roof Sweep */}
                <motion.circle
                  r="3.5"
                  fill="#FFFFFF"
                  initial={{ opacity: 0, cx: 24, cy: 96 }}
                  animate={{
                    cx: [24, 120, 216],
                    cy: [96, 20, 96],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    delay: 2.05,
                    duration: 0.95,
                    ease: 'easeInOut',
                  }}
                  filter="url(#intro-light-glow)"
                />
              </svg>

              {/* Official Rent Ease Emblem Floating Naturally Inside Golden House */}
              <motion.div
                initial={{
                  opacity: 0,
                  y: 12,
                  scale: 0.88,
                  filter: 'drop-shadow(0 0 0px rgba(221,187,114,0))',
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: 'drop-shadow(0 0 24px rgba(221,187,114,0.65))',
                }}
                transition={{ duration: 0.85, delay: 1.6, ease: LUXURY_EASE }}
                className="relative z-10 -mt-2"
              >
                <img
                  src={rentEaseEmblem}
                  alt="Rent Ease Emblem"
                  className="h-20 w-20 sm:h-24 sm:w-24 object-contain select-none"
                  style={{
                    mixBlendMode: 'screen',
                    filter: 'contrast(1.6) brightness(0.92)',
                    maskImage: 'radial-gradient(circle at 50% 50%, black 48%, transparent 68%)',
                    WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 48%, transparent 68%)',
                  }}
                />
              </motion.div>
            </div>

            {/* RENT EASE Brand Typography */}
            <motion.div
              initial={{ opacity: 0, y: 10, letterSpacing: '0.18em' }}
              animate={{ opacity: 1, y: 0, letterSpacing: '0.28em' }}
              transition={{ duration: 0.75, delay: 2.35, ease: LUXURY_EASE }}
              className="mt-6 text-center select-none"
            >
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-[0.28em] text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5DF] via-[#DDBB72] to-[#B98A3C] drop-shadow-[0_2px_14px_rgba(221,187,114,0.4)]">
                RENT EASE
              </h1>
            </motion.div>

            {/* Tagline: “Find Your Place. Feel at Home.” */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 2.65, ease: LUXURY_EASE }}
              className="mt-2.5 flex items-center justify-center gap-3 text-center select-none"
            >
              <span className="h-px w-6 sm:w-10 bg-gradient-to-r from-transparent to-[#DDBB72]/70" />
              <p className="text-xs sm:text-sm font-light tracking-[0.22em] uppercase text-[#F7F8FC]/90">
                Find Your Place. Feel at Home.
              </p>
              <span className="h-px w-6 sm:w-10 bg-gradient-to-l from-transparent to-[#DDBB72]/70" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
