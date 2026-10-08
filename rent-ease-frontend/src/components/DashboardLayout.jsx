import { Outlet, NavLink } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import PageTransition from './PageTransition';

export default function DashboardLayout({ links = [], title, children }) {
  return (
    <div className="min-h-screen bg-surface dark:bg-slate-950">
      <Navbar />
      <div className="pt-[72px]">
        {/* Mobile / Tablet Horizontal Quick Navigation Tabs */}
        {links && links.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto border-b border-black/5 bg-white/95 px-4 py-2.5 backdrop-blur-md dark:border-white/5 dark:bg-slate-900/95 lg:hidden">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-primary text-white shadow-xs dark:bg-[var(--color-accent)] dark:text-slate-950'
                      : 'bg-black/5 text-ink/70 hover:bg-black/10 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'
                  }`
                }
              >
                {Icon && <Icon size={14} />}
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        )}
        <div className="flex min-w-0">
          <Sidebar links={links} title={title} />
          <div className="flex-1 min-w-0">
            <PageTransition className="p-4 sm:p-6 lg:p-8">
              {children || <Outlet />}
            </PageTransition>
          </div>
        </div>
      </div>
    </div>
  );
}
