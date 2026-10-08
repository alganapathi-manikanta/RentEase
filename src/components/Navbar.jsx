import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX, FiUser, FiLogOut, FiSettings, FiChevronRight, FiHeart } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useInfoModal } from '../context/InfoModalContext';
import DarkModeToggle from './DarkModeToggle';
import BrandLogo from './BrandLogo';

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
          <span>{children}</span>
          <span
            className={`absolute bottom-0 left-2.5 right-2.5 h-[2px] rounded-full transition-all duration-300 origin-center ${
              isActive
                ? 'bg-[#d4a84f] scale-x-100 opacity-100 shadow-[0_0_8px_rgba(212,168,79,0.5)]'
                : 'bg-[#d4a84f] scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100'
            }`}
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

  const isTenant = user?.role === 'tenant';

  const handleLogout = () => {
    logout();
    setTenantMenuOpen(false);
    navigate('/');
  };

  const closeTenantMenu = () => setTenantMenuOpen(false);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-0 z-[110] bg-[#13253b] border-b border-[#d4a84f]/15 shadow-[0_4px_24px_rgba(0,0,0,0.22)] transition-colors"
        style={{ height: '72px' }}
      >
        <nav className="section relative flex h-full items-center justify-between gap-4">
          {isTenant && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setTenantMenuOpen((prev) => !prev)}
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#d4a84f]/30 bg-white/5 text-white transition hover:bg-white/10"
              aria-label={tenantMenuOpen ? 'Close tenant menu' : 'Open tenant menu'}
              aria-expanded={tenantMenuOpen}
            >
              <span className="relative block h-[18px] w-[18px]" aria-hidden="true">
                <motion.span
                  className="absolute left-[2px] right-[2px] top-[4px] h-[1.5px] rounded-full bg-current"
                  animate={tenantMenuOpen ? { top: 8, rotate: 45 } : { top: 4, rotate: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.span
                  className="absolute left-[2px] right-[2px] top-[8px] h-[1.5px] rounded-full bg-current"
                  animate={tenantMenuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.span
                  className="absolute left-[2px] right-[2px] top-[12px] h-[1.5px] rounded-full bg-current"
                  animate={tenantMenuOpen ? { top: 8, rotate: -45 } : { top: 12, rotate: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            </motion.button>
          )}

          {/* Left Branding: R&E Crown Emblem + Vertical Gold Divider + Rent Ease Branding Image */}
          <div className="flex items-center">
            <BrandLogo tone="inverse" size="navbar" className={isTenant ? 'ml-10 sm:ml-12' : ''} />
          </div>

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
              <span>About</span>
              <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] rounded-full bg-[#d4a84f] scale-x-0 opacity-0 transition-all duration-300 origin-center group-hover:scale-x-100 group-hover:opacity-100" />
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
                  className="navbar-logout inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-full border border-[#d4a84f]/40 text-[#d4a84f] hover:bg-[#d4a84f]/10 transition-colors"
                >
                  <FiLogOut size={14} /> Logout
                </motion.button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-200 hover:text-white px-3 py-2 rounded-lg transition-colors duration-200"
                >
                  Login
                </Link>
                <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96, y: 1 }}>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center font-semibold text-sm px-5 py-2 rounded-full transition-all duration-200"
                    style={{
                      backgroundColor: '#d4a84f',
                      color: '#111827',
                      boxShadow: '0 4px 14px rgba(212, 168, 79, 0.28)'
                    }}
                  >
                    Get Started
                  </Link>
                </motion.div>
              </>
            )}
          </div>

          {/* Mobile / Tablet Controls */}
          <div className="flex items-center gap-2 lg:hidden">
            <DarkModeToggle className="navbar-theme-toggle" />
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10 transition"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <FiMenu size={22} />
            </motion.button>
          </div>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-x-0 bottom-0 top-[72px] z-50 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            >
              <motion.div
                initial={{ x: '100%', opacity: 0.8 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="ml-auto flex h-full w-72 max-w-[85vw] flex-col gap-6 bg-primary p-6 shadow-2xl dark:bg-slate-900 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="font-display text-lg font-bold text-white">Menu</span>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setOpen(false)}
                    className="text-white"
                  >
                    <FiX size={22} />
                  </motion.button>
                </div>
                <nav className="flex flex-col gap-2">
                  <NavItem to="/" end onClick={() => setOpen(false)}>Home</NavItem>
                  <NavItem to="/search" onClick={() => setOpen(false)}>Properties</NavItem>
                  <NavItem to="/features" onClick={() => setOpen(false)}>Features</NavItem>
                  <button
                    type="button"
                    onClick={() => {
                      openModal('about');
                      setOpen(false);
                    }}
                    className="px-3 py-1.5 text-left text-sm font-medium tracking-wide text-slate-200/85 hover:text-white transition-colors"
                  >
                    About
                  </button>
                  <NavItem to="/help" onClick={() => setOpen(false)}>Help</NavItem>
                  {isTenant && (
                    <NavItem to="/tenant/wishlist" onClick={() => setOpen(false)}>
                      <span className="inline-flex items-center gap-1.5">
                        <FiHeart size={14} /> Wishlist
                      </span>
                    </NavItem>
                  )}
                  {user?.role === 'landlord' && (
                    <NavItem to="/landlord/add-property" onClick={() => setOpen(false)}>List Property</NavItem>
                  )}
                </nav>
                <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-4">
                  <DarkModeToggle className="navbar-theme-toggle self-start" />
                  {user ? (
                    <>
                      <Link
                        to={user.role === 'admin' ? '/admin' : user.role === 'landlord' ? '/landlord/profile' : '/tenant/profile'}
                        className="btn-outline text-center"
                        onClick={() => setOpen(false)}
                      >
                        Profile
                      </Link>
                      <button onClick={handleLogout} className="navbar-logout btn-outline">
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="btn-outline text-center" onClick={() => setOpen(false)}>
                        Login
                      </Link>
                      <Link to="/register" className="btn-primary text-center" onClick={() => setOpen(false)}>
                        Get Started
                      </Link>
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
              transition={{ duration: 0.25 }}
              className="fixed inset-x-0 bottom-0 top-[72px] z-40 bg-black/40 backdrop-blur-xs"
              onClick={closeTenantMenu}
            />
            <motion.aside
              initial={{ x: -320, opacity: 0.7 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="fixed left-0 top-[72px] z-50 flex h-[calc(100vh-72px)] w-72 max-w-[85vw] flex-col bg-white p-5 shadow-2xl dark:bg-slate-900 overflow-y-auto"
            >
                <div className="mb-6 flex items-center justify-between">
                  <BrandLogo tone="default" size="sidebar" />
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={closeTenantMenu}
                  className="rounded-full p-2 text-ink/50 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  <FiX size={18} />
                </motion.button>
              </div>

              <div className="mb-5 border-b border-black/5 pb-4 dark:border-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/40 dark:text-slate-500">Tenant Panel</p>
              </div>

              <nav className="space-y-2">
                <motion.button
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { navigate('/tenant/profile'); closeTenantMenu(); }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-ink/70 transition hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  <span className="flex items-center gap-3"><FiUser size={16} /> Profile</span>
                  <FiChevronRight size={14} />
                </motion.button>
                <motion.button
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { navigate('/tenant/settings'); closeTenantMenu(); }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-ink/70 transition hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  <span className="flex items-center gap-3"><FiSettings size={16} /> Settings</span>
                  <FiChevronRight size={14} />
                </motion.button>
                <motion.button
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <span className="flex items-center gap-3"><FiLogOut size={16} /> Logout</span>
                  <FiChevronRight size={14} />
                </motion.button>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
