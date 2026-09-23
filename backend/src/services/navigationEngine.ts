import prisma from '../server';

export interface RouteInstruction {
  stepNumber: number;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  instruction: string;
  distanceMeters: number;
  directionDegrees: number;
  audioCue?: string | null;
}

export interface NavigationRouteResult {
  originNode: { id: string; name: string };
  destinationNode: { id: string; name: string };
  totalDistanceMeters: number;
  estimatedTimeSeconds: number;
  steps: RouteInstruction[];
}

export const findIndoorRoute = async (
  originNodeId: string,
  destinationNodeId: string
): Promise<NavigationRouteResult | null> => {
  const nodes = await prisma.navigationNode.findMany({
    include: {
      outgoingEdges: { include: { toNode: true } },
      incomingEdges: { include: { fromNode: true } }
    }
  });

  const origin = nodes.find((n: any) => n.id === originNodeId || n.nodeId === originNodeId || n.name.toLowerCase().includes(originNodeId.toLowerCase()));
  const destination = nodes.find((n: any) => n.id === destinationNodeId || n.nodeId === destinationNodeId || n.name.toLowerCase().includes(destinationNodeId.toLowerCase()));

  if (!origin || !destination) {
    return null;
  }

  if (origin.id === destination.id) {
    return {
      originNode: { id: origin.id, name: origin.name },
      destinationNode: { id: destination.id, name: destination.name },
      totalDistanceMeters: 0,
      estimatedTimeSeconds: 0,
      steps: [{
        stepNumber: 1,
        nodeId: origin.id,
        nodeName: origin.name,
        nodeType: origin.nodeType,
        instruction: `You are already at ${origin.name}.`,
        distanceMeters: 0,
        directionDegrees: 0,
        audioCue: `You have arrived at ${origin.name}.`
      }]
    };
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, { nodeId: string; edge: any }>();
  const unvisited = new Set<string>();

  for (const node of nodes) {
    distances.set(node.id, Infinity);
    unvisited.add(node.id);
  }
  distances.set(origin.id, 0);

  while (unvisited.size > 0) {
    let currentId: string | null = null;
    let smallestDistance = Infinity;

    for (const nodeId of unvisited) {
      const dist = distances.get(nodeId)!;
      if (dist < smallestDistance) {
        smallestDistance = dist;
        currentId = nodeId;
      }
    }

    if (currentId === null || smallestDistance === Infinity) break;
    if (currentId === destination.id) break;

    unvisited.delete(currentId);

    const currentNode = nodes.find((n: any) => n.id === currentId)!;
    
    for (const edge of currentNode.outgoingEdges) {
      if (!unvisited.has(edge.toNodeId)) continue;
      const alt = distances.get(currentId)! + edge.distanceMeters;
      if (alt < distances.get(edge.toNodeId)!) {
        distances.set(edge.toNodeId, alt);
        previous.set(edge.toNodeId, { nodeId: currentId, edge });
      }
    }

    for (const edge of currentNode.incomingEdges) {
      if (edge.isBidirectional && unvisited.has(edge.fromNodeId)) {
        const alt = distances.get(currentId)! + edge.distanceMeters;
        if (alt < distances.get(edge.fromNodeId)!) {
          distances.set(edge.fromNodeId, alt);
          previous.set(edge.fromNodeId, { nodeId: currentId, edge });
        }
      }
    }
  }

  const path: Array<{ nodeId: string; edge: any }> = [];
  let curr = destination.id;

  while (previous.has(curr)) {
    const prevEntry = previous.get(curr)!;
    path.unshift({ nodeId: curr, edge: prevEntry.edge });
    curr = prevEntry.nodeId;
  }

  if (path.length === 0 && origin.id !== destination.id) {
    return null;
  }

  let totalDistance = 0;
  const steps: RouteInstruction[] = [];

  steps.push({
    stepNumber: 1,
    nodeId: origin.id,
    nodeName: origin.name,
    nodeType: origin.nodeType,
    instruction: `Start at ${origin.name}. Prepare to move toward your destination.`,
    distanceMeters: 0,
    directionDegrees: 0,
    audioCue: `Starting navigation to ${destination.name} from ${origin.name}.`
  });

  let stepCounter = 2;
  for (const step of path) {
    const targetNode = nodes.find((n: any) => n.id === step.nodeId)!;
    totalDistance += step.edge.distanceMeters;

    steps.push({
      stepNumber: stepCounter++,
      nodeId: targetNode.id,
      nodeName: targetNode.name,
      nodeType: targetNode.nodeType,
      instruction: step.edge.instruction || `Proceed to ${targetNode.name}`,
      distanceMeters: step.edge.distanceMeters,
      directionDegrees: step.edge.directionDegrees,
      audioCue: targetNode.audioCue || step.edge.instruction || `Walk ${step.edge.distanceMeters} meters to ${targetNode.name}`
    });
  }

  const lastStep = steps[steps.length - 1];
  lastStep.audioCue = `You have arrived at your destination: ${destination.name}.`;

  const walkingSpeedMetersPerSec = 1.1;
  const estimatedTimeSeconds = Math.round(totalDistance / walkingSpeedMetersPerSec);

  return {
    originNode: { id: origin.id, name: origin.name },
    destinationNode: { id: destination.id, name: destination.name },
    totalDistanceMeters: Math.round(totalDistance * 10) / 10,
    estimatedTimeSeconds,
    steps
  };
};
