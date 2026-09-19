import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bluetooth, CheckCircle2, RadioTower, Volume2, VolumeX, WifiOff } from 'lucide-react';
import { apiClient } from '../api/client';

export const ROOM_GATEWAY_MAP: Record<string, {
  roomNumber: string;
  roomName: string;
  floor: string;
}> = {
  READER_2_MAC_OR_ID: {
    roomNumber: 'Room 2',
    roomName: 'ROOM2 / Maker Space',
    floor: 'Ground Floor'
  }
};

type ProximityState = 'FRONT_OF_ROOM' | 'INSIDE_ROOM' | 'OUT_OF_RANGE';
type ReaderSample = {
  readerId: string;
  readerName?: string;
  rssi: number;
  timestamp?: string;
  roomName?: string | null;
  floorName?: string | null;
};

type ReaderRuntime = {
  readings: number[];
  ema?: number;
  currentState?: ProximityState;
  candidateState?: ProximityState;
  candidateCount: number;
  lastAnnouncementAt: number;
};

const ALPHA = 0.3;
const SAMPLE_INTERVAL_MS = 1000;
const ANNOUNCEMENT_WINDOW_MS = 12000;

const stateLabel: Record<ProximityState, string> = {
  FRONT_OF_ROOM: 'Front of room',
  INSIDE_ROOM: 'Inside room',
  OUT_OF_RANGE: 'Out of range'
};

const classifyRssi = (rssi: number): ProximityState | undefined => {
  if (rssi > -55) return 'INSIDE_ROOM';
  if (rssi >= -72 && rssi <= -60) return 'FRONT_OF_ROOM';
  if (rssi < -75) return 'OUT_OF_RANGE';
  return undefined;
};

const displayRoom = (reader: ReaderSample) => {
  const configured = ROOM_GATEWAY_MAP[reader.readerId];
  if (configured) return configured;

  const roomName = reader.roomName || reader.readerName || reader.readerId;
  const roomNumberMatch = roomName.match(/ROOM\s*\d+/i);
  return {
    roomNumber: roomNumberMatch ? roomNumberMatch[0].replace(/\s+/g, ' ') : 'Room',
    roomName,
    floor: reader.floorName || 'Unknown floor'
  };
};

