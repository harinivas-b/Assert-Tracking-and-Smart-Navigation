import { apiClient } from './client';
import type { Asset, AssetTrackerAssignment } from '../types';

export const assetsApi = {
  getAssets: async (): Promise<Asset[]> => {
    const { data } = await apiClient.get('/assets');
    return data;
  },
  
  getAssetById: async (id: string): Promise<Asset> => {
    const { data } = await apiClient.get(`/assets/${id}`);
    return data;
  },
  
  createAsset: async (assetData: Partial<Asset>): Promise<Asset> => {
    const { data } = await apiClient.post('/assets', assetData);
    return data;
  },
  
  updateAsset: async (id: string, assetData: Partial<Asset>): Promise<Asset> => {
    const { data } = await apiClient.put(`/assets/${id}`, assetData);
    return data;
  },
  
  deleteAsset: async (id: string): Promise<void> => {
    await apiClient.delete(`/assets/${id}`);
  },
  
  assignTracker: async (assetId: string, trackerId: string): Promise<AssetTrackerAssignment> => {
    const { data } = await apiClient.post('/assets/assign', { assetId, trackerId });
    return data;
  },
  
  unassignTracker: async (assetId: string): Promise<void> => {
    await apiClient.delete(`/assets/${assetId}/assign`);
  }
};
