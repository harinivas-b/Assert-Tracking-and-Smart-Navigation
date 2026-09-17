import { Request, Response, NextFunction } from 'express';
import prisma from '../server';

export const getAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, assetId } = req.query;
    
    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (assetId) whereClause.assetId = assetId;

    const alerts = await prisma.alert.findMany({
      where: whereClause,
      include: {
        asset: true
      },
      orderBy: { timestamp: 'desc' }
    });
    res.json(alerts);
  } catch (error) {
    next(error);
  }
};

export const getAlertById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        asset: true
      }
    });

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    res.json(alert);
  } catch (error) {
    next(error);
  }
};

export const updateAlertStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const data: any = { status };
    if (status === 'RESOLVED') {
      data.resolvedAt = new Date();
    }

    const alert = await prisma.alert.update({
      where: { id },
      data
    });

    res.json(alert);
  } catch (error) {
    next(error);
  }
};
