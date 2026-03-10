const defaultUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787/api';

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${defaultUrl}${normalizedPath}`;
}
