import { prisma } from '../server';
import { processRawObservation } from './locationEngine';

interface ThingSpeakChannelMeta {
  id: number;
  name: string;
  [key: string]: any;
}

interface ThingSpeakFeed {
  created_at: string;
  entry_id: number;
  field1?: string | null;
  field2?: string | null;
  field3?: string | null;
  field4?: string | null;
  field5?: string | null;
  field6?: string | null;
  field7?: string | null;
  field8?: string | null;
  [key: string]: any;
}

interface ParsedThingSpeakRecord {
  time: string;
  entryId: number;
  mac: string;
  macName?: string;
  rssi: number;
  adc?: number;
  room: string;
  gatewayId: string;
}

export interface ThingSpeakChannelConfig {
  channelId: string;
  apiKey?: string;
  defaultRoom: string;
  gatewayId: string;
  name: string;
}

class ThingSpeakService {
  private lastProcessedEntryIds = new Map<string, number>();
  private pollIntervalTimer: NodeJS.Timeout | null = null;
  private isPollingActive: boolean = false;
  private isProcessing: boolean = false;

  public getConfiguredChannels(): ThingSpeakChannelConfig[] {
    const channels: ThingSpeakChannelConfig[] = [];

    // Reader 2 (ROOM2)
    const ch2 = (process.env.THINGSPEAK_CHANNEL_ID || '3042355').trim();
    if (ch2) {
      channels.push({
        channelId: ch2,
        apiKey: (process.env.THINGSPEAK_READ_API_KEY || 'VO5ZH5KJ1XCA71GN').trim(),
        defaultRoom: 'ROOM2',
        gatewayId: 'GW_ROOM2',
        name: 'Reader 2 (ROOM2)'
      });
    }

    // Reader 3 (ROOM3)
    const ch3 = (process.env.READER3_THINGSPEAK_CHANNEL_ID || '2995714').trim();
    if (ch3) {
      channels.push({
        channelId: ch3,
        apiKey: (process.env.READER3_THINGSPEAK_READ_API_KEY || '5W2CC3C22YESJR5R').trim(),
        defaultRoom: 'ROOM3',
        gatewayId: 'GATEWAY1',
        name: 'Reader 3'
      });
    }

    return channels;
  }

  public async getLatestStoredEntryIdForChannel(channelId: string): Promise<number> {
    try {
      const recentObservations = await prisma.bLEObservation.findMany({
        take: 300,
        orderBy: { timestamp: 'desc' },
        select: { metadata: true }
      });

      for (const obs of recentObservations) {
        if (obs?.metadata && typeof obs.metadata === 'object') {
          const meta = obs.metadata as any;
          if (String(meta.channelId) === String(channelId) && typeof meta.entryId === 'number') {
            return meta.entryId;
          }
        }
      }
    } catch (err) {
      console.warn(`[ThingSpeakService] Could not determine latest entryId for channel ${channelId}:`, err);
    }
    return 0;
  }

  public async initialize(): Promise<void> {
    const channels = this.getConfiguredChannels();
    for (const ch of channels) {
      const lastId = await this.getLatestStoredEntryIdForChannel(ch.channelId);
      this.lastProcessedEntryIds.set(ch.channelId, lastId);
      console.log(`[ThingSpeakService] Initialized ${ch.name} (${ch.channelId}). Last processed entry ID: ${lastId}`);
    }
  }

