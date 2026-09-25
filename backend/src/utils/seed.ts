import { PrismaClient } from '@prisma/client';

export const seedDatabase = async (prisma: PrismaClient) => {
  try {
    console.log('[Seed] Checking database initial data...');

    // 1. Organization
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: { name: 'Engineering College Campus' }
      });
    }

    // 2. Building: Engineering Building
    let building = await prisma.building.findFirst({
      where: { name: 'Engineering Building' }
    });

    if (!building) {
      building = await prisma.building.create({
        data: {
          name: 'Engineering Building',
          organizationId: org.id,
          floors: {
            create: [
              {
                name: 'Ground Floor',
                level: 0,
                rooms: {
                  create: [
                    { name: 'Idea Lab' },
                    { name: 'Maker Space' },
                    { name: 'Main Entrance' },
                    { name: 'Central Corridor' },
                    { name: 'Junction A' }
                  ]
                }
              }
            ]
          }
        }
      });
      console.log('[Seed] Created Engineering Building with Ground Floor rooms');
    }

    // Get created rooms
    const ideaLab = await prisma.room.findFirst({ where: { name: 'Idea Lab' } });
    const makerSpace = await prisma.room.findFirst({ where: { name: 'Maker Space' } });
    const entranceRoom = await prisma.room.findFirst({ where: { name: 'Main Entrance' } });
    const corridorRoom = await prisma.room.findFirst({ where: { name: 'Central Corridor' } });
    const junctionRoom = await prisma.room.findFirst({ where: { name: 'Junction A' } });

    // 3. Gateways: GATEWAY1 (Idea Lab), GATEWAY2 (Maker Space)
    let gw1 = await prisma.bLEGateway.findUnique({ where: { gatewayId: 'GATEWAY1' } });
    if (!gw1 && ideaLab && building) {
      gw1 = await prisma.bLEGateway.create({
        data: {
          gatewayId: 'GATEWAY1',
          name: 'Gateway 1 (Idea Lab)',
          buildingId: building.id,
          roomId: ideaLab.id,
          status: 'ONLINE',
          lastSeen: new Date()
        }
      });
    }

    let gw2 = await prisma.bLEGateway.findUnique({ where: { gatewayId: 'GATEWAY2' } });
    if (!gw2 && makerSpace && building) {
      gw2 = await prisma.bLEGateway.create({
        data: {
          gatewayId: 'GATEWAY2',
          name: 'Gateway 2 (Maker Space)',
          buildingId: building.id,
          roomId: makerSpace.id,
          status: 'ONLINE',
          lastSeen: new Date()
        }
      });
    }

    // 4. Smart Tags: SMARTTAG1, SMARTTAG2, SMARTTAG3
    const tag1 = await prisma.tracker.upsert({
      where: { identifier: 'SMARTTAG1' },
      update: {},
      create: { identifier: 'SMARTTAG1', identifierType: 'MAC', type: 'SMART', status: 'ACTIVE', batteryLevel: 95 }
    });

    const tag2 = await prisma.tracker.upsert({
      where: { identifier: 'SMARTTAG2' },
      update: {},
      create: { identifier: 'SMARTTAG2', identifierType: 'MAC', type: 'SMART', status: 'ACTIVE', batteryLevel: 90 }
    });

    const tag3 = await prisma.tracker.upsert({
      where: { identifier: 'SMARTTAG3' },
      update: {},
      create: { identifier: 'SMARTTAG3', identifierType: 'MAC', type: 'SMART', status: 'ACTIVE', batteryLevel: 88 }
    });

    // 5. Assets: 3D Printer 1, 3D Printer 2, 3D Printer 3 assigned to tags and initially in Idea Lab
    let printer1 = await prisma.asset.findFirst({ where: { serialNumber: 'PRINTER-001' } });
    if (!printer1 && ideaLab && building) {
      printer1 = await prisma.asset.create({
        data: {
          name: '3D Printer 1',
          category: 'Manufacturing',
          serialNumber: 'PRINTER-001',
          department: 'Robotics',
          status: 'ACTIVE',
          estimatedBuildingId: building.id,
          estimatedRoomId: ideaLab.id,
          locationConfidence: 100,
          lastLocationUpdate: new Date(),
          assignment: { create: { trackerId: tag1.id } }
        }
      });
    }

    let printer2 = await prisma.asset.findFirst({ where: { serialNumber: 'PRINTER-002' } });
    if (!printer2 && ideaLab && building) {
      printer2 = await prisma.asset.create({
        data: {
          name: '3D Printer 2',
          category: 'Manufacturing',
          serialNumber: 'PRINTER-002',
          department: 'Robotics',
          status: 'ACTIVE',
          estimatedBuildingId: building.id,
          estimatedRoomId: ideaLab.id,
          locationConfidence: 100,
          lastLocationUpdate: new Date(),
          assignment: { create: { trackerId: tag2.id } }
        }
      });
    }

    let printer3 = await prisma.asset.findFirst({ where: { serialNumber: 'PRINTER-003' } });
    if (!printer3 && ideaLab && building) {
      printer3 = await prisma.asset.create({
        data: {
          name: '3D Printer 3',
          category: 'Manufacturing',
          serialNumber: 'PRINTER-003',
          department: 'Robotics',
          status: 'ACTIVE',
          estimatedBuildingId: building.id,
          estimatedRoomId: ideaLab.id,
          locationConfidence: 100,
          lastLocationUpdate: new Date(),
          assignment: { create: { trackerId: tag3.id } }
        }
      });
    }

    // 6. Indoor Navigation Graph (Nodes & Edges) for Blind Assistance Application
    const nEntrance = await prisma.navigationNode.upsert({
      where: { nodeId: 'NODE_ENTRANCE' },
      update: {},
      create: {
        nodeId: 'NODE_ENTRANCE',
        name: 'Main Entrance',
        nodeType: 'ENTRANCE',
        bleIdentifier: 'BLE_NODE_1',
        roomId: entranceRoom?.id,
        audioCue: 'You are at the Main Entrance of Engineering Building.'
      }
    });

    const nCorridor = await prisma.navigationNode.upsert({
      where: { nodeId: 'NODE_CORRIDOR' },
      update: {},
      create: {
        nodeId: 'NODE_CORRIDOR',
        name: 'Central Corridor',
        nodeType: 'CORRIDOR',
        bleIdentifier: 'BLE_NODE_2',
        roomId: corridorRoom?.id,
        audioCue: 'You are in the Central Corridor. Walk straight towards Junction A.'
      }
    });

    const nJunction = await prisma.navigationNode.upsert({
      where: { nodeId: 'NODE_JUNCTION' },
      update: {},
      create: {
        nodeId: 'NODE_JUNCTION',
        name: 'Junction A',
        nodeType: 'JUNCTION',
        bleIdentifier: 'BLE_NODE_3',
        roomId: junctionRoom?.id,
        audioCue: 'Junction A. Turn left for Idea Lab, or turn right for Maker Space.'
      }
    });

    const nIdeaLab = await prisma.navigationNode.upsert({
      where: { nodeId: 'NODE_IDEALAB' },
      update: {},
      create: {
        nodeId: 'NODE_IDEALAB',
        name: 'Idea Lab',
        nodeType: 'ROOM',
        bleIdentifier: 'BLE_NODE_4',
        roomId: ideaLab?.id,
        audioCue: 'Idea Lab entrance.'
      }
    });

    const nMakerSpace = await prisma.navigationNode.upsert({
      where: { nodeId: 'NODE_MAKERSPACE' },
      update: {},
      create: {
        nodeId: 'NODE_MAKERSPACE',
        name: 'Maker Space',
        nodeType: 'ROOM',
        bleIdentifier: 'BLE_NODE_5',
        roomId: makerSpace?.id,
        audioCue: 'Maker Space entrance.'
      }
    });

    // Edges connecting nodes
    const edgeCount = await prisma.navigationEdge.count();
    if (edgeCount === 0) {
      await prisma.navigationEdge.createMany({
        data: [
          {
            fromNodeId: nEntrance.id,
            toNodeId: nCorridor.id,
            distanceMeters: 6.0,
            instruction: 'Walk straight through the entrance down the central corridor.',
            isBidirectional: true
          },
          {
            fromNodeId: nCorridor.id,
            toNodeId: nJunction.id,
            distanceMeters: 8.0,
            instruction: 'Continue straight along the corridor until you reach Junction A.',
            isBidirectional: true
          },
          {
            fromNodeId: nJunction.id,
            toNodeId: nIdeaLab.id,
            distanceMeters: 4.0,
            instruction: 'Turn left at Junction A and walk 4 meters into Idea Lab.',
            directionDegrees: 270,
            isBidirectional: true
          },
          {
            fromNodeId: nJunction.id,
            toNodeId: nMakerSpace.id,
            distanceMeters: 5.0,
            instruction: 'Turn right at Junction A and walk 5 meters into Maker Space.',
            directionDegrees: 90,
            isBidirectional: true
          }
        ]
      });
      console.log('[Seed] Navigation graph edges created successfully.');
    }

    console.log('[Seed] Database initial seed completed successfully.');
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
  }
};
