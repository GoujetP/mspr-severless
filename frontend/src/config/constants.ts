// En dev, on passe par le proxy Vite pour éviter les erreurs CORS du navigateur.
const API_BASE_URL =
  import.meta.env.DEV
    ? '/api/function'
    : (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
      'http://vps-pgoujet.duckdns.org:31112/function';

export const API_ENDPOINTS = {
  GENERATE_PASSWORD: `${API_BASE_URL}/generate-password`,
  GENERATE_2FA: `${API_BASE_URL}/generate-2fa`,
  AUTH_USER: `${API_BASE_URL}/auth-user`,
} as const;

