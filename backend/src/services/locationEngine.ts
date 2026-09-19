import { prisma } from '../server';
import { realtimeService } from './realtimeService';

export interface LocationEstimateResult {
  assetId: string;
  buildingId?: string | null;
  floorId?: string | null;
  roomId?: string | null;
  zoneId?: string | null;
  confidence: number;
  sources: Array<{ gatewayId: string; rssi: number; smoothedRssi: number }>;
}

interface SmoothingEntry {
  smoothedRssi: number;
  lastUpdated: number;
  history: number[];
}

const observationCache = new Map<string, SmoothingEntry>();
const ALPHA = 0.35;
const HYSTERESIS_MARGIN_DBM = 5;
const EXPIRATION_MS = 15000;

export const processRawObservation = async (
  gatewayId: string,
  trackerIdOrMac: string,
  rssi: number,
  rawMetadata?: any
): Promise<{ processed: boolean; isUnknownTag?: boolean; estimate?: LocationEstimateResult | null }> => {
  const now = Date.now();
  const cleanTrackerId = trackerIdOrMac.trim().toUpperCase();
  const cleanGatewayId = gatewayId.trim().toUpperCase();

  const observationTimestamp = rawMetadata?.reportedAt ? new Date(rawMetadata.reportedAt) : new Date();
  const validObsTime = isNaN(observationTimestamp.getTime()) ? new Date() : observationTimestamp;

  const gateway = await prisma.bLEGateway.findUnique({
    where: { gatewayId: cleanGatewayId },
    include: { building: true, floor: true, room: true, zone: true }
  });

  if (!gateway) {
    console.warn(`[LocationEngine] Received observation from unknown gateway ID: ${cleanGatewayId}`);
    return { processed: false };
  }

  if (!gateway.lastSeen || validObsTime > new Date(gateway.lastSeen)) {
    const isNowOnline = (Date.now() - validObsTime.getTime()) / 1000 <= (gateway.heartbeatTimeoutSec || 90);
    await prisma.bLEGateway.update({
      where: { id: gateway.id },
      data: {
        lastSeen: validObsTime,
        status: isNowOnline ? 'ONLINE' : 'OFFLINE'
      }
    });
    realtimeService.broadcast('gateway.status', {
      gatewayId: gateway.gatewayId,
      status: isNowOnline ? 'ONLINE' : 'OFFLINE',
      lastSeen: validObsTime.toISOString()
    });
  }

  const macName = rawMetadata?.macName ? String(rawMetadata.macName).trim().toUpperCase() : undefined;
  let tracker = await prisma.tracker.findFirst({
    where: {
      OR: [
        { identifier: cleanTrackerId },
        { id: cleanTrackerId },
        ...(macName ? [{ identifier: macName }] : [])
      ]
    },
    include: { assignment: { include: { asset: true } } }
  });

  if (!tracker) {
    console.log(`[LocationEngine] Registering new BLE hardware tracker: ${cleanTrackerId} (Name: ${macName || 'N/A'}) via Gateway ${cleanGatewayId}`);
    tracker = await prisma.tracker.create({
      data: {
        identifier: cleanTrackerId,
        identifierType: 'MAC',
        type: 'SMART',
        status: 'ACTIVE',
        lastSeen: new Date()
      },
      include: { assignment: { include: { asset: true } } }
    });

    // Automatically associate with an asset if not already present
    const assetDisplayName = macName || `BLE Asset (${cleanTrackerId.slice(-8)})`;
    let asset = await prisma.asset.findFirst({
      where: {
        OR: [
          { serialNumber: cleanTrackerId },
          { name: assetDisplayName }
        ]
      }
    });

    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          name: assetDisplayName,
          category: macName?.includes('SCANNER') ? 'Medical Imaging' : (macName?.includes('ECG') ? 'Cardiology' : 'BLE Equipment'),
          serialNumber: cleanTrackerId,
          department: 'Biomedical / General',
          status: 'ACTIVE',
          estimatedBuildingId: gateway.buildingId,
          estimatedFloorId: gateway.floorId,
          estimatedRoomId: gateway.roomId,
          locationConfidence: 100,
          lastLocationUpdate: new Date(),
          assignment: {
            create: { trackerId: tracker.id }
          }
        }
      });
      console.log(`[LocationEngine] Created asset "${assetDisplayName}" for tracker ${cleanTrackerId}`);
    } else {
      // Connect existing asset with this tracker if not assigned
      const existingAssign = await prisma.assetTrackerAssignment.findUnique({ where: { assetId: asset.id } });
      if (!existingAssign) {
        await prisma.assetTrackerAssignment.create({
          data: { assetId: asset.id, trackerId: tracker.id }
        });
      }
    }

    // Refresh tracker with assignment
    tracker = (await prisma.tracker.findUnique({
      where: { id: tracker.id },
      include: { assignment: { include: { asset: true } } }
    }))!;
  }

  let batteryLevel: number | undefined;
  if (rawMetadata?.adc !== undefined && rawMetadata?.adc !== null) {
    const rawAdc = Number(rawMetadata.adc);
    if (!isNaN(rawAdc)) {
      if (rawAdc >= 0 && rawAdc <= 100) {
        batteryLevel = Math.round(rawAdc);
      } else if (rawAdc >= 2000 && rawAdc <= 4500) {
        batteryLevel = Math.round(Math.min(100, Math.max(0, ((rawAdc - 2000) / (3000 - 2000)) * 100)));
      } else if (rawAdc > 100 && rawAdc <= 1200) {
        batteryLevel = Math.round(Math.min(100, Math.max(0, ((rawAdc - 700) / (1060 - 700)) * 100)));
      } else if (rawAdc > 1200 && rawAdc <= 4096) {
        batteryLevel = Math.round(Math.min(100, Math.max(0, ((rawAdc - 2000) / (4096 - 2000)) * 100)));
      }
    }
  }

  const trackerUpdateData: any = {
    lastSeen: validObsTime,
    status: (batteryLevel !== undefined && batteryLevel < 20) ? 'LOW_BATTERY' : 'ACTIVE'
  };
  if (batteryLevel !== undefined) {
    trackerUpdateData.batteryLevel = batteryLevel;
  }

  await prisma.tracker.update({
    where: { id: tracker.id },
    data: trackerUpdateData
  });

  await prisma.bLEObservation.create({
    data: {
      gatewayId: gateway.gatewayId,
      trackerId: tracker.identifier,
      rssi,
      timestamp: validObsTime,
      metadata: rawMetadata || {}
    }
  });

  realtimeService.broadcast('hardware.observation', {
    gatewayId: gateway.gatewayId,
    gatewayName: gateway.name,
    roomName: gateway.room?.name || 'Unassigned',
    trackerIdentifier: tracker.identifier,
    macName: macName || tracker.identifier,
    rssi,
    status: trackerUpdateData.status,
    timestamp: validObsTime.toISOString(),
    metadata: rawMetadata
  });

  const cacheKey = `${tracker.identifier}_${gateway.gatewayId}`;
  let entry = observationCache.get(cacheKey);

  if (!entry || now - entry.lastUpdated > EXPIRATION_MS) {
    entry = { smoothedRssi: rssi, lastUpdated: now, history: [rssi] };
  } else {
    const history = [...entry.history, rssi].slice(-5);
    const smoothedRssi = Math.round(ALPHA * rssi + (1 - ALPHA) * entry.smoothedRssi);
    entry = { smoothedRssi, lastUpdated: now, history };
  }
  observationCache.set(cacheKey, entry);

  if (!tracker.assignment) {
    return { processed: true, isUnknownTag: false };
  }

  const assetId = tracker.assignment.assetId;

  const estimate = await calculateSmoothedLocationEstimate(tracker.identifier, assetId);

  if (estimate) {
    await applyLocationEstimate(estimate, validObsTime);
  }

  return { processed: true, isUnknownTag: false, estimate };
};

