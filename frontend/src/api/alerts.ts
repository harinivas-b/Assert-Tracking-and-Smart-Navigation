import { apiClient } from './client';
import type { Alert } from '../types';

export const alertsApi = {
  getAlerts: async (status?: string): Promise<Alert[]> => {
    const { data } = await apiClient.get('/alerts', { params: { status } });
    return data;
  },
  
  updateAlertStatus: async (id: string, status: string): Promise<Alert> => {
    const { data } = await apiClient.put(`/alerts/${id}/status`, { status });
    return data;
  }
};
