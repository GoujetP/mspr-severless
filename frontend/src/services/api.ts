import type {
  GeneratePasswordRequest,
  GeneratePasswordResponse,
  Generate2FARequest,
  Generate2FAResponse,
  AuthUserRequest,
  AuthUserResponse,
} from '../types';
import { API_ENDPOINTS } from '../config/constants';

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `Erreur HTTP: ${response.status}`);
      }

      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Une erreur inattendue est survenue');
    }
  }

  async generatePassword(
    request: GeneratePasswordRequest
  ): Promise<GeneratePasswordResponse> {
    return this.request<GeneratePasswordResponse>(API_ENDPOINTS.GENERATE_PASSWORD, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async generate2FA(request: Generate2FARequest): Promise<Generate2FAResponse> {
    return this.request<Generate2FAResponse>(API_ENDPOINTS.GENERATE_2FA, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async authUser(request: AuthUserRequest): Promise<AuthUserResponse> {
    return this.request<AuthUserResponse>(API_ENDPOINTS.AUTH_USER, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

export const apiService = new ApiService();

