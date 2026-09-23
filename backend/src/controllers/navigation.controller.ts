import { Request, Response, NextFunction } from 'express';
import prisma from '../server';
import { findIndoorRoute } from '../services/navigationEngine';

export const getNodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const nodes = await prisma.navigationNode.findMany({
      include: {
        outgoingEdges: { include: { toNode: true } },
        incomingEdges: { include: { fromNode: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(nodes);
  } catch (error) {
    next(error);
  }
};

export const createNode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nodeId, name, nodeType, bleIdentifier, buildingId, roomId, floorLevel, audioCue } = req.body;

    if (!nodeId || !name) {
      return res.status(400).json({ error: 'nodeId and name are required' });
    }

    const node = await prisma.navigationNode.create({
      data: {
        nodeId: nodeId.trim().toUpperCase(),
        name,
        nodeType: nodeType || 'ROOM',
        bleIdentifier: bleIdentifier ? bleIdentifier.trim().toUpperCase() : undefined,
        buildingId,
        roomId,
        floorLevel: floorLevel || 0,
        audioCue
      }
    });

    res.status(201).json(node);
  } catch (error) {
    next(error);
  }
};

export const createEdge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fromNodeId, toNodeId, distanceMeters, directionDegrees, instruction, accessibilityNotes, isBidirectional } = req.body;

    if (!fromNodeId || !toNodeId) {
      return res.status(400).json({ error: 'fromNodeId and toNodeId are required' });
    }

    const edge = await prisma.navigationEdge.create({
      data: {
        fromNodeId,
        toNodeId,
        distanceMeters: distanceMeters || 1.0,
        directionDegrees: directionDegrees || 0,
        instruction: instruction || 'Proceed forward',
        accessibilityNotes,
        isBidirectional: isBidirectional !== undefined ? isBidirectional : true
      },
      include: { fromNode: true, toNode: true }
    });

    res.status(201).json(edge);
  } catch (error) {
    next(error);
  }
};

export const calculateRoute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { origin, destination } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Both origin and destination query parameters are required' });
    }

    const route = await findIndoorRoute(String(origin), String(destination));

    if (!route) {
      return res.status(444).json({ error: `No indoor navigation path found between '${origin}' and '${destination}'` });
    }

    res.json(route);
  } catch (error) {
    next(error);
  }
};
