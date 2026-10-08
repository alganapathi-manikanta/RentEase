const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export const normalizeMediaUrl = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    if (localHosts.has(parsed.hostname) && parsed.pathname.startsWith('/uploads/')) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return trimmed;
  } catch {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
};
