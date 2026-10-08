import { Link } from 'react-router-dom';
import { FiHeart } from 'react-icons/fi';
import PropertyCard from '../../components/PropertyCard';
import { useAppData } from '../../context/AppDataContext';

export default function Favorites() {
  const { properties, favorites } = useAppData();
  const favProperties = properties.filter((p) => favorites.includes(p.id));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Wishlist</h1>
      <p className="mt-1 mb-6 text-sm text-ink/60 dark:text-slate-400">Your saved favourite properties.</p>

      {favProperties.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 p-16 text-center">
          <FiHeart size={32} className="text-ink/20" />
          <p className="text-ink/50 dark:text-slate-400">You haven't saved any properties yet.</p>
          <Link to="/search" className="btn-primary">Browse Properties</Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {favProperties.map((p, i) => <PropertyCard key={p.id} property={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
