import { apiClient } from './client';
import type { AuthResponse, User } from '../types';

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    return {
      token: data.token,
      user: data.user || data.data
    };
  },
  
  register: async (email: string, password: string, firstName?: string, lastName?: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/auth/register', { email, password, firstName, lastName });
    return {
      token: data.token || '',
      user: data.user || data.data
    };
  },
  
  getMe: async (): Promise<{ user: User }> => {
    const { data } = await apiClient.get('/auth/me');
    return {
      user: data.user || data.data
    };
  },

  forgotPassword: async (email: string): Promise<{ status: string; message: string }> => {
    const { data } = await apiClient.post('/auth/forgot-password', { email });
    return data;
  },

  resetPassword: async (token: string, password: string): Promise<{ status: string; message: string }> => {
    const { data } = await apiClient.post('/auth/reset-password', { token, password });
    return data;
  },

  googleLogin: async (idToken: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/auth/google', { idToken });
    return {
      token: data.token,
      user: data.user || data.data
    };
  }
};