const calculateSmoothedLocationEstimate = async (
  trackerIdentifier: string,
  assetId: string
): Promise<LocationEstimateResult | null> => {
  const now = Date.now();
  const validEntries: Array<{ gatewayId: string; smoothedRssi: number }> = [];

  for (const [key, entry] of observationCache.entries()) {
    if (key.startsWith(`${trackerIdentifier}_`)) {
      if (now - entry.lastUpdated <= EXPIRATION_MS) {
        const gatewayId = key.slice(trackerIdentifier.length + 1);
        validEntries.push({ gatewayId, smoothedRssi: entry.smoothedRssi });
      }
    }
  }

  if (validEntries.length === 0) return null;

  validEntries.sort((a, b) => b.smoothedRssi - a.smoothedRssi);
  const bestGateway = validEntries[0];

  const gateway = await prisma.bLEGateway.findUnique({
    where: { gatewayId: bestGateway.gatewayId },
    include: { building: true, floor: true, room: true, zone: true }
  });

  if (!gateway) return null;

  const confidence = Math.max(10, Math.min(100, Math.round((bestGateway.smoothedRssi + 95) * (90 / 55))));

  return {
    assetId,
    buildingId: gateway.buildingId,
    floorId: gateway.floorId,
    roomId: gateway.roomId,
    zoneId: gateway.zoneId,
    confidence,
    sources: validEntries.map(e => ({ gatewayId: e.gatewayId, rssi: e.smoothedRssi, smoothedRssi: e.smoothedRssi }))
  };
};

