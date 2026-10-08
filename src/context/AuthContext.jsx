import { createContext, useContext, useEffect, useState } from 'react';
import api, { API_ENABLED } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('rentease_user');
    if (stored) setUser(JSON.parse(stored));
    if (API_ENABLED && localStorage.getItem('rentease_token')) {
      api.get('/auth/me')
        .then(({ data }) => persist(data.user || data))
        .catch(() => {
          localStorage.removeItem('rentease_user');
          localStorage.removeItem('rentease_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
      return;
    }
    setLoading(false);
  }, []);

  const persist = (userData) => {
    setUser(userData);
    localStorage.setItem('rentease_user', JSON.stringify(userData));
  };

  const login = async ({ phone, email, identifier, password, role, remember }) => {
    const loginIdentifier = String(identifier || email || phone || '').trim();
    const loginPassword = String(password || '').trim();

    if (!loginIdentifier) {
      throw new Error('Please enter your email or phone number.');
    }
    if (!loginPassword) {
      throw new Error('Please enter your password.');
    }

    if (API_ENABLED) {
      const isEmail = loginIdentifier.includes('@');
      const { data } = await api.post('/auth/login', {
        identifier: loginIdentifier,
        email: isEmail ? loginIdentifier : undefined,
        phone: !isEmail ? loginIdentifier : undefined,
        password: loginPassword,
        role,
      });
      persist(data.user);
      localStorage.setItem('rentease_token', data.token);
      return data.user;
    }
    // Mocked auth so the UI runs standalone against localStorage.
    const users = JSON.parse(localStorage.getItem('rentease_users') || '[]');
    const found = users.find((u) => (u.phone === loginIdentifier || u.email === loginIdentifier) && u.role === role);
    if (!found) throw new Error('Invalid email or password.');
    if (found.password !== loginPassword) throw new Error('Invalid email or password.');
    persist(found);
    if (!remember) sessionStorage.setItem('rentease_session', '1');
    return found;
  };

  const register = async (formData) => {
    if (API_ENABLED) {
      const { data } = await api.post('/auth/register', formData);
      persist(data.user);
      localStorage.setItem('rentease_token', data.token);
      return data.user;
    }
    const users = JSON.parse(localStorage.getItem('rentease_users') || '[]');
    if (users.some((u) => u.email === formData.email && u.role === formData.role)) {
      throw new Error('An account with this email already exists for this role.');
    }
    const newUser = {
      id: crypto.randomUUID(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address || '',
      city: formData.city || '',
      state: formData.state || '',
      country: formData.country || '',
      about: formData.about || '',
      profileImage: formData.profileImage || '',
      password: formData.password,
      role: formData.role,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem('rentease_users', JSON.stringify(users));
    persist(newUser);
    return newUser;
  };

  const updateProfile = async (updates) => {
    if (API_ENABLED) {
      const { data } = await api.put('/users/profile', updates);
      persist({ ...user, ...data });
      return data;
    }
    const users = JSON.parse(localStorage.getItem('rentease_users') || '[]');
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx > -1) {
      users[idx] = { ...users[idx], ...updates };
      localStorage.setItem('rentease_users', JSON.stringify(users));
      persist(users[idx]);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (API_ENABLED) {
      await api.put('/users/password', { currentPassword, newPassword });
      return;
    }
    if (user.password !== currentPassword) throw new Error('Current password is incorrect.');
    await updateProfile({ password: newPassword });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('rentease_user');
    localStorage.removeItem('rentease_token');
    sessionStorage.removeItem('rentease_session');
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateProfile, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