  /**
   * Parse a single feed row by inspecting channel field labels, or fallback to value heuristics.
   */
  public parseFeedRow(feed: ThingSpeakFeed, channelMeta?: ThingSpeakChannelMeta, defaultRoom?: string): ParsedThingSpeakRecord | null {
    if (!feed || !feed.entry_id) return null;

    let mac: string | undefined;
    let macName: string | undefined;
    let rssi: number | undefined;
    let adc: number | undefined;
    let room: string | undefined;

    // 1. Try matching using channel metadata field names (e.g. channel.field1 = "MAC")
    if (channelMeta) {
      for (let i = 1; i <= 8; i++) {
        const fieldKey = `field${i}` as keyof ThingSpeakFeed;
        const metaLabel = (channelMeta[fieldKey] || '').toString().trim().toUpperCase();
        const value = feed[fieldKey]?.toString().trim();

        if (!value) continue;

        if (metaLabel === 'MAC' || metaLabel.includes('MAC ADDRESS') || metaLabel === 'TAG MAC') {
          mac = value;
        } else if (metaLabel === 'MAC NAME' || metaLabel.includes('TAG NAME') || metaLabel.includes('DEVICE NAME') || metaLabel === 'TAG') {
          macName = value;
        } else if (metaLabel === 'RSSI' || metaLabel.includes('SIGNAL')) {
          const parsedRssi = parseInt(value, 10);
          if (!isNaN(parsedRssi)) rssi = parsedRssi;
        } else if (metaLabel === 'ADC' || metaLabel.includes('BATTERY')) {
          const parsedAdc = parseInt(value, 10);
          if (!isNaN(parsedAdc)) adc = parsedAdc;
        } else if (metaLabel === 'ROOM' || metaLabel.includes('LOCATION') || metaLabel.includes('GATEWAY')) {
          room = value;
        }
      }
    }

    // 2. Fallback heuristic detection if channel metadata is generic (e.g. Field 1, Field 2)
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    const fields = [feed.field1, feed.field2, feed.field3, feed.field4, feed.field5, feed.field6, feed.field7, feed.field8];

    for (const rawVal of fields) {
      if (!rawVal) continue;
      const strVal = rawVal.toString().trim();

      // MAC format
      if (!mac && macRegex.test(strVal)) {
        mac = strVal.toUpperCase();
        continue;
      }

      // RSSI format: typically -30 to -115 dBm
      const numVal = parseInt(strVal, 10);
      if (rssi === undefined && !isNaN(numVal) && numVal < 0 && numVal >= -120) {
        rssi = numVal;
        continue;
      }

      // ADC format: integer between 100 and 4096 (common 10/12-bit ADC readings)
      if (adc === undefined && !isNaN(numVal) && numVal > 0 && numVal <= 5000) {
        adc = numVal;
        continue;
      }

      // ROOM format: starts with ROOM (e.g. ROOM2, ROOM3, ROOM1)
      if (!room && /^ROOM\s*\w*/i.test(strVal)) {
        room = strVal.toUpperCase().replace(/\s+/g, '');
        continue;
      }

      // MAC NAME format: e.g. SMARTTAGADC11, MRISCANNER, ECGMACHINE1
      if (!macName && !macRegex.test(strVal) && isNaN(numVal) && !/^ROOM\s*\w*/i.test(strVal)) {
        macName = strVal;
        continue;
      }
    }

    // Validation: MAC and RSSI are required for location tracking
    if (rssi === undefined) return null;
    if (!mac) {
      if (macName) {
        mac = macName;
      } else {
        return null;
      }
    }

    const resolvedRoom = room || defaultRoom || 'ROOM_DEFAULT';
    const gatewayId = resolvedRoom.toUpperCase() === 'ROOM3' ? 'GATEWAY1' : `GW_${resolvedRoom.toUpperCase()}`;

    return {
      time: feed.created_at,
      entryId: feed.entry_id,
      mac: mac.toUpperCase(),
      macName,
      rssi,
      adc,
      room: resolvedRoom,
      gatewayId
    };
  }

