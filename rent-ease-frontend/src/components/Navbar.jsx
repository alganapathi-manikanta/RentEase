import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FiX, FiUser, FiLogOut, FiSettings, FiChevronRight, FiHeart } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useInfoModal } from '../context/InfoModalContext';
import DarkModeToggle from './DarkModeToggle';
import BrandLogo from './BrandLogo';
import LiquidButton from './LiquidButton';
import { LUXURY_EASE, SMOOTH_SPRING } from '../utils/motionVariants';

function NavItem({ to, children, end = false, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative px-3 py-1.5 text-sm font-medium tracking-wide transition-colors duration-200 ${
          isActive ? 'text-white font-semibold' : 'text-slate-200/85 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <motion.span whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
            {children}
          </motion.span>
          <motion.span
            className="absolute bottom-0 left-2.5 right-2.5 h-[2px] rounded-full bg-[#D5A348] origin-center"
            initial={false}
            animate={{
              scaleX: isActive ? 1 : 0,
              opacity: isActive ? 1 : 0,
              boxShadow: isActive ? '0 0 10px rgba(213,163,72,0.55)' : 'none',
            }}
            transition={{ duration: 0.28, ease: LUXURY_EASE }}
          />
        </>
      )}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { openModal } = useInfoModal();
  const [open, setOpen] = useState(false);
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false);
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const isTenant = user?.role === 'tenant';

  const handleLogout = () => {
    logout();
    setTenantMenuOpen(false);
    navigate('/');
  };

  const closeTenantMenu = () => setTenantMenuOpen(false);

  // Stagger variants for mobile drawer items
  const menuContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.05,
        delayChildren: shouldReduceMotion ? 0 : 0.08,
      },
    },
  };

  const menuItemVariants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.32, ease: LUXURY_EASE },
    },
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: LUXURY_EASE }}
        className="fixed inset-x-0 top-0 z-[110] bg-[#14263D]/90 backdrop-blur-md border-b border-[#D5A348]/20 shadow-[0_8px_32px_rgba(13,25,41,0.25)] transition-colors"
        style={{ height: '72px' }}
      >
        <nav className="section relative flex h-full items-center justify-between gap-4">
          {isTenant && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 450, damping: 22 }}
              onClick={() => setTenantMenuOpen((prev) => !prev)}
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#D5A348]/35 bg-white/5 text-white transition hover:bg-[#D5A348]/15 hover:border-[#D5A348]/60"
              aria-label={tenantMenuOpen ? 'Close tenant menu' : 'Open tenant menu'}
              aria-expanded={tenantMenuOpen}
            >
              <span className="relative block h-[18px] w-[18px]" aria-hidden="true">
                <motion.span
                  className="absolute left-[2px] right-[2px] top-[4px] h-[1.5px] rounded-full bg-current"
                  animate={tenantMenuOpen ? { top: 8, rotate: 45 } : { top: 4, rotate: 0 }}
                  transition={{ duration: 0.25, ease: LUXURY_EASE }}
                />
                <motion.span
                  className="absolute left-[2px] right-[2px] top-[8px] h-[1.5px] rounded-full bg-current"
                  animate={tenantMenuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.2, ease: LUXURY_EASE }}
                />
                <motion.span
                  className="absolute left-[2px] right-[2px] top-[12px] h-[1.5px] rounded-full bg-current"
                  animate={tenantMenuOpen ? { top: 8, rotate: -45 } : { top: 12, rotate: 0 }}
                  transition={{ duration: 0.25, ease: LUXURY_EASE }}
                />
              </span>
            </motion.button>
          )}

          {/* Left Branding: R&E Crown Emblem + Vertical Gold Divider + Rent Ease Branding Image */}
          <motion.div
            className="flex items-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2, ease: LUXURY_EASE }}
          >
            <BrandLogo tone="inverse" size="navbar" className={isTenant ? 'ml-10 sm:ml-12' : ''} />
          </motion.div>

          {/* Navigation Links: Home, Properties, Features, About, Help */}
          <div className="hidden flex-1 items-center justify-center gap-6 xl:gap-8 lg:flex">
            <NavItem to="/" end>Home</NavItem>
            <NavItem to="/search">Properties</NavItem>
            <NavItem to="/features">Features</NavItem>
            <button
              type="button"
              onClick={() => openModal('about')}
              className="group relative px-3 py-1.5 text-sm font-medium tracking-wide text-slate-200/85 transition-colors duration-200 hover:text-white"
            >
              <motion.span whileHover={{ y: -1 }} transition={{ duration: 0.15 }} className="inline-block">
                About
              </motion.span>
              <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] rounded-full bg-[#D5A348] scale-x-0 opacity-0 transition-all duration-300 origin-center group-hover:scale-x-100 group-hover:opacity-100" />
            </button>
            <NavItem to="/help">Help</NavItem>
            {isTenant && (
              <NavItem to="/tenant/wishlist">
                <span className="inline-flex items-center gap-1.5">
                  <FiHeart size={14} /> Wishlist
                </span>
              </NavItem>
            )}
            {user?.role === 'landlord' && (
              <NavItem to="/landlord/add-property">List Property</NavItem>
            )}
          </div>

          {/* Right Side: Theme Toggle, Login, Gold Get Started Button */}
          <div className="hidden items-center gap-3 lg:flex">
            <DarkModeToggle className="navbar-theme-toggle" />
            {user ? (
              <>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to={user.role === 'admin' ? '/admin' : user.role === 'landlord' ? '/landlord/profile' : '/tenant/profile'}
                    className="navbar-account inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    <FiUser size={14} /> Profile
                  </Link>
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLogout}
                  className="navbar-logout inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-full border border-[#D5A348]/40 text-[#D5A348] hover:bg-[#D5A348]/10 transition-colors"
                >
                  <FiLogOut size={14} /> Logout
                </motion.button>
              </>
            ) : (
              <>
                <LiquidButton to="/login" variant="sapphire" size="nav">
                  Login
                </LiquidButton>
                <LiquidButton to="/register" variant="gold" size="nav">
                  Get Started
                </LiquidButton>
              </>
            )}
          </div>

          {/* Mobile / Tablet Controls */}
          <div className="flex items-center gap-2 lg:hidden">
            <DarkModeToggle className="navbar-theme-toggle" />
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 450, damping: 22 }}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10 transition focus:outline-none"
              onClick={() => setOpen((prev) => !prev)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              <span className="relative block h-[18px] w-[18px]" aria-hidden="true">
                <motion.span
                  className="absolute left-[1px] right-[1px] top-[3px] h-[2px] rounded-full bg-current"
                  animate={open ? { top: 8, rotate: 45 } : { top: 3, rotate: 0 }}
                  transition={{ duration: 0.24, ease: LUXURY_EASE }}
                />
                <motion.span
                  className="absolute left-[1px] right-[1px] top-[8px] h-[2px] rounded-full bg-current"
                  animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.18, ease: LUXURY_EASE }}
                />
                <motion.span
                  className="absolute left-[1px] right-[1px] top-[13px] h-[2px] rounded-full bg-current"
                  animate={open ? { top: 8, rotate: -45 } : { top: 13, rotate: 0 }}
                  transition={{ duration: 0.24, ease: LUXURY_EASE }}
                />
              </span>
            </motion.button>
          </div>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
              className="fixed inset-x-0 bottom-0 top-[72px] z-50 bg-black/55 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            >
              <motion.div
                initial={{ x: '100%', opacity: 0.8 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={SMOOTH_SPRING}
                className="ml-auto flex h-full w-72 max-w-[85vw] flex-col gap-6 bg-[#0D1929]/95 backdrop-blur-xl p-6 shadow-2xl overflow-y-auto border-l border-[#D5A348]/20"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="font-display text-lg font-bold text-white">Menu</span>
                  <motion.button
                    whileHover={{ scale: 1.12, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                    onClick={() => setOpen(false)}
                    className="text-white p-1 rounded-lg hover:bg-white/10"
                    aria-label="Close menu"
                  >
                    <FiX size={20} />
                  </motion.button>
                </div>

                <motion.nav
                  variants={menuContainerVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col gap-2"
                >
                  <motion.div variants={menuItemVariants}>
                    <NavItem to="/" end onClick={() => setOpen(false)}>Home</NavItem>
                  </motion.div>
                  <motion.div variants={menuItemVariants}>
                    <NavItem to="/search" onClick={() => setOpen(false)}>Properties</NavItem>
                  </motion.div>
                  <motion.div variants={menuItemVariants}>
                    <NavItem to="/features" onClick={() => setOpen(false)}>Features</NavItem>
                  </motion.div>
                  <motion.div variants={menuItemVariants}>
                    <button
                      type="button"
                      onClick={() => {
                        openModal('about');
                        setOpen(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm font-medium tracking-wide text-slate-200/85 hover:text-white transition-colors"
                    >
                      About
                    </button>
                  </motion.div>
                  <motion.div variants={menuItemVariants}>
                    <NavItem to="/help" onClick={() => setOpen(false)}>Help</NavItem>
                  </motion.div>
                  {isTenant && (
                    <motion.div variants={menuItemVariants}>
                      <NavItem to="/tenant/wishlist" onClick={() => setOpen(false)}>
                        <span className="inline-flex items-center gap-1.5">
                          <FiHeart size={14} /> Wishlist
                        </span>
                      </NavItem>
                    </motion.div>
                  )}
                  {user?.role === 'landlord' && (
                    <motion.div variants={menuItemVariants}>
                      <NavItem to="/landlord/add-property" onClick={() => setOpen(false)}>List Property</NavItem>
                    </motion.div>
                  )}
                </motion.nav>

                <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-4">
                  <DarkModeToggle className="navbar-theme-toggle self-start" />
                  {user ? (
                    <>
                      <motion.div whileTap={{ scale: 0.97 }}>
                        <Link
                          to={user.role === 'admin' ? '/admin' : user.role === 'landlord' ? '/landlord/profile' : '/tenant/profile'}
                          className="btn-outline text-center w-full block"
                          onClick={() => setOpen(false)}
                        >
                          Profile
                        </Link>
                      </motion.div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleLogout}
                        className="navbar-logout btn-outline w-full"
                      >
                        Logout
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <LiquidButton
                        to="/login"
                        variant="sapphire"
                        size="nav"
                        className="w-full text-center"
                        onClick={() => setOpen(false)}
                      >
                        Login
                      </LiquidButton>
                      <LiquidButton
                        to="/register"
                        variant="gold"
                        size="nav"
                        className="w-full text-center"
                        onClick={() => setOpen(false)}
                      >
                        Get Started
                      </LiquidButton>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <AnimatePresence>
        {isTenant && tenantMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
              className="fixed inset-x-0 bottom-0 top-[72px] z-40 bg-black/45 backdrop-blur-xs"
              onClick={closeTenantMenu}
            />
            <motion.aside
              initial={{ x: '-100%', opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={SMOOTH_SPRING}
              className="fixed left-0 top-[72px] z-50 flex h-[calc(100vh-72px)] w-72 max-w-[85vw] flex-col bg-white/95 dark:bg-[#0D1929]/95 backdrop-blur-xl p-5 shadow-2xl overflow-y-auto border-r border-[#14263D]/10 dark:border-[#D5A348]/20"
            >
              <div className="mb-6 flex items-center justify-between">
                <BrandLogo tone="default" size="sidebar" />
                <motion.button
                  whileHover={{ scale: 1.12, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                  onClick={closeTenantMenu}
                  className="rounded-full p-2 text-ink/50 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/5"
                  aria-label="Close tenant menu"
                >
                  <FiX size={18} />
                </motion.button>
              </div>

              <div className="mb-5 border-b border-black/5 pb-4 dark:border-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/40 dark:text-slate-500">Tenant Panel</p>
              </div>

              <motion.nav
                variants={menuContainerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                <motion.div variants={menuItemVariants}>
                  <motion.button
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                    onClick={() => { navigate('/tenant/profile'); closeTenantMenu(); }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-ink/70 transition hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    <span className="flex items-center gap-3"><FiUser size={16} /> Profile</span>
                    <FiChevronRight size={14} />
                  </motion.button>
                </motion.div>
                <motion.div variants={menuItemVariants}>
                  <motion.button
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                    onClick={() => { navigate('/tenant/settings'); closeTenantMenu(); }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-ink/70 transition hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    <span className="flex items-center gap-3"><FiSettings size={16} /> Settings</span>
                    <FiChevronRight size={14} />
                  </motion.button>
                </motion.div>
                <motion.div variants={menuItemVariants}>
                  <motion.button
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                    onClick={handleLogout}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <span className="flex items-center gap-3"><FiLogOut size={16} /> Logout</span>
                    <FiChevronRight size={14} />
                  </motion.button>
                </motion.div>
              </motion.nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
