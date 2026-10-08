import { Link } from 'react-router-dom';
import { FiHeart } from 'react-icons/fi';
import PropertyCard from '../../components/PropertyCard';
import { useAppData } from '../../context/AppDataContext';

export default function Favorites() {
  const { properties, favorites } = useAppData();
  const favProperties = properties.filter((p) => (
    p.isPublished !== false && favorites.includes(String(p.id || p._id))
  ));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Wishlist</h1>
      <p className="mt-1 mb-6 text-sm text-ink/60 dark:text-slate-400">Your saved favourite properties.</p>

      {favProperties.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 p-10 text-center sm:p-16">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
            <FiHeart size={30} />
          </span>
          <h2 className="font-display text-xl font-semibold">Your Wishlist is Empty</h2>
          <p className="max-w-md text-ink/50 dark:text-slate-400">
            Save properties you love and find them here later.
          </p>
          <Link to="/search" className="btn-primary">Explore Properties</Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {favProperties.map((p, i) => <PropertyCard key={p.id} property={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
