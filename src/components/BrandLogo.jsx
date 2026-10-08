import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import rentEaseEmblem from '../assets/rent-ease-emblem.png';
import rentEaseText from '../assets/rent-ease-text.jpg';

export default function BrandLogo({ tone = 'default', size = 'navbar', className = '' }) {
  const location = useLocation();

  const handleLogoClick = (event) => {
    // Allow normal browser handling for special clicks (new tab, etc.)
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    if (location.pathname === '/') {
      // Already on Home page: smoothly scroll to the very top without page reload
      event.preventDefault();
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } else {
      // Navigating from another page: ensure the Home page starts from the very beginning/top
      window.scrollTo(0, 0);
    }
  };

  return (
    <Link
      to="/"
      onClick={handleLogoClick}
      aria-label="Rent Ease Home"
      aria-current={location.pathname === '/' ? 'page' : undefined}
      className={`brand-logo group inline-flex shrink-0 items-center select-none ${className}`}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center"
      >
        {/* R&E Crown / Wreath Logo Image on Far Left */}
        <img
          src={rentEaseEmblem}
          alt="Rent Ease Emblem"
          decoding="async"
          className="h-8 w-8 sm:h-10 sm:w-10 md:h-11 md:w-11 lg:h-[46px] lg:w-[46px] aspect-square object-contain rounded-md shadow-sm select-none"
        />

        {/* Subtle vertical gold divider between emblem and branding */}
        <div
          className="mx-1.5 sm:mx-2.5 lg:mx-3 h-5 sm:h-6 lg:h-7 w-[1.5px] rounded-full self-center bg-gradient-to-b from-[#d4a84f]/25 via-[#d4a84f]/70 to-[#d4a84f]/25 shrink-0"
          aria-hidden="true"
        />

        {/* Rent Ease Branding Image ("RENTEASE / SALE/RENTAL PROPERTIES") */}
        <img
          src={rentEaseText}
          alt="Rent Ease - Sale / Rental Properties"
          decoding="async"
          className="h-4 sm:h-6 md:h-[26px] lg:h-[30px] w-auto max-w-[110px] sm:max-w-[145px] md:max-w-[165px] lg:max-w-[185px] object-contain rounded-sm select-none"
        />
      </motion.div>
    </Link>
  );
}
