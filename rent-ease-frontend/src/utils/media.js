// Utility functions for media URL resolution and property room calculations
import { API_BASE_URL, API_ORIGIN } from './api';

export function resolveMediaUrl(url) {
  if (!url) return '';
  if (typeof url === 'object' && url !== null) {
    url = url.url || url.path || '';
  }
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (/^(data:|blob:)/i.test(trimmed)) return trimmed;

  if (/^(https?:)?\/\//i.test(trimmed)) {
    const absoluteUrl = new URL(trimmed, API_BASE_URL);
    if (absoluteUrl.pathname.startsWith('/uploads/')) {
      return `${API_ORIGIN}${absoluteUrl.pathname}${absoluteUrl.search}${absoluteUrl.hash}`;
    }
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (cleanPath.startsWith('/uploads/')) {
    return `${API_ORIGIN}${cleanPath}`;
  }
  return cleanPath;
}

export function getRoomIcon(name = '', type = '') {
  const str = `${name} ${type}`.toLowerCase();
  if (str.includes('living') || str.includes('hall') || str.includes('drawing') || str.includes('lounge') || str.includes('family')) return '🛋️';
  if (str.includes('master')) return '🛏️';
  if (str.includes('bed')) return '🛏️';
  if (str.includes('kitch')) return '🍳';
  if (str.includes('bath') || str.includes('wash') || str.includes('toilet') || str.includes('wc') || str.includes('powder')) return '🚿';
  if (str.includes('din')) return '🍽️';
  if (str.includes('balcon') || str.includes('terrace') || str.includes('deck') || str.includes('patio')) return '🌿';
  if (str.includes('park') || str.includes('garage') || str.includes('car')) return '🚗';
  if (str.includes('study') || str.includes('office') || str.includes('work')) return '📚';
  return '🏠';
}

export function computePropertyStats(property) {
  if (!property) {
    return { bedrooms: 0, bathrooms: 0, kitchen: 0, hall: 0, parking: 0, sqft: 0 };
  }

  let bedrooms = Number(property.bedrooms) || 0;
  let bathrooms = Number(property.bathrooms) || 0;
  let kitchen = Number(property.kitchen) || 0;
  let hall = Number(property.hall) || 0;
  let parking = Number(property.parking) || 0;
  let sqft = Number(property.sqft || property.squareFeet) || 0;

  if (Array.isArray(property.rooms) && property.rooms.length > 0) {
    let rBeds = 0;
    let rBaths = 0;
    let rKitchen = 0;
    let rHall = 0;
    let rSqft = 0;

    property.rooms.forEach((r) => {
      const count = Math.max(1, Number(r.count) || 1);
      const name = (r.name || '').toLowerCase();
      const type = (r.type || '').toLowerCase();
      const combined = `${name} ${type}`;

      if (combined.includes('bath') || combined.includes('wash') || combined.includes('toilet') || combined.includes('wc')) {
        rBaths += count;
      } else if (combined.includes('bed') || combined.includes('master')) {
        rBeds += count;
      } else if (combined.includes('kitch')) {
        rKitchen += count;
      } else if (combined.includes('living') || combined.includes('hall') || combined.includes('drawing') || combined.includes('lounge') || combined.includes('family')) {
        rHall += count;
      } else if (combined.includes('park') || combined.includes('garage')) {
        parking += count;
      }

      const l = Number(r.length) || 0;
      const w = Number(r.width) || 0;
      const area = Number(r.area) || (l * w);
      if (area > 0) {
        rSqft += area * count;
      }
    });

    if (rBeds > 0) bedrooms = rBeds;
    if (rBaths > 0) bathrooms = rBaths;
    if (rKitchen > 0) kitchen = rKitchen;
    if (rHall > 0) hall = rHall;
    if (sqft === 0 && rSqft > 0) sqft = rSqft;
  }

  return {
    bedrooms,
    bathrooms,
    kitchen,
    hall,
    parking,
    sqft,
  };
}
