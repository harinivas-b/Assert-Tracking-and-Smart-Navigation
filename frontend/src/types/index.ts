export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'VIEWER';
  firstName: string | null;
  lastName: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Building {
  id: string;
  name: string;
  organizationId: string;
  floors?: Floor[];
  rooms?: Room[];
  gateways?: Gateway[];
}

export interface Floor {
  id: string;
  name: string;
  level: number;
  buildingId: string;
  rooms?: Room[];
}

export interface Room {
  id: string;
  name: string;
  floorId: string;
  presentAssets?: Asset[];
  gateways?: Gateway[];
  zones?: Zone[];
}

export interface Zone {
  id: string;
  name: string;
  roomId: string;
}

export interface Gateway {
  id: string;
  gatewayId: string; // MAC
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'UNKNOWN';
  ipAddress?: string;
  firmwareVersion?: string;
  heartbeatTimeoutSec?: number;
  buildingId?: string;
  building?: Building;
  floorId?: string;
  floor?: Floor;
  roomId?: string;
  room?: Room;
  zoneId?: string;
  lastSeen?: string;
  detectedTagsCount?: number;
}

export interface Tracker {
  id: string;
  identifier: string; // MAC or other BLE ID
  identifierType: string;
  type: 'SMART' | 'NON_SMART';
  status: 'ACTIVE' | 'INACTIVE' | 'LOST' | 'LOW_BATTERY';
  batteryLevel?: number;
  lastSeen?: string;
  assignment?: AssetTrackerAssignment;
}

export interface Asset {
  id: string;
  name: string;
  category?: string;
  serialNumber?: string;
  department?: string;
  owner?: string;
  status: 'ACTIVE' | 'IN_USE' | 'STORED' | 'MISSING' | 'MAINTENANCE' | 'DECOMMISSIONED';
  
  estimatedBuildingId?: string;
  estimatedFloorId?: string;
  estimatedRoomId?: string;
  estimatedZoneId?: string;
  roomName?: string | null;
  floorName?: string | null;
  buildingName?: string | null;
  locationName?: string;
  locationConfidence?: number;
  lastLocationUpdate?: string;

  assignment?: AssetTrackerAssignment;
}

export interface AssetTrackerAssignment {
  id: string;
  assetId: string;
  trackerId: string;
  assignedAt: string;
  assignedBy?: string;
  tracker?: Tracker;
  asset?: Asset;
}

export interface Alert {
  id: string;
  type: 'UNAUTHORIZED_MOVEMENT' | 'OUT_OF_ZONE' | 'UNKNOWN_TAG' | 'TAG_OFFLINE' | 'GATEWAY_OFFLINE' | 'LOW_BATTERY' | 'ASSET_MISSING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assetId?: string;
  description: string;
  location?: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
  timestamp: string;
  asset?: Asset;
}

export interface HardwareObservation {
  gatewayId: string;
  gatewayName?: string;
  roomName?: string;
  trackerIdentifier: string;
  rssi: number;
  timestamp: string;
  metadata?: any;
}

export interface NavigationNode {
  id: string;
  nodeId: string;
  name: string;
  nodeType: 'ENTRANCE' | 'CORRIDOR' | 'JUNCTION' | 'ROOM' | 'LANDMARK' | 'STAIRCASE' | 'ELEVATOR';
  bleIdentifier?: string;
  buildingId?: string;
  roomId?: string;
  floorLevel?: number;
  audioCue?: string;
}

export interface RouteInstruction {
  stepNumber: number;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  instruction: string;
  distanceMeters: number;
  directionDegrees: number;
  audioCue?: string;
}

export interface NavigationRouteResult {
  originNode: { id: string; name: string };
  destinationNode: { id: string; name: string };
  totalDistanceMeters: number;
  estimatedTimeSeconds: number;
  steps: RouteInstruction[];
}
