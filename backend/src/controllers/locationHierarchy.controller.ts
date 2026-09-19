import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { computeAssetStatus } from '../utils/freshness';

export const getBuildings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buildings = await prisma.building.findMany({
      include: {
        floors: {
          orderBy: { level: 'asc' },
          include: {
            rooms: {
              include: {
                gateways: true,
                zones: true
              }
            }
          }
        },
        gateways: true
      },
      orderBy: { name: 'asc' }
    });

    const buildingsWithAssetCounts = await Promise.all(
      buildings.map(async (building: any) => {
        const enrichedFloors = await Promise.all(
          building.floors.map(async (floor: any) => {
            const enrichedRooms = await Promise.all(
              floor.rooms.map(async (room: any) => {
                const assetsInRoom = await prisma.asset.findMany({
                  where: { estimatedRoomId: room.id },
                  include: { assignment: { include: { tracker: true } } }
                });

                const activeAssets = assetsInRoom.map((asset: any) => {
                  const trackerLastSeen = asset.assignment?.tracker?.lastSeen || asset.lastLocationUpdate;
                  const dynamicStatus = computeAssetStatus(trackerLastSeen, asset.status);
                  return {
                    ...asset,
                    status: dynamicStatus,
                    rawStatus: asset.status,
                    lastSeen: trackerLastSeen
                  };
                });

                return {
                  ...room,
                  presentAssets: activeAssets
                };
              })
            );

            return {
              ...floor,
              rooms: enrichedRooms
            };
          })
        );

        const allRoomsWithAssets = enrichedFloors.flatMap((f: any) => f.rooms);

        return {
          ...building,
          floors: enrichedFloors,
          rooms: allRoomsWithAssets
        };
      })
    );

    res.json(buildingsWithAssetCounts);
  } catch (error) {
    next(error);
  }
};

export const createBuilding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, organizationId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Building name is required' });
    }

    let orgId = organizationId;
    if (!orgId) {
      const defaultOrg = await prisma.organization.findFirst();
      if (defaultOrg) {
        orgId = defaultOrg.id;
      } else {
        const newOrg = await prisma.organization.create({
          data: { name: 'Default Organization' }
        });
        orgId = newOrg.id;
      }
    }

    const building = await prisma.building.create({
      data: {
        name,
        organizationId: orgId,
        floors: {
          create: [
            { name: 'Ground Floor', level: 0 },
            { name: 'First Floor', level: 1 },
            { name: 'Second Floor', level: 2 },
            { name: 'Third Floor', level: 3 }
          ]
        }
      },
      include: { floors: true }
    });

    res.status(201).json(building);
  } catch (error) {
    next(error);
  }
};

export const updateBuilding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name } = req.body;

    const building = await prisma.building.update({
      where: { id },
      data: { name }
    });

    res.json(building);
  } catch (error) {
    next(error);
  }
};

export const deleteBuilding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const activeGateways = await prisma.bLEGateway.count({ where: { buildingId: id } });
    if (activeGateways > 0) {
      return res.status(400).json({
        error: `Cannot delete building: ${activeGateways} active BLE gateways are assigned to it. Reassign or remove gateways first.`
      });
    }

    await prisma.building.delete({ where: { id } });
    res.json({ message: 'Building deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, floorId } = req.body;

    if (!name || !floorId) {
      return res.status(400).json({ error: 'Room name and floorId are required' });
    }

    const room = await prisma.room.create({
      data: {
        name,
        floorId
      },
      include: { floor: { include: { building: true } } }
    });

    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
};

export const updateRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name } = req.body;

    const room = await prisma.room.update({
      where: { id },
      data: { name }
    });

    res.json(room);
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const activeGateways = await prisma.bLEGateway.count({ where: { roomId: id } });
    if (activeGateways > 0) {
      return res.status(400).json({
        error: `Cannot delete room: ${activeGateways} BLE gateways are assigned to this room.`
      });
    }

    await prisma.room.delete({ where: { id } });
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    next(error);
  }
};
