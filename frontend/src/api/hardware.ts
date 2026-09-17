import { apiClient } from './client';
import type { Gateway, Tracker } from '../types';

export const hardwareApi = {
  getGateways: async (): Promise<Gateway[]> => {
    const { data } = await apiClient.get('/gateways');
    return data;
  },
  
  getGatewayById: async (id: string): Promise<Gateway> => {
    const { data } = await apiClient.get(`/gateways/${id}`);
    return data;
  },
  
  createGateway: async (gatewayData: Partial<Gateway>): Promise<Gateway> => {
    const { data } = await apiClient.post('/gateways', gatewayData);
    return data;
  },

  deleteGateway: async (id: string): Promise<void> => {
    await apiClient.delete(`/gateways/${id}`);
  },

  getTrackers: async (): Promise<Tracker[]> => {
    const { data } = await apiClient.get('/trackers');
    return data;
  },
  
  getTrackerById: async (id: string): Promise<Tracker> => {
    const { data } = await apiClient.get(`/trackers/${id}`);
    return data;
  },

  createTracker: async (trackerData: Partial<Tracker>): Promise<Tracker> => {
    const { data } = await apiClient.post('/trackers', trackerData);
    return data;
  },

  deleteTracker: async (id: string): Promise<void> => {
    await apiClient.delete(`/trackers/${id}`);
  }
};
