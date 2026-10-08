import axios from 'axios';
import { getAuthErrorMessage } from './authErrors';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const defaultApiUrl = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

const isLoopbackOrLan = (host) => {
  if (!host) return false;
  if (['localhost', '127.0.0.1', '[::1]', '::1'].includes(host)) return true;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, o1, o2] = ipv4.map(Number);
    if (o1 === 10) return true;
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    if (o1 === 192 && o2 === 168) return true;
  }
  return false;
};

function resolveApiBaseUrl(value) {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const currentHost = window.location.hostname;
    if (isLoopbackOrLan(currentHost)) {
      return `${window.location.protocol}//${currentHost}:5000/api`;
    }
  }

  const baseUrl = new URL(value || defaultApiUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');
  const apiPath = baseUrl.pathname.replace(/\/+$/, '');
  if (!apiPath.endsWith('/api')) baseUrl.pathname = `${apiPath}/api`;
  baseUrl.search = '';
  baseUrl.hash = '';
  return baseUrl.toString().replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl(configuredApiUrl);
export const API_ORIGIN = new URL(API_BASE_URL).origin;
export const API_ENABLED = Boolean(configuredApiUrl) || import.meta.env.DEV || import.meta.env.PROD;

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rentease_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const userMessage = getAuthErrorMessage(error, 'An unexpected error occurred. Please try again.');
    const enhancedError = new Error(userMessage);
    enhancedError.response = error.response;
    enhancedError.status = error.response?.status;
    enhancedError.code = error.code;
    enhancedError.originalMessage = error.message;
    return Promise.reject(enhancedError);
  }
);

export { getAuthErrorMessage };
export default api;
