import { useId } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Rent Ease — Premium Organic Liquid Button Component
 *
 * Faithfully reproduces the reference asymmetrical fluid liquid-glass button:
 * - Fluid peanut/wave silhouette with top-right wave crest and left bulb
 * - Layered translucent liquid envelope expanding outward
 * - 3D internal refraction & volume depth
 * - Glowing specular meniscus along bottom-left curvature & top-right crest
 * - Subtle organic liquid droplets hugging edges
 * - High-contrast text: Soft White on Sapphire / Midnight Navy on Champagne Gold
 */
export default function LiquidButton({
  to,
  onClick,
  type = 'button',
  variant = 'sapphire', // 'sapphire' | 'cyan' (alias) | 'gold'
  size = 'nav', // 'nav' | 'cta'
  className = '',
  children,
  ...props
}) {
  const shouldReduceMotion = useReducedMotion();
  const rawId = useId();
  const id = `liq-${rawId.replace(/[:]/g, '')}`;

  const isGold = variant === 'gold';
  const isCta = size === 'cta';
  const isBlock = className.includes('w-full');

  // SVG Liquid Engine
  const liquidSvg = (
    <svg
      viewBox="0 0 240 84"
      preserveAspectRatio="none"
      className={`liquid-svg pointer-events-none absolute inset-[-2px] h-[calc(100%+4px)] w-[calc(100%+4px)] overflow-visible ${
        isGold ? 'liquid-svg-gold' : 'liquid-svg-sapphire'
      }`}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Soft blur filter for ambient glow */}
        <filter id={`blur-${id}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.5 0" />
        </filter>

        {isGold ? (
          <>
            {/* Gold Outer translucent envelope gradient (Ice Blue + Champagne Gold) */}
            <linearGradient id={`env-${id}`} x1="0%" y1="30%" x2="100%" y2="70%">
              <stop offset="0%" stopColor="#76D7F5" stopOpacity="0.65" />
              <stop offset="30%" stopColor="#DDBB72" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#B98A3C" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#DDBB72" stopOpacity="0.5" />
            </linearGradient>

            {/* Gold Main body gradient */}
            <linearGradient id={`body-${id}`} x1="0%" y1="20%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#EAD5A5" />
              <stop offset="30%" stopColor="#F5E4BE" />
              <stop offset="65%" stopColor="#DDBB72" />
              <stop offset="90%" stopColor="#C59648" />
              <stop offset="100%" stopColor="#9C7228" />
            </linearGradient>

            {/* Gold 3D gel refraction */}
            <radialGradient id={`gel-${id}`} cx="30%" cy="40%" r="62%">
              <stop offset="0%" stopColor="#FFF8E7" stopOpacity="0.85" />
              <stop offset="45%" stopColor="#DDBB72" stopOpacity="0.4" />
              <stop offset="85%" stopColor="#755013" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#4A3209" stopOpacity="0.9" />
            </radialGradient>

            {/* Gold Specular BL */}
            <linearGradient id={`spec-bl-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#76D7F5" stopOpacity="0" />
              <stop offset="20%" stopColor="#76D7F5" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="100%" stopColor="#FFF2D6" stopOpacity="0" />
            </linearGradient>

            {/* Gold Specular TR */}
            <linearGradient id={`spec-tr-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="75%" stopColor="#FFF8E7" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#DDBB72" stopOpacity="0" />
            </linearGradient>

            {/* Gold Gloss sheet */}
            <linearGradient id={`gloss-${id}`} x1="30%" y1="0%" x2="30%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="30%" stopColor="#FFF8E7" stopOpacity="0.45" />
              <stop offset="75%" stopColor="#DDBB72" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </>
        ) : (
          <>
            {/* Sapphire Outer translucent envelope gradient */}
            <linearGradient id={`env-${id}`} x1="0%" y1="30%" x2="100%" y2="70%">
              <stop offset="0%" stopColor="#76D7F5" stopOpacity="0.8" />
              <stop offset="35%" stopColor="#4678C8" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#102743" stopOpacity="0.75" />
              <stop offset="90%" stopColor="#4678C8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#DDBB72" stopOpacity="0.3" />
            </linearGradient>

            {/* Sapphire Main body gradient */}
            <linearGradient id={`body-${id}`} x1="0%" y1="20%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#76D7F5" />
              <stop offset="22%" stopColor="#4678C8" />
              <stop offset="55%" stopColor="#1C3D68" />
              <stop offset="85%" stopColor="#102743" />
              <stop offset="100%" stopColor="#0B1A2F" />
            </linearGradient>

            {/* Sapphire 3D gel refraction */}
            <radialGradient id={`gel-${id}`} cx="24%" cy="42%" r="60%">
              <stop offset="0%" stopColor="#76D7F5" stopOpacity="0.75" />
              <stop offset="40%" stopColor="#4678C8" stopOpacity="0.35" />
              <stop offset="80%" stopColor="#102743" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#07152B" stopOpacity="0.95" />
            </radialGradient>

            {/* Sapphire Specular BL */}
            <linearGradient id={`spec-bl-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#76D7F5" stopOpacity="0" />
              <stop offset="20%" stopColor="#76D7F5" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="100%" stopColor="#76D7F5" stopOpacity="0" />
            </linearGradient>

            {/* Sapphire Specular TR */}
            <linearGradient id={`spec-tr-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="75%" stopColor="#DDBB72" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#DDBB72" stopOpacity="0" />
            </linearGradient>

            {/* Sapphire Gloss sheet */}
            <linearGradient id={`gloss-${id}`} x1="30%" y1="0%" x2="30%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
              <stop offset="30%" stopColor="#76D7F5" stopOpacity="0.35" />
              <stop offset="75%" stopColor="#4678C8" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </>
        )}
      </defs>

      {/* LAYER 1: Ambient Ethereal Glow Halo */}
      <path
        d="M 18 44 C 18 24, 38 12, 68 18 C 96 24, 114 30, 136 29 C 160 28, 172 8, 198 6 C 224 4, 246 16, 252 34 C 258 50, 244 68, 220 72 C 196 76, 160 70, 130 70 C 98 70, 68 76, 42 72 C 24 69, 18 56, 18 44 Z"
        fill={`url(#env-${id})`}
        filter={`url(#blur-${id})`}
        opacity="0.65"
        className="liquid-ambient-path"
      />

      {/* LAYER 2: Outer Translucent Fluid Envelope */}
      <path
        d="M 15 44 C 15 22, 38 12, 68 17 C 98 22, 116 29, 136 28 C 160 27, 172 7, 198 5 C 226 3, 248 16, 254 36 C 260 54, 244 71, 218 75 C 194 79, 158 73, 128 73 C 96 73, 64 78, 38 74 C 20 71, 15 56, 15 44 Z"
        fill={`url(#env-${id})`}
        opacity="0.8"
      />

      {/* Fluid Droplets hugging silhouette */}
      <g className="liquid-droplets-left">
        <circle cx="8" cy="44" r="3.6" fill="#76D7F5" opacity="0.9" />
        <circle cx="6" cy="32" r="2.2" fill={isGold ? '#DDBB72' : '#76D7F5'} opacity="0.8" />
        <circle cx="11" cy="24" r="1.5" fill="#FFFFFF" opacity="0.75" />
      </g>
      <g className="liquid-droplets-right">
        <ellipse
          cx="236"
          cy="22"
          rx="5.5"
          ry="3.8"
          transform="rotate(-22 236 22)"
          fill={isGold ? '#DDBB72' : '#4678C8'}
          opacity="0.88"
        />
        <ellipse
          cx="236"
          cy="22"
          rx="3.2"
          ry="2"
          transform="rotate(-22 236 22)"
          fill={isGold ? '#FFF8E7' : '#76D7F5'}
          opacity="0.8"
        />
      </g>

      {/* LAYER 3: Main Organic Liquid Glass Body */}
      <path
        d="M 22 44 C 22 26, 42 16, 70 21 C 96 26, 112 32, 132 31 C 154 30, 166 12, 190 10 C 216 8, 236 20, 244 38 C 250 52, 238 67, 214 70 C 190 73, 156 68, 128 68 C 98 68, 68 73, 44 69 C 28 66, 22 56, 22 44 Z"
        fill={`url(#body-${id})`}
      />

      {/* LAYER 4: 3D Gel Refraction & Inner Depth */}
      <path
        d="M 22 44 C 22 26, 42 16, 70 21 C 96 26, 112 32, 132 31 C 154 30, 166 12, 190 10 C 216 8, 236 20, 244 38 C 250 52, 238 67, 214 70 C 190 73, 156 68, 128 68 C 98 68, 68 73, 44 69 C 28 66, 22 56, 22 44 Z"
        fill={`url(#gel-${id})`}
      />

      {/* LAYER 5: Perimeter Luminous Contour Stroke */}
      <path
        d="M 22 44 C 22 26, 42 16, 70 21 C 96 26, 112 32, 132 31 C 154 30, 166 12, 190 10 C 216 8, 236 20, 244 38 C 250 52, 238 67, 214 70 C 190 73, 156 68, 128 68 C 98 68, 68 73, 44 69 C 28 66, 22 56, 22 44 Z"
        fill="none"
        stroke={isGold ? 'rgba(255, 248, 231, 0.85)' : 'rgba(118, 215, 245, 0.65)'}
        strokeWidth="1.8"
      />

      {/* LAYER 6: Glossy Specular Sheet Reflection across upper surface */}
      <path
        d="M 28 42 C 28 28, 44 20, 70 24 C 94 28, 112 34, 132 33 C 154 32, 166 16, 190 14 C 212 12, 228 22, 236 34 C 222 38, 186 36, 144 39 C 104 42, 60 46, 28 42 Z"
        fill={`url(#gloss-${id})`}
        opacity={isGold ? 0.85 : 0.8}
      />

      {/* LAYER 7: Specular Highlights Meniscus */}
      <path
        d="M 26 53 C 27 63, 38 68, 60 68 C 82 68, 104 67, 120 67"
        fill="none"
        stroke={`url(#spec-bl-${id})`}
        strokeWidth="3.5"
        strokeLinecap="round"
        className="liquid-meniscus-path"
      />
      <path
        d="M 26 53 C 27 63, 38 68, 60 68 C 82 68, 104 67, 120 67"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity={0.95}
        className="liquid-meniscus-path"
      />

      <path
        d="M 152 24 C 166 14, 180 11, 196 12 C 214 13, 228 19, 238 30"
        fill="none"
        stroke={`url(#spec-tr-${id})`}
        strokeWidth="3"
        strokeLinecap="round"
        className="liquid-meniscus-path"
      />
      <path
        d="M 160 19 C 172 13, 184 12, 198 13 C 212 14, 222 18, 230 25"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.95}
        className="liquid-meniscus-path"
      />
    </svg>
  );

  // Surface light sweep sheen on hover
  const hoverShimmer = <span aria-hidden="true" className="liquid-hover-shimmer pointer-events-none" />;

  // Label content
  const labelContent = (
    <span
      className={`liquid-button-content relative z-10 flex items-center justify-center gap-2 select-none pointer-events-none transition-colors duration-200 ${
        isGold
          ? 'text-[#07152B] font-extrabold tracking-wide'
          : 'text-[#F7F8FC] font-bold tracking-wide drop-shadow-[0_1.5px_3px_rgba(7,21,43,0.85)]'
      } ${
        isCta
          ? 'text-base sm:text-lg font-bold px-7 sm:px-8'
          : 'text-xs sm:text-sm font-semibold px-4 sm:px-5'
      }`}
    >
      {children}
    </span>
  );

  // Dimensions
  const sizeClasses = isCta
    ? isGold
      ? 'min-w-[215px] sm:min-w-[235px] h-[58px] sm:h-[62px]'
      : 'min-w-[195px] sm:min-w-[215px] h-[58px] sm:h-[62px]'
    : isGold
      ? 'min-w-[136px] sm:min-w-[145px] h-[46px] sm:h-[48px]'
      : 'min-w-[116px] sm:min-w-[124px] h-[44px] sm:h-[46px]';

  const rootClasses = `liquid-btn-wrapper group relative inline-flex items-center justify-center isolate text-center transition-all duration-300 ${sizeClasses} ${
    isBlock ? 'w-full' : ''
  } ${className}`;

  const wrapperClasses = isBlock ? 'block w-full' : 'inline-block';

  if (to) {
    return (
      <motion.div
        whileHover={shouldReduceMotion ? {} : { scale: 1.03, y: -2 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.97, y: 1 }}
        transition={{ type: 'spring', stiffness: 450, damping: 24 }}
        className={wrapperClasses}
      >
        <Link to={to} className={rootClasses} onClick={onClick} {...props}>
          {liquidSvg}
          {hoverShimmer}
          {labelContent}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      type={type}
      whileHover={shouldReduceMotion ? {} : { scale: 1.03, y: -2 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.97, y: 1 }}
      transition={{ type: 'spring', stiffness: 450, damping: 24 }}
      onClick={onClick}
      className={rootClasses}
      {...props}
    >
      {liquidSvg}
      {hoverShimmer}
      {labelContent}
    </motion.button>
  );
}
