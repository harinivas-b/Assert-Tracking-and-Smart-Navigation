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

class ThingSpeakService {
  private lastProcessedEntryId: number = 0;
  private pollIntervalTimer: NodeJS.Timeout | null = null;
  private isPollingActive: boolean = false;
  private isProcessing: boolean = false;

  public async getLatestStoredEntryId(): Promise<number> {
    try {
      const latestObs = await prisma.bLEObservation.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { metadata: true }
      });

      if (latestObs?.metadata && typeof latestObs.metadata === 'object') {
        const meta = latestObs.metadata as any;
        if (meta.entryId && typeof meta.entryId === 'number') {
          return meta.entryId;
        }
      }
    } catch (err) {
      console.warn('[ThingSpeakService] Could not determine latest entryId from DB:', err);
    }
    return 0;
  }

  public async initialize(): Promise<void> {
    this.lastProcessedEntryId = await this.getLatestStoredEntryId();
    console.log(`[ThingSpeakService] Initialized. Last processed entry ID: ${this.lastProcessedEntryId}`);
  }

  /**
   * Parse a single feed row by inspecting channel field labels, or fallback to value heuristics.
   */
  public parseFeedRow(feed: ThingSpeakFeed, channelMeta?: ThingSpeakChannelMeta): ParsedThingSpeakRecord | null {
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
        } else if (metaLabel === 'MAC NAME' || metaLabel.includes('TAG NAME') || metaLabel.includes('DEVICE NAME')) {
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

      // ROOM format: starts with ROOM (e.g. ROOM2, ROOM1, ROOM 101)
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

    const resolvedRoom = room || 'ROOM_DEFAULT';
    const gatewayId = `GW_${resolvedRoom.toUpperCase()}`;

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

    // Check if gateway already exists
    const existingGateway = await prisma.bLEGateway.findUnique({
      where: { gatewayId: cleanGatewayId }
    });

    if (existingGateway) {
      return existingGateway.gatewayId;
    }

    // Check if room with this name already exists
    let room = await prisma.room.findFirst({
      where: { name: cleanRoomName }
    });

    if (!room) {
      // Find default building and floor
      let floor = await prisma.floor.findFirst();
      if (!floor) {
        let building = await prisma.building.findFirst();
        if (!building) {
          let org = await prisma.organization.findFirst();
          if (!org) {
            org = await prisma.organization.create({ data: { name: 'Campus' } });
          }
          building = await prisma.building.create({
            data: { name: 'Main Campus Building', organizationId: org.id }
          });
        }
        floor = await prisma.floor.create({
          data: { name: 'Ground Floor', level: 0, buildingId: building.id }
        });
      }

      room = await prisma.room.create({
        data: { name: cleanRoomName, floorId: floor.id }
      });
      console.log(`[ThingSpeakService] Created room: ${cleanRoomName}`);
    }

    // Create gateway for this room
    const createdGateway = await prisma.bLEGateway.create({
      data: {
        gatewayId: cleanGatewayId,
        name: `Reader (${cleanRoomName})`,
        roomId: room.id,
        status: 'ONLINE',
        lastSeen: new Date()
      }
    });

    console.log(`[ThingSpeakService] Created BLE Gateway: ${cleanGatewayId} assigned to ${cleanRoomName}`);
    return createdGateway.gatewayId;
  }

  /**
   * Fetch recent feeds from ThingSpeak and process new entries
   */
  public async fetchAndProcess(forceFromEntryId?: number): Promise<{ fetched: number; processed: number; lastEntryId: number; error?: string }> {
    const channelId = process.env.THINGSPEAK_CHANNEL_ID?.trim();
    const apiKey = process.env.THINGSPEAK_READ_API_KEY?.trim();

    if (forceFromEntryId !== undefined) {
      this.lastProcessedEntryId = forceFromEntryId;
    }

    if (!channelId) {
      return { fetched: 0, processed: 0, lastEntryId: this.lastProcessedEntryId, error: 'THINGSPEAK_CHANNEL_ID is not configured' };
    }

    if (this.isProcessing) {
      return { fetched: 0, processed: 0, lastEntryId: this.lastProcessedEntryId };
    }

    this.isProcessing = true;

    try {
      const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?results=25${apiKey ? `&api_key=${apiKey}` : ''}`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ThingSpeakService] HTTP ${response.status} from ThingSpeak: ${errorText}`);
        return { fetched: 0, processed: 0, lastEntryId: this.lastProcessedEntryId, error: `ThingSpeak HTTP ${response.status}` };
      }

      const data = await response.json() as { channel?: ThingSpeakChannelMeta; feeds?: ThingSpeakFeed[] };
      const feeds = data.feeds || [];
      const channelMeta = data.channel;

      let processedCount = 0;

      // Filter feeds strictly newer than lastProcessedEntryId
      const newFeeds = feeds.filter(f => f.entry_id > this.lastProcessedEntryId);

      for (const feed of newFeeds) {
        const record = this.parseFeedRow(feed, channelMeta);
        if (!record) {
          if (feed.entry_id > this.lastProcessedEntryId) {
            this.lastProcessedEntryId = feed.entry_id;
          }
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
            source: 'thingspeak',
            reportedAt: record.time
          }
        );

        if (record.entryId > this.lastProcessedEntryId) {
          this.lastProcessedEntryId = record.entryId;
        }
        processedCount++;
      }

      return {
        fetched: feeds.length,
        processed: processedCount,
        lastEntryId: this.lastProcessedEntryId
      };
    } catch (err: any) {
      console.error('[ThingSpeakService] Error polling ThingSpeak:', err.message || err);
      return { fetched: 0, processed: 0, lastEntryId: this.lastProcessedEntryId, error: err.message };
    } finally {
      this.isProcessing = false;
    }
  }

  public startPolling(intervalMs: number = 15000): void {
    if (this.isPollingActive) return;

    this.isPollingActive = true;
    console.log(`[ThingSpeakService] Starting background polling worker (every ${intervalMs / 1000}s)...`);

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
    return {
      active: this.isPollingActive,
      lastProcessedEntryId: this.lastProcessedEntryId,
      channelIdConfigured: Boolean(process.env.THINGSPEAK_CHANNEL_ID?.trim())
    };
  }
}

export const thingspeakService = new ThingSpeakService();
