import { Request, Response, NextFunction } from 'express';
import prisma from '../server';

export const getLiveAssetReaders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const observations = await prisma.bLEObservation.findMany({
      take: 200,
      where: { timestamp: { gte: new Date(Date.now() - 30000) } },
      orderBy: { timestamp: 'desc' },
      include: {
        gateway: {
          select: {
            gatewayId: true,
            name: true,
            status: true,
            room: { select: { name: true } },
            floor: { select: { name: true } }
          }
        }
      }
    });

    const latestByGateway = new Map<string, typeof observations[number]>();
    observations.forEach((observation: typeof observations[number]) => {
      const existing = latestByGateway.get(observation.gatewayId);
      if (!existing || observation.rssi > existing.rssi) {
        latestByGateway.set(observation.gatewayId, observation);
      }
    });

    res.json({
      readers: Array.from(latestByGateway.values()).map((observation) => ({
        readerId: observation.gateway.gatewayId,
        readerName: observation.gateway.name,
        rssi: observation.rssi,
        timestamp: observation.timestamp,
        status: observation.gateway.status,
        roomName: observation.gateway.room?.name || null,
        floorName: observation.gateway.floor?.name || null
      }))
    });
  } catch (error) {
    next(error);
  }
};