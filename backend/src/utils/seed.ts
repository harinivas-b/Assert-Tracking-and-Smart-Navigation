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
                    { name: 'Junction A' },
                    { name: 'ROOM2' }
                  ]
                }
              },
              { name: 'First Floor', level: 1 },
              { name: 'Second Floor', level: 2 },
              { name: 'Third Floor', level: 3 }
            ]
          }
        }
      });
      console.log('[Seed] Created Engineering Building with 4 floors');
    } else {
      // Ensure all 4 floors exist for the building
      const existingFloors = await prisma.floor.findMany({ where: { buildingId: building.id } });
      const floorLevels = new Set(existingFloors.map(f => f.level));
      const requiredFloors = [
        { name: 'Ground Floor', level: 0 },
        { name: 'First Floor', level: 1 },
        { name: 'Second Floor', level: 2 },
        { name: 'Third Floor', level: 3 }
      ];
      for (const rf of requiredFloors) {
        if (!floorLevels.has(rf.level)) {
          await prisma.floor.create({
            data: { name: rf.name, level: rf.level, buildingId: building.id }
          });
          console.log(`[Seed] Added missing floor: ${rf.name} (Level ${rf.level})`);
        }
      }
    }

    const groundFloor = await prisma.floor.findFirst({
      where: { buildingId: building.id, level: 0 }
    });

    // Ensure ROOM2 exists on Ground Floor
    let room2 = await prisma.room.findFirst({ where: { name: 'ROOM2' } });
    if (!room2 && groundFloor) {
      room2 = await prisma.room.create({
        data: { name: 'ROOM2', floorId: groundFloor.id }
      });
      console.log('[Seed] Created room: ROOM2 on Ground Floor');
    } else if (room2 && groundFloor && room2.floorId !== groundFloor.id) {
      await prisma.room.update({
        where: { id: room2.id },
        data: { floorId: groundFloor.id }
      });
    }

    // Ensure ROOM3 exists on Ground Floor
    let room3 = await prisma.room.findFirst({ where: { name: 'ROOM3' } });
    if (!room3 && groundFloor) {
      room3 = await prisma.room.create({
        data: { name: 'ROOM3', floorId: groundFloor.id }
      });
      console.log('[Seed] Created room: ROOM3 on Ground Floor');
    } else if (room3 && groundFloor && room3.floorId !== groundFloor.id) {
      await prisma.room.update({
        where: { id: room3.id },
        data: { floorId: groundFloor.id }
      });
    }

    // Get created rooms
    const ideaLab = await prisma.room.findFirst({ where: { name: 'Idea Lab' } });
    const makerSpace = await prisma.room.findFirst({ where: { name: 'Maker Space' } });
    const entranceRoom = await prisma.room.findFirst({ where: { name: 'Main Entrance' } });
    const corridorRoom = await prisma.room.findFirst({ where: { name: 'Central Corridor' } });
    const junctionRoom = await prisma.room.findFirst({ where: { name: 'Junction A' } });

    // 3. Gateways:
    // Gateway 1 (Reader 3) and Gateway 2 are configured in database
    // Status and lastSeen are dynamically determined by real observations
    let gw1 = await prisma.bLEGateway.findFirst({
      where: {
        OR: [
          { gatewayId: 'GATEWAY1' },
          { gatewayId: 'READER3' },
          { gatewayId: 'GW_ROOM3' }
        ]
      }
    });
    const reader3RoomId = room3?.id || ideaLab?.id;
    if (!gw1 && reader3RoomId && building) {
      gw1 = await prisma.bLEGateway.create({
        data: {
          gatewayId: 'GATEWAY1',
          name: 'Reader 3',
          buildingId: building.id,
          roomId: reader3RoomId,
          floorId: groundFloor?.id,
          status: 'OFFLINE',
          lastSeen: null
        }
      });
      console.log('[Seed] Registered Reader 3 (GATEWAY1) in ROOM3');
    } else if (gw1 && reader3RoomId) {
      await prisma.bLEGateway.update({
        where: { id: gw1.id },
        data: {
          name: 'Reader 3',
          roomId: reader3RoomId,
          floorId: groundFloor?.id,
          buildingId: building?.id
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
          floorId: groundFloor?.id,
          status: 'OFFLINE',
          lastSeen: null
        }
      });
    } else if (gw2) {
      await prisma.bLEGateway.update({
        where: { id: gw2.id },
        data: {
          name: 'Gateway 2 (Maker Space)',
          roomId: makerSpace?.id,
          floorId: groundFloor?.id,
          buildingId: building?.id
        }
      });
    }

    // Reader 2 (ROOM2)
    let gwRoom2 = await prisma.bLEGateway.findUnique({ where: { gatewayId: 'GW_ROOM2' } });
    if (!gwRoom2 && room2 && building) {
      gwRoom2 = await prisma.bLEGateway.create({
        data: {
          gatewayId: 'GW_ROOM2',
          name: 'Reader 2 (ROOM2)',
          buildingId: building.id,
          floorId: groundFloor?.id,
          roomId: room2.id,
          status: 'OFFLINE',
          lastSeen: null
        }
      });
    } else if (gwRoom2 && room2) {
      await prisma.bLEGateway.update({
        where: { id: gwRoom2.id },
        data: {
          name: 'Reader 2 (ROOM2)',
          roomId: room2.id,
          buildingId: building.id,
          floorId: groundFloor?.id
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

    const nRoom2 = await prisma.navigationNode.upsert({
      where: { nodeId: 'NODE_ROOM2' },
      update: {},
      create: {
        nodeId: 'NODE_ROOM2',
        name: 'Room 2',
        nodeType: 'ROOM',
        bleIdentifier: 'BLE_NODE_6',
        roomId: room2?.id,
        audioCue: 'Room 2 entrance.'
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
          },
          {
            fromNodeId: nJunction.id,
            toNodeId: nRoom2.id,
            distanceMeters: 6.0,
            instruction: 'At Junction A, proceed straight 6 meters into Room 2.',
            directionDegrees: 0,
            isBidirectional: true
          }
        ]
      });
      console.log('[Seed] Navigation graph edges created successfully.');
    } else {
      // Ensure Room 2 is connected
      const room2Edge = await prisma.navigationEdge.findFirst({
        where: {
          OR: [
            { fromNodeId: nJunction.id, toNodeId: nRoom2.id },
            { fromNodeId: nRoom2.id, toNodeId: nJunction.id }
          ]
        }
      });
      if (!room2Edge) {
        await prisma.navigationEdge.create({
          data: {
            fromNodeId: nJunction.id,
            toNodeId: nRoom2.id,
            distanceMeters: 6.0,
            instruction: 'At Junction A, proceed straight 6 meters into Room 2.',
            directionDegrees: 0,
            isBidirectional: true
          }
        });
        console.log('[Seed] Connected Room 2 to Junction A in navigation graph.');
      }
    }

    console.log('[Seed] Database initial seed completed successfully.');
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
  }
};
