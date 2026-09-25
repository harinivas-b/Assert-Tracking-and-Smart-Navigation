import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';

export const getTrackers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trackers = await prisma.tracker.findMany({
      include: {
        assignment: {
          include: {
            asset: true
          }
        }
      },
      orderBy: { identifier: 'asc' }
    });
    res.json(trackers);
  } catch (error) {
    next(error);
  }
};

export const getTrackerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const tracker = await prisma.tracker.findUnique({
      where: { id },
      include: {
        assignment: {
          include: {
            asset: true
          }
        }
      }
    });

    if (!tracker) {
      res.status(404).json({ error: 'Tracker not found' });
      return;
    }

    res.json(tracker);
  } catch (error) {
    next(error);
  }
};

export const createTracker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, identifierType, type } = req.body;
    
    if (!identifier) {
      return res.status(400).json({ error: 'Tracker identifier/MAC is required' });
    }

    const cleanIdentifier = identifier.trim().toUpperCase();

    const existing = await prisma.tracker.findUnique({ where: { identifier: cleanIdentifier } });
    if (existing) {
      res.status(400).json({ error: 'Tracker with this identifier already exists' });
      return;
    }

    const tracker = await prisma.tracker.create({
      data: {
        identifier: cleanIdentifier,
        identifierType: identifierType || 'MAC',
        type: type || 'SMART',
        status: 'ACTIVE'
      },
    });
    res.status(201).json(tracker);
  } catch (error) {
    next(error);
  }
};

export const updateTracker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { type, status, batteryLevel } = req.body;

    const tracker = await prisma.tracker.update({
      where: { id },
      data: {
        type,
        status,
        batteryLevel,
      },
    });

    res.json(tracker);
  } catch (error) {
    next(error);
  }
};

export const deleteTracker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.tracker.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