export const applyLocationEstimate = async (estimate: LocationEstimateResult, observationTime?: Date) => {
  const asset: any = await prisma.asset.findUnique({
    where: { id: estimate.assetId },
    include: { assignment: { include: { tracker: true } } }
  });

  if (!asset) return;

  const eventTime = observationTime || new Date();
  const previousRoomId = asset.estimatedRoomId;
  const newRoomId = estimate.roomId;

  if (previousRoomId && newRoomId && previousRoomId !== newRoomId) {
    const previousGateways = await prisma.bLEGateway.findMany({ where: { roomId: previousRoomId } });
    let previousSmoothedRssi = -100;
    
    if (asset.assignment?.tracker) {
      for (const pg of previousGateways) {
        const cacheEntry = observationCache.get(`${asset.assignment.tracker.identifier}_${pg.gatewayId}`);
        if (cacheEntry && cacheEntry.smoothedRssi > previousSmoothedRssi) {
          previousSmoothedRssi = cacheEntry.smoothedRssi;
        }
      }
    }

    const currentBestSource = estimate.sources[0];
    if (previousSmoothedRssi > -95 && (currentBestSource.smoothedRssi - previousSmoothedRssi) < HYSTERESIS_MARGIN_DBM) {
      return;
    }
  }

  if (previousRoomId && newRoomId && previousRoomId !== newRoomId) {
    // Check for duplicate recent movement event (same asset, same fromRoomId, same toRoomId within 15 seconds)
    const lastMovement = await prisma.movementEvent.findFirst({
      where: { assetId: asset.id },
      orderBy: { timestamp: 'desc' }
    });

    const isDuplicate = lastMovement &&
      lastMovement.fromRoomId === previousRoomId &&
      lastMovement.toRoomId === newRoomId &&
      Math.abs(eventTime.getTime() - new Date(lastMovement.timestamp).getTime()) < 15000;

    if (!isDuplicate) {
      await prisma.movementEvent.create({
        data: {
          assetId: asset.id,
          fromRoomId: previousRoomId,
          toRoomId: newRoomId,
          fromZoneId: asset.estimatedZoneId,
          toZoneId: estimate.zoneId,
          confidence: estimate.confidence,
          timestamp: eventTime
        }
      });
    }

    if (estimate.zoneId) {
      await checkGeofencingRules(asset.id, estimate.zoneId, newRoomId);
    }
  }

  await prisma.asset.update({
    where: { id: asset.id },
    data: {
      estimatedBuildingId: estimate.buildingId,
      estimatedFloorId: estimate.floorId,
      estimatedRoomId: estimate.roomId,
      estimatedZoneId: estimate.zoneId,
      locationConfidence: estimate.confidence,
      lastLocationUpdate: eventTime,
    }
  });

  await prisma.locationEstimate.create({
    data: {
      assetId: estimate.assetId,
      buildingId: estimate.buildingId,
      floorId: estimate.floorId,
      roomId: estimate.roomId,
      zoneId: estimate.zoneId,
      confidence: estimate.confidence,
      sources: estimate.sources,
      timestamp: eventTime
    }
  });

  const newRoom = estimate.roomId ? await prisma.room.findUnique({ where: { id: estimate.roomId } }) : null;
  const oldRoom = previousRoomId ? await prisma.room.findUnique({ where: { id: previousRoomId } }) : null;

  realtimeService.broadcast('asset.location.updated', {
    assetId: asset.id,
    assetName: asset.name,
    previousRoomId: oldRoom?.id || null,
    previousRoomName: oldRoom?.name || 'Unassigned',
    newRoomId: newRoom?.id || null,
    newRoomName: newRoom?.name || 'Unassigned',
    confidence: estimate.confidence,
    timestamp: eventTime.toISOString()
  });
};

export const checkGeofencingRules = async (assetId: string, currentZoneId?: string | null, currentRoomId?: string | null) => {
  if (!currentZoneId) return;

  const rules = await prisma.trackingRule.findMany({ where: { assetId } });

  for (const rule of rules) {
    if (rule.ruleType === 'PERMITTED_ZONE' && rule.zoneId && currentZoneId !== rule.zoneId) {
      const alert = await prisma.alert.create({
        data: {
          type: 'OUT_OF_ZONE',
          severity: 'HIGH',
          assetId,
          description: `Asset left permitted zone`,
        }
      });
      realtimeService.broadcast('alert.created', alert);
    } else if (rule.ruleType === 'RESTRICTED_ZONE' && rule.zoneId && currentZoneId === rule.zoneId) {
      const alert = await prisma.alert.create({
        data: {
          type: 'UNAUTHORIZED_MOVEMENT',
          severity: 'CRITICAL',
          assetId,
          description: `Asset entered restricted zone`,
        }
      });
      realtimeService.broadcast('alert.created', alert);
    }
  }
};
