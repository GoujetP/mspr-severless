// En développement, utilise le proxy Vite pour éviter les problèmes CORS
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment 
  ? '/api/function' 
  : 'https://openfaas.91.99.16.71.nip.io/function';

export const API_ENDPOINTS = {
  GENERATE_PASSWORD: `${API_BASE_URL}/generate-password`,
  GENERATE_2FA: `${API_BASE_URL}/generate-2fa`,
  AUTH_USER: `${API_BASE_URL}/auth-user`,
} as const;

