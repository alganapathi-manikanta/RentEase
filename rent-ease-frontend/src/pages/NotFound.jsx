import { Link } from 'react-router-dom';
import { FiHome } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="section flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-display text-6xl font-extrabold text-primary">404</p>
      <h1 className="font-display text-2xl font-bold">Page not found</h1>
      <p className="text-ink/60 dark:text-slate-400">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary"><FiHome /> Back to Home</Link>
    </div>
  );
}