  /**
   * Ensure a gateway and room exist in the DB for the given room identifier
   */
  public async ensureGatewayForRoom(roomName: string, gatewayId: string): Promise<string> {
    const cleanRoomName = roomName.trim();
    const cleanGatewayId = gatewayId.trim().toUpperCase();

    let readerDisplayName = cleanRoomName.toUpperCase() === 'ROOM2' ? 'Reader 2 (ROOM2)' : `Reader (${cleanRoomName})`;
    if (cleanGatewayId === 'GATEWAY1' || cleanGatewayId === 'READER3' || cleanGatewayId === 'GW_ROOM3' || cleanRoomName.toUpperCase() === 'ROOM3') {
      readerDisplayName = 'Reader 3';
    }

    // Check if room with this name already exists
    let room = await prisma.room.findFirst({
      where: { name: cleanRoomName },
      include: { floor: { include: { building: true } } }
    });

    if (!room) {
      let groundFloor = await prisma.floor.findFirst({ where: { level: 0 } });
      if (!groundFloor) {
        let building = await prisma.building.findFirst();
        groundFloor = await prisma.floor.create({
          data: { name: 'Ground Floor', level: 0, buildingId: building?.id || '' }
        });
      }
      room = await prisma.room.create({
        data: { name: cleanRoomName, floorId: groundFloor.id },
        include: { floor: { include: { building: true } } }
      });
      console.log(`[ThingSpeakService] Created room: ${cleanRoomName}`);
    }

    // Special mapping for Reader 3 (ROOM3 / GATEWAY1)
    if (cleanRoomName.toUpperCase() === 'ROOM3' || cleanGatewayId === 'GATEWAY1' || cleanGatewayId === 'GW_ROOM3') {
      const existingR3 = await prisma.bLEGateway.findFirst({
        where: {
          OR: [
            { gatewayId: 'GATEWAY1' },
            { gatewayId: 'GW_ROOM3' },
            { gatewayId: 'READER3' }
          ]
        }
      });
      if (existingR3) {
        if (existingR3.name !== 'Reader 3' || existingR3.roomId !== room.id) {
          await prisma.bLEGateway.update({
            where: { id: existingR3.id },
            data: {
              name: 'Reader 3',
              roomId: room.id,
              floorId: room.floorId
            }
          });
        }
        return existingR3.gatewayId;
      }
    }

    // Check if gateway already exists by gatewayId
    const existingGateway = await prisma.bLEGateway.findUnique({
      where: { gatewayId: cleanGatewayId }
    });

    if (existingGateway) {
      // Keep name and room updated
      if (existingGateway.name !== readerDisplayName || existingGateway.roomId !== room.id) {
        await prisma.bLEGateway.update({
          where: { id: existingGateway.id },
          data: {
            name: readerDisplayName,
            roomId: room.id,
            buildingId: room.floor?.buildingId || undefined,
            floorId: room.floorId
          }
        });
      }
      return existingGateway.gatewayId;
    }

    // Create gateway for this room
    const createdGateway = await prisma.bLEGateway.create({
      data: {
        gatewayId: cleanGatewayId,
        name: readerDisplayName,
        roomId: room.id,
        buildingId: room.floor?.buildingId || undefined,
        floorId: room.floorId,
        status: 'OFFLINE',
        lastSeen: null
      }
    });

    console.log(`[ThingSpeakService] Created BLE Gateway: ${cleanGatewayId} (${readerDisplayName}) assigned to ${cleanRoomName}`);
    return createdGateway.gatewayId;
  }

