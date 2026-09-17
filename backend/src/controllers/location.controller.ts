import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { NotFoundError } from '../utils/errors';

// Organizations
export const getOrganizations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgs = await prisma.organization.findMany({ include: { _count: { select: { buildings: true } } } });
    res.json({ status: 'success', data: orgs });
  } catch (error) { next(error); }
};

export const createOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await prisma.organization.create({ data: { name: req.body.name } });
    res.status(201).json({ status: 'success', data: org });
  } catch (error) { next(error); }
};

// Buildings
export const getBuildings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buildings = await prisma.building.findMany({ 
      where: req.query.organizationId ? { organizationId: String(req.query.organizationId) } : undefined,
      include: { _count: { select: { floors: true } } } 
    });
    res.json({ status: 'success', data: buildings });
  } catch (error) { next(error); }
};

export const createBuilding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, organizationId } = req.body;
    const building = await prisma.building.create({ data: { name, organizationId } });
    res.status(201).json({ status: 'success', data: building });
  } catch (error) { next(error); }
};

// Floors
export const getFloors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const floors = await prisma.floor.findMany({
      where: req.query.buildingId ? { buildingId: String(req.query.buildingId) } : undefined,
      include: { _count: { select: { rooms: true } } }
    });
    res.json({ status: 'success', data: floors });
  } catch (error) { next(error); }
};

export const createFloor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, level, buildingId } = req.body;
    const floor = await prisma.floor.create({ data: { name, level: Number(level) || 0, buildingId } });
    res.status(201).json({ status: 'success', data: floor });
  } catch (error) { next(error); }
};

// Rooms
export const getRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rooms = await prisma.room.findMany({
      where: req.query.floorId ? { floorId: String(req.query.floorId) } : undefined,
      include: { _count: { select: { zones: true } } }
    });
    res.json({ status: 'success', data: rooms });
  } catch (error) { next(error); }
};

export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, floorId } = req.body;
    const room = await prisma.room.create({ data: { name, floorId } });
    res.status(201).json({ status: 'success', data: room });
  } catch (error) { next(error); }
};

// Zones
export const getZones = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const zones = await prisma.zone.findMany({
      where: req.query.roomId ? { roomId: String(req.query.roomId) } : undefined,
    });
    res.json({ status: 'success', data: zones });
  } catch (error) { next(error); }
};

export const createZone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, roomId } = req.body;
    const zone = await prisma.zone.create({ data: { name, roomId } });
    res.status(201).json({ status: 'success', data: zone });
  } catch (error) { next(error); }
};

// Movement Events History
export const getMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const movements = await prisma.movementEvent.findMany({
      take: 100,
      orderBy: { timestamp: 'desc' },
      include: {
        asset: { select: { id: true, name: true, serialNumber: true } }
      }
    });
    res.json(movements);
  } catch (error) {
    next(error);
  }
};
