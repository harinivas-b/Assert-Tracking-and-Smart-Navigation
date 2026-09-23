import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';

export const getAssets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assets = await prisma.asset.findMany({
      include: {
        assignment: {
          include: {
            tracker: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const [rooms, floors, buildings] = await Promise.all([
      prisma.room.findMany({ select: { id: true, name: true, floorId: true } }),
      prisma.floor.findMany({ select: { id: true, name: true, buildingId: true } }),
      prisma.building.findMany({ select: { id: true, name: true } })
    ]);

    const roomMap = new Map(rooms.map(r => [r.id, r]));
    const floorMap = new Map(floors.map(f => [f.id, f]));
    const buildingMap = new Map(buildings.map(b => [b.id, b]));

    const enriched = assets.map(asset => {
      const room = asset.estimatedRoomId ? roomMap.get(asset.estimatedRoomId) : null;
      const floor = (asset.estimatedFloorId ? floorMap.get(asset.estimatedFloorId) : null) || (room?.floorId ? floorMap.get(room.floorId) : null);
      const building = (asset.estimatedBuildingId ? buildingMap.get(asset.estimatedBuildingId) : null) || (floor?.buildingId ? buildingMap.get(floor.buildingId) : null);

      const roomName = room?.name || null;
      const floorName = floor?.name || null;
      const buildingName = building?.name || null;

      const locationParts = [buildingName, floorName, roomName].filter(Boolean);
      const locationName = roomName || asset.estimatedZoneId || (locationParts.length > 0 ? locationParts.join(' - ') : 'Unknown');

      return {
        ...asset,
        roomName,
        floorName,
        buildingName,
        locationName
      };
    });

    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

export const getAssetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        assignment: {
          include: {
            tracker: true
          }
        }
      }
    });

    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    let roomName: string | null = null;
    if (asset.estimatedRoomId) {
      const room = await prisma.room.findUnique({ where: { id: asset.estimatedRoomId } });
      roomName = room?.name || null;
    }

    res.json({
      ...asset,
      roomName,
      locationName: roomName || asset.estimatedZoneId || 'Unknown'
    });
  } catch (error) {
    next(error);
  }
};

export const createAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, category, serialNumber, department, owner } = req.body;
    
    if (serialNumber) {
      const existing = await prisma.asset.findUnique({ where: { serialNumber } });
      if (existing) {
        res.status(400).json({ error: 'Asset with this serial number already exists' });
        return;
      }
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        category,
        serialNumber,
        department,
        owner,
      },
    });
    res.status(201).json(asset);
  } catch (error) {
    next(error);
  }
};

export const updateAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, category, serialNumber, department, owner, status } = req.body;

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        name,
        category,
        serialNumber,
        department,
        owner,
        status,
      },
    });

    res.json(asset);
  } catch (error) {
    next(error);
  }
};

export const deleteAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.asset.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const assignTracker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assetId, trackerId } = req.body;
    
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const tracker = await prisma.tracker.findUnique({ where: { id: trackerId } });
    if (!tracker) {
      res.status(404).json({ error: 'Tracker not found' });
      return;
    }

    const existingAssignment = await prisma.assetTrackerAssignment.findUnique({
      where: { trackerId },
    });

    if (existingAssignment && existingAssignment.assetId !== assetId) {
       res.status(400).json({ error: 'Tracker is already assigned to another asset' });
       return;
    }

    const assignment = await prisma.assetTrackerAssignment.upsert({
      where: { assetId },
      update: { trackerId },
      create: { assetId, trackerId },
    });

    res.json(assignment);
  } catch (error) {
    next(error);
  }
};

export const unassignTracker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetId = req.params.assetId as string;
    
    const existingAssignment = await prisma.assetTrackerAssignment.findUnique({
      where: { assetId },
    });

    if (!existingAssignment) {
      res.status(400).json({ error: 'Asset is not assigned to a tracker' });
      return;
    }

    await prisma.assetTrackerAssignment.delete({
      where: { assetId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
