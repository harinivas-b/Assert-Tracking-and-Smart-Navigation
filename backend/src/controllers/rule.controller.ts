import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';

export const getRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assetId } = req.query;
    const whereClause: any = {};
    if (assetId) whereClause.assetId = String(assetId);

    const rules = await prisma.trackingRule.findMany({
      where: whereClause,
      include: {
        asset: true
      }
    });
    res.json(rules);
  } catch (error) {
    next(error);
  }
};

export const createRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assetId, ruleType, zoneId } = req.body;

    const rule = await prisma.trackingRule.create({
      data: {
        assetId,
        ruleType,
        zoneId
      }
    });

    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
};

export const deleteRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.trackingRule.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
