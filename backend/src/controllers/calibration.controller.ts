import { Request, Response, NextFunction } from 'express';
import prisma from '../server';

export const getCalibrationSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await prisma.calibrationSession.findMany({
      include: {
        measurements: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

export const getCalibrationSessionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const session = await prisma.calibrationSession.findUnique({
      where: { id },
      include: {
        measurements: {
          include: {
            gateway: true,
            tracker: true
          }
        }
      }
    });

    if (!session) {
      res.status(404).json({ error: 'Calibration session not found' });
      return;
    }

    res.json(session);
  } catch (error) {
    next(error);
  }
};

export const createCalibrationSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    
    const session = await prisma.calibrationSession.create({
      data: {
        name,
        description,
      }
    });

    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
};

export const addMeasurement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { gatewayId, trackerId, knownRoomId, knownDistance, rssi, notes } = req.body;

    const measurement = await prisma.calibrationMeasurement.create({
      data: {
        sessionId: id,
        gatewayId,
        trackerId,
        knownRoomId,
        knownDistance,
        rssi,
        notes
      }
    });

    res.status(201).json(measurement);
  } catch (error) {
    next(error);
  }
};
