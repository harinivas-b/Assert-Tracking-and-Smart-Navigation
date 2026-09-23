import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { realtimeService } from '../services/realtimeService';

export const getGateways = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gateways = await prisma.bLEGateway.findMany({
      include: {
        building: true,
        floor: true,
        room: true,
        zone: true,
      },
      orderBy: { name: 'asc' }
    });

    const now = new Date().getTime();
    const fiveMinsAgo = new Date(now - 5 * 60 * 1000);

    const enrichedGateways = await Promise.all(
      gateways.map(async (gateway: any) => {
        const timeoutMs = (gateway.heartbeatTimeoutSec || 30) * 1000;
        const lastSeenMs = gateway.lastSeen ? new Date(gateway.lastSeen).getTime() : 0;
        const isOnline = lastSeenMs > 0 && (now - lastSeenMs <= timeoutMs);

        const currentStatus = isOnline ? 'ONLINE' : (gateway.lastSeen ? 'OFFLINE' : 'UNKNOWN');

        const recentObservations = await prisma.bLEObservation.groupBy({
          by: ['trackerId'],
          where: {
            gatewayId: gateway.gatewayId,
            timestamp: { gte: fiveMinsAgo }
          }
        });

        return {
          ...gateway,
          status: currentStatus,
          detectedTagsCount: recentObservations.length
        };
      })
    );

    res.json(enrichedGateways);
  } catch (error) {
    next(error);
  }
};

export const getGatewayById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const gateway = await prisma.bLEGateway.findUnique({
      where: { id },
      include: {
        building: true,
        floor: true,
        room: true,
        zone: true,
      },
    });

    if (!gateway) {
      return res.status(404).json({ error: 'Gateway not found' });
    }

    res.json(gateway);
  } catch (error) {
    next(error);
  }
};

export const createGateway = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gatewayId, name, buildingId, floorId, roomId, zoneId, ipAddress, firmwareVersion, heartbeatTimeoutSec } = req.body;
    
    if (!gatewayId || !name) {
      return res.status(400).json({ error: 'Gateway MAC/ID and Name are required' });
    }

    const cleanGatewayId = gatewayId.trim().toUpperCase();

    const existing = await prisma.bLEGateway.findUnique({ where: { gatewayId: cleanGatewayId } });
    if (existing) {
      return res.status(400).json({ error: 'Gateway with this MAC/ID already exists' });
    }

    const gateway = await prisma.bLEGateway.create({
      data: {
        gatewayId: cleanGatewayId,
        name,
        buildingId,
        floorId,
        roomId,
        zoneId,
        ipAddress,
        firmwareVersion,
        heartbeatTimeoutSec: heartbeatTimeoutSec || 30,
        status: 'ONLINE',
        lastSeen: new Date()
      },
      include: { building: true, room: true }
    });

    res.status(201).json(gateway);
  } catch (error) {
    next(error);
  }
};

export const updateGateway = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, status, buildingId, floorId, roomId, zoneId, ipAddress, firmwareVersion, heartbeatTimeoutSec } = req.body;

    const gateway = await prisma.bLEGateway.update({
      where: { id },
      data: {
        name,
        status,
        buildingId,
        floorId,
        roomId,
        zoneId,
        ipAddress,
        firmwareVersion,
        heartbeatTimeoutSec: heartbeatTimeoutSec || 30,
      },
      include: { building: true, room: true }
    });

    realtimeService.broadcast('gateway.status', { gatewayId: gateway.gatewayId, status: gateway.status });

    res.json(gateway);
  } catch (error) {
    next(error);
  }
};

export const deleteGateway = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.bLEGateway.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const gatewayHeartbeat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gatewayId, ipAddress, firmwareVersion } = req.body;

    if (!gatewayId) {
      return res.status(400).json({ error: 'gatewayId is required' });
    }

    const cleanGatewayId = gatewayId.trim().toUpperCase();

    const gateway = await prisma.bLEGateway.upsert({
      where: { gatewayId: cleanGatewayId },
      update: {
        lastSeen: new Date(),
        status: 'ONLINE',
        ipAddress: ipAddress || undefined,
        firmwareVersion: firmwareVersion || undefined
      },
      create: {
        gatewayId: cleanGatewayId,
        name: `Gateway ${cleanGatewayId}`,
        status: 'ONLINE',
        lastSeen: new Date(),
        ipAddress,
        firmwareVersion
      }
    });

    realtimeService.broadcast('gateway.status', { gatewayId: gateway.gatewayId, status: 'ONLINE', lastSeen: gateway.lastSeen });

    res.json({ status: 'ok', gateway });
  } catch (error) {
    next(error);
  }
};
