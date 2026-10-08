import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { seedProperties } from '../data/mockData';
import api, { API_ENABLED } from '../utils/api';
import { useAuth } from './AuthContext';

const AppDataContext = createContext(null);
const seedIds = new Set(seedProperties.map((property) => property.id));

const isSeedProperty = (id) => seedIds.has(id);
const normalizeProperty = (property) => ({ ...property, id: property.id || property._id });
const getResponseList = (response) => {
  const payload = response?.data ?? response;
  const candidates = [payload?.data, payload?.properties, payload];
  return candidates.find(Array.isArray) || [];
};

const mergeStoredProperties = (storedProperties) => {
  if (!Array.isArray(storedProperties)) return [...seedProperties];

  const customProperties = storedProperties.filter((property) => !isSeedProperty(property.id));
  return [...seedProperties, ...customProperties];
};

export function AppDataProvider({ children }) {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [favorites, setFavorites] = useState([]); // array of propertyIds
  const [favoritesError, setFavoritesError] = useState('');
  const [expenses, setExpenses] = useState({}); // { [propertyId]: {...} }
  const pendingFavorites = useRef(new Set());

  useEffect(() => {
    if (API_ENABLED) {
      const loadData = async () => {
        const propertyRequest = Promise.all([
          api.get('/properties'),
          user?.role === 'landlord' ? api.get('/properties/my') : Promise.resolve(null),
        ]).then((responses) => ({ responses })).catch((error) => ({ error }));
        const wishlistRequest = user?.role === 'tenant'
          ? api.get('/wishlist').then(({ data }) => ({ data })).catch((error) => ({ error }))
          : Promise.resolve(null);
        const [propertyResult, wishlistResult] = await Promise.all([propertyRequest, wishlistRequest]);

        if (propertyResult.error) {
          console.error('Failed to load properties:', propertyResult.error);
          setProperties([]);
        } else {
          const [publicResponse, ownedResponse] = propertyResult.responses;
          const publicProperties = getResponseList(publicResponse);
          const ownedProperties = user?.role === 'landlord'
            ? getResponseList(ownedResponse)
            : [];
          const combined = [...publicProperties, ...ownedProperties];
          const unique = [...new Map(combined.map((property) => [property._id || property.id, normalizeProperty(property)])).values()];
          setProperties(unique);
        }

        if (user?.role === 'tenant') {
          if (wishlistResult.error) {
            console.error('Failed to load wishlist:', wishlistResult.error);
            setFavoritesError('Your wishlist could not be loaded. Please try again.');
          } else {
            setFavorites(getResponseList(wishlistResult.data).map((property) => String(property._id || property.id)));
            setFavoritesError('');
          }
        } else {
          setFavorites([]);
          setFavoritesError('');
        }
      };
      loadData();
      return;
    }
    const storedProps = localStorage.getItem('rentease_properties');
    const parsedProps = storedProps ? JSON.parse(storedProps) : [];
    const safeProps = mergeStoredProperties(parsedProps);
    setProperties(safeProps);

    if (user?.role !== 'tenant') {
      setFavorites([]);
    }
    const favoriteKey = `rentease_favorites_${user?.id || user?._id || 'tenant'}`;
    const storedFavs = user?.role === 'tenant' ? localStorage.getItem(favoriteKey) : null;
    setFavorites(storedFavs ? JSON.parse(storedFavs) : []);
    setFavoritesError('');

    const storedExpenses = localStorage.getItem('rentease_expenses');
    setExpenses(storedExpenses ? JSON.parse(storedExpenses) : {});
  }, [user]);

  const persistProperties = (next) => {
    const merged = mergeStoredProperties(next);
    setProperties(merged);
    localStorage.setItem('rentease_properties', JSON.stringify(merged));
  };

  const addProperty = async (property, ownerId, ownerName, ownerPhone) => {
    if (API_ENABLED) {
      const { data } = await api.post('/properties', property);
      const created = normalizeProperty(data.property || data.data);
      setProperties((current) => [created, ...current]);
      return created;
    }
    const newProperty = {
      ...property,
      id: crypto.randomUUID(),
      ownerId,
      ownerName,
      ownerPhone,
      photos: property.photos || [],
      videos: property.videos || [],
      views: 0,
      interested: 0,
      isPublished: true,
      createdAt: new Date().toISOString(),
    };
    persistProperties([newProperty, ...properties]);
    return newProperty;
  };

  const updateProperty = async (id, updates) => {
    if (API_ENABLED) {
      const { data } = await api.put(`/properties/${id}`, updates);
      const updated = normalizeProperty(data.property || data.data);
      setProperties((current) => current.map((property) => property.id === id ? updated : property));
      return updated;
    }
    if (isSeedProperty(id)) return;
    const currentUserId = JSON.parse(localStorage.getItem('rentease_user') || 'null')?.id;
    persistProperties(properties.map((p) => (p.id === id && p.ownerId === currentUserId ? { ...p, ...updates } : p)));
  };

  const deleteProperty = async (id) => {
    if (API_ENABLED) {
      await api.delete(`/properties/${id}`);
      setProperties((current) => current.filter((property) => property.id !== id));
      return;
    }
    if (isSeedProperty(id)) return;
    const currentUserId = JSON.parse(localStorage.getItem('rentease_user') || 'null')?.id;
    persistProperties(properties.filter((p) => p.id !== id || p.ownerId !== currentUserId));
    const nextFavs = favorites.filter((favoriteId) => favoriteId !== String(id));
    setFavorites(nextFavs);
    if (user?.role === 'tenant') {
      const favoriteKey = `rentease_favorites_${user.id || user._id || 'tenant'}`;
      localStorage.setItem(favoriteKey, JSON.stringify(nextFavs));
    }
  };

  const togglePropertyPublished = async (id) => {
    if (API_ENABLED) {
      const property = properties.find((item) => item.id === id);
      if (!property) return;
      await updateProperty(id, { isPublished: property.isPublished === false });
      return;
    }
    if (isSeedProperty(id)) return;
    const currentUserId = JSON.parse(localStorage.getItem('rentease_user') || 'null')?.id;
    persistProperties(properties.map((p) => (
      p.id === id && p.ownerId === currentUserId ? { ...p, isPublished: p.isPublished === false } : p
    )));
  };

  const incrementViews = useCallback(async (id) => {
    if (!id) return;
    if (isSeedProperty(id)) {
      setProperties((current) =>
        current.map((p) => (p.id === id || p._id === id ? { ...p, views: (p.views || 0) + 1 } : p))
      );
      return;
    }
    if (API_ENABLED) {
      try {
        const { data } = await api.post(`/properties/${id}/view`);
        const updatedViews = data.views ?? data.data?.views;
        if (typeof updatedViews === 'number') {
          setProperties((current) =>
            current.map((property) =>
              (property.id === id || property._id === id)
                ? { ...property, views: updatedViews }
                : property
            )
          );
        }
      } catch (err) {
        console.error('Failed to increment property views:', err);
      }
      return;
    }
    setProperties((current) => {
      const next = current.map((p) => (p.id === id || p._id === id ? { ...p, views: (p.views || 0) + 1 } : p));
      try {
        localStorage.setItem('rentease_properties', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleFavorite = async (id) => {
    if (user?.role !== 'tenant' || !id) return;
    const propertyId = String(id);
    if (pendingFavorites.current.has(propertyId)) return;

    const saved = favorites.includes(propertyId);
    const next = saved
      ? favorites.filter((favoriteId) => favoriteId !== propertyId)
      : [...favorites, propertyId];
    setFavorites(next);
    setFavoritesError('');

    if (!API_ENABLED) {
      const favoriteKey = `rentease_favorites_${user.id || user._id || 'tenant'}`;
      localStorage.setItem(favoriteKey, JSON.stringify(next));
      return;
    }

    pendingFavorites.current.add(propertyId);
    try {
      if (saved) await api.delete(`/wishlist/${propertyId}`);
      else await api.post(`/wishlist/${propertyId}`);
    } catch (error) {
      setFavorites((current) => saved
        ? [...new Set([...current, propertyId])]
        : current.filter((favoriteId) => favoriteId !== propertyId));
      setFavoritesError(error.message || 'Your wishlist could not be updated. Please try again.');
      console.error('Failed to update wishlist:', error);
    } finally {
      pendingFavorites.current.delete(propertyId);
    }
  };

  const saveExpenses = (propertyId, data) => {
    const next = { ...expenses, [propertyId]: data };
    setExpenses(next);
    localStorage.setItem('rentease_expenses', JSON.stringify(next));
  };

  return (
    <AppDataContext.Provider
      value={{
        properties,
        favorites,
        favoritesError,
        expenses,
        addProperty,
        updateProperty,
        deleteProperty,
        togglePropertyPublished,
        incrementViews,
        toggleFavorite,
        saveExpenses,
      }}
    >
      {children}
      {favoritesError && (
        <div role="alert" className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-xl bg-rose-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {favoritesError}
        </div>
      )}
    </AppDataContext.Provider>
  );
}

export const useAppData = () => useContext(AppDataContext);
