import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  const [expenses, setExpenses] = useState({}); // { [propertyId]: {...} }

  useEffect(() => {
    if (API_ENABLED) {
      const requests = [api.get('/properties')];
      if (user?.role === 'landlord') requests.push(api.get('/properties/my'));
      if (user?.role === 'tenant') requests.push(api.get('/favorites'));
      Promise.all(requests)
        .then((responses) => {
          const publicProperties = getResponseList(responses[0]);
          const ownedProperties = user?.role === 'landlord' ? getResponseList(responses[1]) : [];
          const favoriteData = user?.role === 'tenant' ? getResponseList(responses[1]) : [];
          const combined = [...publicProperties, ...ownedProperties];
          const unique = [...new Map(combined.map((property) => [property._id || property.id, normalizeProperty(property)])).values()];
          setProperties(unique);
          if (user?.role === 'tenant') setFavorites(favoriteData.map((property) => property._id || property.id));
        })
        .catch(() => setProperties([]));
      return;
    }
    const storedProps = localStorage.getItem('rentease_properties');
    const parsedProps = storedProps ? JSON.parse(storedProps) : [];
    const safeProps = mergeStoredProperties(parsedProps);
    setProperties(safeProps);

    const storedFavs = localStorage.getItem('rentease_favorites');
    setFavorites(storedFavs ? JSON.parse(storedFavs) : []);

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
    const nextFavs = favorites.filter((f) => f !== id);
    setFavorites(nextFavs);
    localStorage.setItem('rentease_favorites', JSON.stringify(nextFavs));
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
    if (API_ENABLED) {
      const saved = favorites.includes(id);
      if (saved) await api.delete(`/favorites/${id}`);
      else await api.post(`/favorites/${id}`);
      setFavorites((current) => saved ? current.filter((favoriteId) => favoriteId !== id) : [...current, id]);
      return;
    }
    const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem('rentease_favorites', JSON.stringify(next));
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
    </AppDataContext.Provider>
  );
}

export const useAppData = () => useContext(AppDataContext);
