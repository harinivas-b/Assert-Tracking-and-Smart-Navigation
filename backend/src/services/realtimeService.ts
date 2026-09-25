import { Response } from 'express';

export interface RealtimeEvent {
  type: 'asset.location.updated' | 'hardware.observation' | 'gateway.status' | 'alert.created' | 'unknown.tag';
  data: any;
  timestamp: string;
}

class RealtimeService {
  private clients: Set<Response> = new Set();
  private observationBuffer: any[] = [];
  private readonly maxBufferLength = 50;

  public addClient(res: Response) {
    this.clients.add(res);
    // Send initial connection ACK
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Realtime SSE stream active', timestamp: new Date().toISOString() })}\n\n`);
  }

  public removeClient(res: Response) {
    this.clients.delete(res);
  }

  public broadcast(type: RealtimeEvent['type'], data: any) {
    const eventPayload: RealtimeEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    if (type === 'hardware.observation') {
      this.observationBuffer.unshift(data);
      if (this.observationBuffer.length > this.maxBufferLength) {
        this.observationBuffer.pop();
      }
    }

    const sseMessage = `data: ${JSON.stringify(eventPayload)}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(sseMessage);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  public getRecentObservations() {
    return this.observationBuffer;
  }
}

export const realtimeService = new RealtimeService();
