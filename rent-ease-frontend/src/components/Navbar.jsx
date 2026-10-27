import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  FiX,
  FiUser,
  FiLogOut,
  FiSettings,
  FiChevronRight,
  FiHeart,
  FiMessageSquare,
  FiHome,
  FiSearch,
  FiGrid,
  FiPlus,
  FiList,
  FiBarChart2,
  FiShield,
  FiInfo,
  FiHelpCircle,
} from 'react-icons/fi';
import { BiBuildingHouse } from 'react-icons/bi';
import api from '../utils/api';
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

function MobileNavLink({ to, end = false, icon: Icon, children, badge, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex min-h-[44px] items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'bg-[#D5A348]/20 text-[#D5A348] font-semibold shadow-xs'
            : 'text-slate-200 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <span className="flex items-center gap-3">
        {Icon && <Icon size={17} className="flex-shrink-0 text-[#D5A348]" />}
        <span>{children}</span>
        {badge != null && badge > 0 && (
          <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <FiChevronRight size={14} className="opacity-50" />
    </NavLink>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { openModal } = useInfoModal();
  const [open, setOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const isTenant = user?.role === 'tenant';
  const isLandlord = user?.role === 'landlord';
  const isAdmin = user?.role === 'admin';

  // Poll aggregate unread chat count for active user (tenant or landlord)
  useEffect(() => {
    if (!user) {
      setUnreadChatCount(0);
      return;
    }

    let isMounted = true;
    const fetchUnread = async () => {
      if (document.hidden) return;
      try {
        const res = await api.get('/chat/unread-count');
        if (res.data?.success && isMounted) {
          setUnreadChatCount(res.data.unreadCount || 0);
        }
      } catch (err) {
        // Silent background polling
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 12000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close on Escape key press
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  // Stagger variants for mobile drawer items
  const menuContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.04,
        delayChildren: shouldReduceMotion ? 0 : 0.06,
      },
    },
  };

  const menuItemVariants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : 14 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.28, ease: LUXURY_EASE },
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
          {/* Left Branding: R&E Crown Emblem + Vertical Gold Divider + Rent Ease Branding Image */}
          <motion.div
            className="flex items-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2, ease: LUXURY_EASE }}
          >
            <BrandLogo tone="inverse" size="navbar" />
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
            {isLandlord && (
              <NavItem to="/landlord/add-property">List Property</NavItem>
            )}
            {user && (
              <NavItem to="/messages">
                <span className="inline-flex items-center gap-1.5">
                  <FiMessageSquare size={14} /> Messages
                  {unreadChatCount > 0 && (
                    <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
                      {unreadChatCount > 9 ? '9+' : unreadChatCount}
                    </span>
                  )}
                </span>
              </NavItem>
            )}
          </div>

          {/* Right Side Desktop: Theme Toggle, Profile, Login / Logout */}
          <div className="hidden items-center gap-3 lg:flex">
            <DarkModeToggle className="navbar-theme-toggle" />
            {user ? (
              <>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to={isAdmin ? '/admin' : isLandlord ? '/landlord/profile' : '/tenant/profile'}
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
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-[#D5A348]/40"
              onClick={() => setOpen((prev) => !prev)}
              aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
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
      </motion.header>

      {/* Mobile Navigation Drawer - Rendered via Portal into document.body to escape transformed 72px header container */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="fixed inset-0 z-[115] lg:hidden">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setOpen(false)}
                  aria-hidden="true"
                />

                {/* Drawer Content */}
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={SMOOTH_SPRING}
                  className="fixed inset-y-0 right-0 z-[120] flex h-full w-72 max-w-[85vw] flex-col bg-[#0D1929]/95 backdrop-blur-2xl p-5 shadow-2xl border-l border-[#D5A348]/20 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Navigation Menu"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="font-display text-base font-bold text-white tracking-wide">Menu</span>
                    <motion.button
                      whileHover={{ scale: 1.12, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                      onClick={() => setOpen(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10 transition"
                      aria-label="Close navigation menu"
                    >
                      <FiX size={20} />
                    </motion.button>
                  </div>

                  {/* Logged in User Card */}
                  {user && (
                    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#D5A348]/20 text-[#D5A348] font-bold text-sm">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{user.name || 'User'}</p>
                          <span className="inline-block rounded bg-[#D5A348]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#D5A348]">
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nav Items Container */}
                  <motion.div
                    variants={menuContainerVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col gap-4 py-2"
                  >
                    {/* Role Specific Section */}
                    {user && (
                      <motion.div variants={menuItemVariants} className="space-y-1">
                        <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-[#D5A348]/80">
                          {isAdmin ? 'Admin' : isLandlord ? 'Landlord' : 'Tenant'} Actions
                        </p>

                        {/* Tenant Links */}
                        {isTenant && (
                          <>
                            <MobileNavLink to="/tenant/wishlist" icon={FiHeart} onClick={() => setOpen(false)}>
                              Wishlist
                            </MobileNavLink>
                            <MobileNavLink to="/messages" icon={FiMessageSquare} badge={unreadChatCount} onClick={() => setOpen(false)}>
                              Messages
                            </MobileNavLink>
                            <MobileNavLink to="/tenant/profile" icon={FiUser} onClick={() => setOpen(false)}>
                              Profile
                            </MobileNavLink>
                            <MobileNavLink to="/tenant/settings" icon={FiSettings} onClick={() => setOpen(false)}>
                              Settings
                            </MobileNavLink>
                          </>
                        )}

                        {/* Landlord Links */}
                        {isLandlord && (
                          <>
                            <MobileNavLink to="/landlord/dashboard" end icon={FiGrid} onClick={() => setOpen(false)}>
                              Dashboard
                            </MobileNavLink>
                            <MobileNavLink to="/landlord/add-property" icon={FiPlus} onClick={() => setOpen(false)}>
                              Add Property
                            </MobileNavLink>
                            <MobileNavLink to="/landlord/posted-properties" icon={FiList} onClick={() => setOpen(false)}>
                              Posted Properties
                            </MobileNavLink>
                            <MobileNavLink to="/messages" icon={FiMessageSquare} badge={unreadChatCount} onClick={() => setOpen(false)}>
                              Messages
                            </MobileNavLink>
                            <MobileNavLink to="/landlord/reports" icon={FiBarChart2} onClick={() => setOpen(false)}>
                              Reports
                            </MobileNavLink>
                            <MobileNavLink to="/landlord/profile" icon={FiUser} onClick={() => setOpen(false)}>
                              Profile
                            </MobileNavLink>
                            <MobileNavLink to="/landlord/settings" icon={FiSettings} onClick={() => setOpen(false)}>
                              Settings
                            </MobileNavLink>
                          </>
                        )}

                        {/* Admin Links */}
                        {isAdmin && (
                          <>
                            <MobileNavLink to="/admin" icon={FiShield} onClick={() => setOpen(false)}>
                              Admin Dashboard
                            </MobileNavLink>
                            <MobileNavLink to="/messages" icon={FiMessageSquare} badge={unreadChatCount} onClick={() => setOpen(false)}>
                              Messages
                            </MobileNavLink>
                          </>
                        )}
                      </motion.div>
                    )}

                    {/* Public Exploration Section */}
                    <motion.div variants={menuItemVariants} className="space-y-1">
                      <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        Explore
                      </p>
                      <MobileNavLink to="/" end icon={FiHome} onClick={() => setOpen(false)}>
                        Home
                      </MobileNavLink>
                      <MobileNavLink to="/search" icon={FiSearch} onClick={() => setOpen(false)}>
                        Properties
                      </MobileNavLink>
                      <MobileNavLink to="/features" icon={BiBuildingHouse} onClick={() => setOpen(false)}>
                        Features
                      </MobileNavLink>
                      <button
                        type="button"
                        onClick={() => {
                          openModal('about');
                          setOpen(false);
                        }}
                        className="flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-slate-200 transition-all hover:bg-white/10 hover:text-white"
                      >
                        <span className="flex items-center gap-3">
                          <FiInfo size={17} className="flex-shrink-0 text-[#D5A348]" />
                          <span>About</span>
                        </span>
                        <FiChevronRight size={14} className="opacity-50" />
                      </button>
                      <MobileNavLink to="/help" icon={FiHelpCircle} onClick={() => setOpen(false)}>
                        Help
                      </MobileNavLink>
                    </motion.div>
                  </motion.div>

                  {/* Bottom Actions */}
                  <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-slate-300">Theme</span>
                      <DarkModeToggle className="navbar-theme-toggle" />
                    </div>

                    {user ? (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleLogout}
                        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 px-3.5 py-2.5 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/10"
                      >
                        <FiLogOut size={16} /> Logout
                      </motion.button>
                    ) : (
                      <div className="space-y-2">
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
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
