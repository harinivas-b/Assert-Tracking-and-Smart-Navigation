import { Request, Response, NextFunction } from 'express';
import { processRawObservation } from '../services/locationEngine';
import { realtimeService } from '../services/realtimeService';
import { thingspeakService } from '../services/thingspeakService';
import prisma from '../server';

export const syncThingSpeak = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawFrom = req.query.fromEntryId || (req.body && req.body.fromEntryId);
    const fromEntryId = rawFrom !== undefined ? parseInt(String(rawFrom), 10) : undefined;
    const result = await thingspeakService.fetchAndProcess(isNaN(Number(fromEntryId)) ? undefined : fromEntryId);
    res.json({
      status: 'ok',
      result,
      state: thingspeakService.getStatus()
    });
  } catch (error) {
    next(error);
  }
};

export const ingestObservations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    let items: any[] = [];

    if (Array.isArray(body)) {
      items = body;
    } else if (body.observations && Array.isArray(body.observations)) {
      items = body.observations;
    } else if (typeof body === 'object' && body !== null) {
      items = [body];
    }

    if (items.length === 0) {
      return res.status(400).json({ error: 'No valid observation objects supplied' });
    }

    let processedCount = 0;
    let unknownTagCount = 0;
    const errors: any[] = [];

    for (const item of items) {
      const gatewayId = item.gatewayId || item.gateway_id || item.mac_gateway || item.gateway;
      const tagId = item.tagId || item.tag_id || item.trackerId || item.mac || item.bleAddress || item.addr;
      const rssi = item.rssi !== undefined ? Number(item.rssi) : undefined;

      if (!gatewayId || !tagId || rssi === undefined || isNaN(rssi)) {
        errors.push({ error: 'Missing gatewayId, tagId, or valid rssi', item });
        continue;
      }

      const result = await processRawObservation(
        String(gatewayId),
        String(tagId),
        rssi,
        item.metadata || item.raw || item
      );

      if (result.processed) {
        processedCount++;
        if (result.isUnknownTag) {
          unknownTagCount++;
        }
      }
    }

    res.status(202).json({
      status: 'ok',
      processedCount,
      unknownTagCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    next(error);
  }
};

export const subscribeDebugStream = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  realtimeService.addClient(res);

  req.on('close', () => {
    realtimeService.removeClient(res);
  });
};

export const getRecentObservations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const observations = await prisma.bLEObservation.findMany({
      take: 50,
      orderBy: { timestamp: 'desc' },
      include: {
        gateway: { select: { gatewayId: true, name: true, room: { select: { name: true } } } },
        tracker: { select: { identifier: true, type: true, assignment: { include: { asset: { select: { name: true } } } } } }
      }
    });

    res.json(observations);
  } catch (error) {
    next(error);
  }
};
