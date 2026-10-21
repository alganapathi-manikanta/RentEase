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

const CACHE_KEY = 'rentease_cached_properties_v2';
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const SWR_STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days SWR window for instant render

const getInitialCachedProperties = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY) || sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const { data, timestamp } = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0 && Date.now() - timestamp < SWR_STALE_MS) {
        return data;
      }
    }
  } catch (_) {}
  return [];
};

export function AppDataProvider({ children }) {
  const { user } = useAuth();
  const initialCache = useRef(getInitialCachedProperties());
  const [properties, setProperties] = useState(() => (initialCache.current.length > 0 ? initialCache.current : []));
  const [propertiesLoading, setPropertiesLoading] = useState(() => initialCache.current.length === 0);
  const [propertiesError, setPropertiesError] = useState('');
  const [isWakingServer, setIsWakingServer] = useState(false);

  const [favorites, setFavorites] = useState([]); // array of propertyIds
  const [favoritesError, setFavoritesError] = useState('');
  const [expenses, setExpenses] = useState({}); // { [propertyId]: {...} }
  const pendingFavorites = useRef(new Set());

  const inFlightRequest = useRef(null);
  const lastFetchTime = useRef(initialCache.current.length > 0 ? Date.now() : 0);
  const wakingTimerRef = useRef(null);

  // --- Fetch Public & Landlord Properties ---
  const fetchProperties = useCallback(async (force = false) => {
    if (!API_ENABLED) {
      const storedProps = localStorage.getItem('rentease_properties');
      const parsedProps = storedProps ? JSON.parse(storedProps) : [];
      const safeProps = mergeStoredProperties(parsedProps);
      setProperties(safeProps);
      setPropertiesLoading(false);
      setPropertiesError('');
      return safeProps;
    }

    // Reuse existing in-flight request if already loading
    if (inFlightRequest.current) {
      return inFlightRequest.current;
    }

    // Skip redundant fetch if cache is fresh and not forced
    if (!force && properties.length > 0 && Date.now() - lastFetchTime.current < CACHE_TTL_MS) {
      setPropertiesLoading(false);
      return properties;
    }

    if (properties.length === 0) {
      setPropertiesLoading(true);
    }
    setPropertiesError('');

    // Timer to detect cold-start latency only if no properties are currently displayed
    if (wakingTimerRef.current) clearTimeout(wakingTimerRef.current);
    if (properties.length === 0) {
      wakingTimerRef.current = setTimeout(() => {
        setIsWakingServer(true);
      }, 2500);
    }

    const requestPromise = (async () => {
      try {
        const publicReq = api.get('/properties');
        const landlordReq =
          user?.role === 'landlord'
            ? api.get('/properties/my').catch(() => null)
            : Promise.resolve(null);

        const [publicRes, landlordRes] = await Promise.all([publicReq, landlordReq]);

        const publicProps = getResponseList(publicRes);
        const landlordProps = landlordRes ? getResponseList(landlordRes) : [];
        const combined = [...publicProps, ...landlordProps];
        const unique = [
          ...new Map(combined.map((property) => [property._id || property.id, normalizeProperty(property)])).values(),
        ];

        setProperties(unique);
        lastFetchTime.current = Date.now();
        setPropertiesError('');

        // Cache in both localStorage (for SWR across tabs/reloads) and sessionStorage
        try {
          const payload = JSON.stringify({ data: unique, timestamp: Date.now() });
          localStorage.setItem(CACHE_KEY, payload);
          sessionStorage.setItem(CACHE_KEY, payload);
        } catch (_) {}

        return unique;
      } catch (err) {
        console.error('Failed to load properties:', err);
        const isNetworkOrTimeout =
          err.response?.status === 503 ||
          err.code === 'ECONNABORTED' ||
          err.message?.toLowerCase().includes('network') ||
          err.message?.toLowerCase().includes('timeout');

        const errMsg = isNetworkOrTimeout
          ? 'Cloud server is waking up. Please retry in a few moments.'
          : 'Unable to load properties right now. Please check your connection and retry.';

        if (properties.length === 0) {
          setPropertiesError(errMsg);
          setProperties((current) => (current.length > 0 ? current : seedProperties));
        } else {
          console.warn('[PROPERTIES SWR] Background revalidation failed, preserving cached listings:', err.message);
        }
        return [];
      } finally {
        if (wakingTimerRef.current) clearTimeout(wakingTimerRef.current);
        setIsWakingServer(false);
        setPropertiesLoading(false);
        inFlightRequest.current = null;
      }
    })();

    inFlightRequest.current = requestPromise;
    return requestPromise;
  }, [user?.role, properties.length]);

  // Initial load on mount
  useEffect(() => {
    fetchProperties(false);
  }, [fetchProperties]);

  // Load tenant wishlist separately
  useEffect(() => {
    if (!API_ENABLED) {
      if (user?.role !== 'tenant') {
        setFavorites([]);
        setFavoritesError('');
        return;
      }
      const favoriteKey = `rentease_favorites_${user?.id || user?._id || 'tenant'}`;
      const storedFavs = localStorage.getItem(favoriteKey);
      setFavorites(storedFavs ? JSON.parse(storedFavs) : []);
      setFavoritesError('');
      return;
    }

    if (user?.role === 'tenant') {
      api
        .get('/wishlist')
        .then(({ data }) => {
          setFavorites(getResponseList(data).map((property) => String(property._id || property.id)));
          setFavoritesError('');
        })
        .catch((error) => {
          console.error('Failed to load wishlist:', error);
          setFavoritesError('Your wishlist could not be loaded. Please try again.');
        });
    } else {
      setFavorites([]);
      setFavoritesError('');
    }
  }, [user?.role, user?.id, user?._id]);

  // Load offline expenses
  useEffect(() => {
    const storedExpenses = localStorage.getItem('rentease_expenses');
    setExpenses(storedExpenses ? JSON.parse(storedExpenses) : {});
  }, []);

  const persistProperties = (next) => {
    const merged = mergeStoredProperties(next);
    setProperties(merged);
    localStorage.setItem('rentease_properties', JSON.stringify(merged));
  };

  const updateSessionCache = (updatedProperties) => {
    try {
      const payload = JSON.stringify({ data: updatedProperties, timestamp: Date.now() });
      localStorage.setItem(CACHE_KEY, payload);
      sessionStorage.setItem(CACHE_KEY, payload);
    } catch (_) {}
  };

  const addProperty = async (property, ownerId, ownerName, ownerPhone) => {
    if (API_ENABLED) {
      const { data } = await api.post('/properties', property);
      const created = normalizeProperty(data.property || data.data);
      setProperties((current) => {
        const next = [created, ...current];
        updateSessionCache(next);
        return next;
      });
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
      setProperties((current) => {
        const next = current.map((p) => (p.id === id || p._id === id ? updated : p));
        updateSessionCache(next);
        return next;
      });
      return updated;
    }
    if (isSeedProperty(id)) return;
    const parsedUser = JSON.parse(localStorage.getItem('rentease_user') || 'null');
    const currentUserId = parsedUser?.id || parsedUser?._id;
    persistProperties(properties.map((p) => (p.id === id && (p.ownerId === currentUserId || p.ownerId?._id === currentUserId) ? { ...p, ...updates } : p)));
  };

  const deleteProperty = async (id) => {
    if (API_ENABLED) {
      await api.delete(`/properties/${id}`);
      setProperties((current) => {
        const next = current.filter((p) => p.id !== id && p._id !== id);
        updateSessionCache(next);
        return next;
      });
      return;
    }
    if (isSeedProperty(id)) return;
    const parsedUser = JSON.parse(localStorage.getItem('rentease_user') || 'null');
    const currentUserId = parsedUser?.id || parsedUser?._id;
    persistProperties(properties.filter((p) => p.id !== id || (p.ownerId !== currentUserId && p.ownerId?._id !== currentUserId)));
    const nextFavs = favorites.filter((favoriteId) => favoriteId !== String(id));
    setFavorites(nextFavs);
    if (user?.role === 'tenant') {
      const favoriteKey = `rentease_favorites_${user.id || user._id || 'tenant'}`;
      localStorage.setItem(favoriteKey, JSON.stringify(nextFavs));
    }
  };

  const togglePropertyPublished = async (id) => {
    if (API_ENABLED) {
      const property = properties.find((item) => item.id === id || item._id === id);
      if (!property) return;
      await updateProperty(id, { isPublished: property.isPublished === false });
      return;
    }
    if (isSeedProperty(id)) return;
    const parsedUser = JSON.parse(localStorage.getItem('rentease_user') || 'null');
    const currentUserId = parsedUser?.id || parsedUser?._id;
    persistProperties(
      properties.map((p) => (p.id === id && (p.ownerId === currentUserId || p.ownerId?._id === currentUserId) ? { ...p, isPublished: p.isPublished === false } : p))
    );
  };

  const incrementViews = async (id) => {
    if (API_ENABLED) {
      try {
        await api.post(`/properties/${id}/view`);
      } catch (e) {
        console.warn('Failed to register view increment:', e.message);
      }
      return;
    }
    const current = properties.find((item) => item.id === id);
    if (!current) return;
    updateProperty(id, { views: (current.views || 0) + 1 });
  };

  const toggleFavorite = async (propertyId) => {
    const stringId = String(propertyId);
    if (!stringId) return;

    if (pendingFavorites.current.has(stringId)) return;
    pendingFavorites.current.add(stringId);

    const isFav = favorites.includes(stringId);
    const nextFavorites = isFav
      ? favorites.filter((id) => id !== stringId)
      : [...favorites, stringId];

    // Optimistic UI update
    setFavorites(nextFavorites);
    setFavoritesError('');

    if (API_ENABLED) {
      try {
        if (isFav) {
          await api.delete(`/wishlist/${stringId}`);
        } else {
          await api.post(`/wishlist/${stringId}`);
        }
      } catch (err) {
        console.error('Failed to sync favorite with backend:', err);
        // Rollback optimistic state
        setFavorites(favorites);
        setFavoritesError('Could not update wishlist. Please try again.');
        setTimeout(() => setFavoritesError(''), 4000);
      } finally {
        pendingFavorites.current.delete(stringId);
      }
      return;
    }

    const favoriteKey = `rentease_favorites_${user?.id || user?._id || 'tenant'}`;
    localStorage.setItem(favoriteKey, JSON.stringify(nextFavorites));
    pendingFavorites.current.delete(stringId);
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
        propertiesLoading,
        propertiesError,
        isWakingServer,
        refreshProperties: () => fetchProperties(true),
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