const VoiceNavigationModule = () => {
  const [isGuidanceActive, setIsGuidanceActive] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isBluetoothSupported, setIsBluetoothSupported] = useState(false);
  const [connectedReader, setConnectedReader] = useState<string | null>(null);
  const [readers, setReaders] = useState<ReaderSample[]>([]);
  const [statusMessage, setStatusMessage] = useState('Start guidance to enable voice announcements and live proximity updates.');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const runtimeRef = useRef(new Map<string, ReaderRuntime>());
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setIsBluetoothSupported(typeof navigator !== 'undefined' && 'bluetooth' in navigator);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = (message: string) => {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const announceTransition = (reader: ReaderSample, state: ProximityState, previousState?: ProximityState) => {
    const room = displayRoom(reader);
    const roomLabel = `${room.roomNumber}, ${room.roomName}`;
    if (state === 'FRONT_OF_ROOM') {
      speak(`You are standing in front of ${roomLabel}.`);
      setStatusMessage(`You are standing in front of ${roomLabel}.`);
    } else if (state === 'INSIDE_ROOM') {
      speak(`You have entered ${roomLabel}.`);
      setStatusMessage(`You have entered ${roomLabel}.`);
    } else if (previousState && previousState !== 'OUT_OF_RANGE') {
      speak(`You have left ${roomLabel}.`);
      setStatusMessage(`You have left ${roomLabel}.`);
    }
  };

  const processSamples = (samples: ReaderSample[]) => {
    const now = Date.now();
    const nextReaders = samples.map((reader) => {
      const runtime = runtimeRef.current.get(reader.readerId) || {
        readings: [], candidateCount: 0, lastAnnouncementAt: 0
      };
      runtime.readings = [...runtime.readings, reader.rssi].slice(-5);
      runtime.ema = runtime.ema === undefined
        ? reader.rssi
        : (reader.rssi * ALPHA) + (runtime.ema * (1 - ALPHA));
      const candidate = classifyRssi(runtime.ema);

      if (candidate && candidate === runtime.candidateState) {
        runtime.candidateCount += 1;
      } else if (candidate) {
        runtime.candidateState = candidate;
        runtime.candidateCount = 1;
      }

      if (candidate && runtime.candidateCount >= 2 && candidate !== runtime.currentState) {
        const previousState = runtime.currentState;
        runtime.currentState = candidate;
        if (candidate !== 'OUT_OF_RANGE' || previousState) {
          const stateChanged = candidate !== previousState;
          if (stateChanged && (previousState !== undefined || now - runtime.lastAnnouncementAt >= ANNOUNCEMENT_WINDOW_MS)) {
            announceTransition(reader, candidate, previousState);
            runtime.lastAnnouncementAt = now;
          }
        }
      }

      runtimeRef.current.set(reader.readerId, runtime);
      return reader;
    });
    setReaders(nextReaders);
  };

  const pollLiveReaders = async () => {
    try {
      const response = await apiClient.get('/assets/live');
      const liveReaders = (response.data?.readers || response.data || []) as ReaderSample[];
      processSamples(liveReaders.filter((reader) => Number.isFinite(Number(reader.rssi))));
      setErrorMessage(null);
    } catch (error: any) {
      setErrorMessage(error.message || 'Live reader data is unavailable.');
    }
  };

  const connectBluetoothReader = async () => {
    if (!isBluetoothSupported) return;
    try {
      const device = await (navigator as any).bluetooth.requestDevice({ acceptAllDevices: true });
      setConnectedReader(device.name || device.id);
      setStatusMessage(`${device.name || 'BLE reader'} selected. RSSI updates are supplied by the platform reader service.`);
    } catch (error: any) {
      if (error?.name !== 'NotFoundError') {
        setErrorMessage('Bluetooth reader access was not granted. Continuing with server polling.');
      }
    }
  };

  const startGuidance = async () => {
    setIsGuidanceActive(true);
    setErrorMessage(null);
    setStatusMessage('Voice guidance started. Looking for nearby room readers...');
    speak('Voice guidance started. Looking for nearby room readers.');
    if (isBluetoothSupported) await connectBluetoothReader();
    await pollLiveReaders();
    if (!intervalRef.current) intervalRef.current = window.setInterval(pollLiveReaders, SAMPLE_INTERVAL_MS);
  };

  const stopGuidance = () => {
    setIsGuidanceActive(false);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    window.speechSynthesis?.cancel();
    setStatusMessage('Voice guidance paused.');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h1>Voice Proximity Guidance</h1>
          <p className="text-muted">Hands-free room awareness from BLE reader signal strength</p>
        </div>
        <button className="btn btn-outline" onClick={() => { setIsVoiceEnabled((enabled) => !enabled); window.speechSynthesis?.cancel(); }} aria-label={isVoiceEnabled ? 'Mute voice guidance' : 'Enable voice guidance'}>
          {isVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          {isVoiceEnabled ? 'Voice On' : 'Voice Off'}
        </button>
      </div>

      {errorMessage && <div className="card" style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-bg)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}><AlertCircle size={18} />{errorMessage}</div>}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <RadioTower color="var(--primary)" />
          <div><h2 style={{ margin: 0 }}>Room reader monitor</h2><span className="text-sm text-muted">EMA smoothing: alpha 0.3, last 5 readings</span></div>
        </div>
        <button className="btn btn-primary" onClick={isGuidanceActive ? stopGuidance : startGuidance}>
          {isGuidanceActive ? <VolumeX size={18} /> : <Volume2 size={18} />}
          {isGuidanceActive ? 'Stop Voice Guidance' : 'Start Voice Guidance'}
        </button>
        <div aria-live="polite" style={{ marginTop: '1rem', padding: '0.875rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--gray-50)', color: 'var(--gray-700)' }}>{statusMessage}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        {readers.length === 0 ? <div className="card text-muted">No nearby room readers reported yet.</div> : readers.map((reader) => {
          const runtime = runtimeRef.current.get(reader.readerId);
          const room = displayRoom(reader);
          const state = runtime?.currentState;
          return <div className="card" key={reader.readerId}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}><strong>{room.roomNumber}</strong><span className="text-xs text-muted">{reader.readerName || reader.readerId}</span></div>
            <div style={{ margin: '0.75rem 0', fontSize: '1.1rem', fontWeight: 600 }}>{room.roomName}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gray-600)' }}><span>Smoothed RSSI</span><strong>{runtime?.ema === undefined ? '--' : `${runtime.ema.toFixed(1)} dBm`}</strong></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', color: state === 'INSIDE_ROOM' ? 'var(--success)' : 'var(--primary)' }}><CheckCircle2 size={16} />{state ? stateLabel[state] : 'Sampling...'}</div>
          </div>;
        })}
      </div>

      <div className="card" style={{ marginTop: '1.5rem', color: 'var(--gray-600)', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>{isBluetoothSupported ? <Bluetooth size={16} /> : <WifiOff size={16} />}<strong>{isBluetoothSupported ? 'Web Bluetooth available' : 'Web Bluetooth unavailable'}</strong></div>
        <div>{connectedReader ? `Connected reader: ${connectedReader}` : 'Reader RSSI is obtained from the existing backend telemetry pipeline. Server polling remains available when direct Bluetooth is unavailable or declined.'}</div>
      </div>
    </div>
  );
};

export default VoiceNavigationModule;