import { apiClient } from './client';
import type { Organization, Building, Floor, Room, Zone } from '../types';

export const locationsApi = {
  getOrganizations: async (): Promise<Organization[]> => {
    const { data } = await apiClient.get('/locations/organizations');
    return data;
  },
  
  getBuildings: async (): Promise<Building[]> => {
    const { data } = await apiClient.get('/locations/buildings');
    return data;
  },
  
  getFloors: async (): Promise<Floor[]> => {
    const { data } = await apiClient.get('/locations/floors');
    return data;
  },
  
  getRooms: async (): Promise<Room[]> => {
    const { data } = await apiClient.get('/locations/rooms');
    return data;
  },
  
  getZones: async (): Promise<Zone[]> => {
    const { data } = await apiClient.get('/locations/zones');
    return data;
  }
};