  /**
   * Poll a single channel and process new entries
   */
  private async pollSingleChannel(config: ThingSpeakChannelConfig, forceFromEntryId?: number): Promise<{ fetched: number; processed: number; lastEntryId: number }> {
    let lastId = forceFromEntryId !== undefined ? forceFromEntryId : (this.lastProcessedEntryIds.get(config.channelId) || 0);

    const url = `https://api.thingspeak.com/channels/${config.channelId}/feeds.json?results=25${config.apiKey ? `&api_key=${config.apiKey}` : ''}`;

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ThingSpeakService] HTTP ${response.status} from ThingSpeak for ${config.name} (${config.channelId}): ${errorText}`);
        return { fetched: 0, processed: 0, lastEntryId: lastId };
      }

      const data = await response.json() as { channel?: ThingSpeakChannelMeta; feeds?: ThingSpeakFeed[] };
      const feeds = data.feeds || [];
      const channelMeta = data.channel;

      let processedCount = 0;
      const newFeeds = feeds.filter(f => f.entry_id > lastId);

      for (const feed of newFeeds) {
        const record = this.parseFeedRow(feed, channelMeta, config.defaultRoom);
        if (!record) {
          if (feed.entry_id > lastId) lastId = feed.entry_id;
          continue;
        }

        // Ensure gateway and room are mapped in DB
        const effectiveGatewayId = await this.ensureGatewayForRoom(record.room, record.gatewayId);

        // Process raw observation through location engine
        await processRawObservation(
          effectiveGatewayId,
          record.mac,
          record.rssi,
          {
            macName: record.macName,
            adc: record.adc,
            room: record.room,
            entryId: record.entryId,
            channelId: config.channelId,
            source: 'thingspeak',
            reportedAt: record.time
          }
        );

        if (record.entryId > lastId) {
          lastId = record.entryId;
        }
        processedCount++;
      }

      this.lastProcessedEntryIds.set(config.channelId, lastId);
      return { fetched: feeds.length, processed: processedCount, lastEntryId: lastId };
    } catch (err: any) {
      console.error(`[ThingSpeakService] Error polling ${config.name}:`, err.message || err);
      return { fetched: 0, processed: 0, lastEntryId: lastId };
    }
  }

  /**
   * Fetch recent feeds from all configured ThingSpeak channels
   */
  public async fetchAndProcess(forceFromEntryId?: number, targetChannelId?: string): Promise<{ fetched: number; processed: number; lastEntryId: number; error?: string }> {
    if (this.isProcessing) {
      return { fetched: 0, processed: 0, lastEntryId: 0 };
    }

    this.isProcessing = true;
    let totalFetched = 0;
    let totalProcessed = 0;
    let latestEntryId = 0;

    try {
      const channels = this.getConfiguredChannels();
      const channelsToPoll = targetChannelId ? channels.filter(c => c.channelId === targetChannelId) : channels;

      for (const config of channelsToPoll) {
        const res = await this.pollSingleChannel(config, forceFromEntryId);
        totalFetched += res.fetched;
        totalProcessed += res.processed;
        if (res.lastEntryId > latestEntryId) {
          latestEntryId = res.lastEntryId;
        }
      }

      return {
        fetched: totalFetched,
        processed: totalProcessed,
        lastEntryId: latestEntryId
      };
    } catch (err: any) {
      console.error('[ThingSpeakService] Error during synchronization:', err.message || err);
      return { fetched: totalFetched, processed: totalProcessed, lastEntryId: latestEntryId, error: err.message };
    } finally {
      this.isProcessing = false;
    }
  }

  public startPolling(intervalMs: number = 15000): void {
    if (this.isPollingActive) return;

    this.isPollingActive = true;
    console.log(`[ThingSpeakService] Starting background polling worker (every ${intervalMs / 1000}s) across configured channels...`);

    // Run first sync immediately
    this.fetchAndProcess().catch(console.error);

    this.pollIntervalTimer = setInterval(() => {
      this.fetchAndProcess().catch(console.error);
    }, intervalMs);
  }

  public stopPolling(): void {
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
      this.pollIntervalTimer = null;
    }
    this.isPollingActive = false;
    console.log('[ThingSpeakService] Background polling worker stopped.');
  }

  public getStatus() {
    const channels = this.getConfiguredChannels();
    const channelStatuses = channels.map(c => ({
      name: c.name,
      channelId: c.channelId,
      lastProcessedEntryId: this.lastProcessedEntryIds.get(c.channelId) || 0
    }));

    return {
      active: this.isPollingActive,
      channels: channelStatuses
    };
  }
}

export const thingspeakService = new ThingSpeakService();
