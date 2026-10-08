import { FiHome, FiVideo, FiImage } from 'react-icons/fi';

const ICONS = { home: FiHome, video: FiVideo, image: FiImage };

export default function MediaPlaceholder({ icon = 'home', label, className = '' }) {
  const Icon = ICONS[icon] || FiHome;
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl2 bg-gradient-to-br from-primary-50 to-secondary-50 text-primary-500 dark:from-slate-800 dark:to-slate-800 dark:text-primary-400 ${className}`}
    >
      <Icon size={32} />
      {label && <span className="text-xs font-medium text-ink/40 dark:text-slate-400">{label}</span>}
    </div>
  );
}
