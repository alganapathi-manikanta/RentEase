import { NavLink, useNavigate } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

export default function Sidebar({ links, title }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex h-full w-64 flex-none flex-col border-r border-black/5 bg-white p-5 dark:bg-slate-900 dark:border-white/5">
      <BrandLogo tone="default" size="sidebar" className="mb-8" />

      <p className="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-ink/40 dark:text-slate-500">{title}</p>

      <nav className="flex flex-1 flex-col gap-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-ink/60 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/5'
              }`
            }
          >
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-black/5 pt-4 dark:border-white/5">
        <p className="mb-3 truncate px-2 text-sm font-medium">{user?.name}</p>
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
        >
          <FiLogOut size={18} /> Logout
        </button>
      </div>
    </aside>
  );
}
