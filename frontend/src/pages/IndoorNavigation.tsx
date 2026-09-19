import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Navigation } from 'lucide-react';
import { apiClient } from '../api/client';
import type { NavigationRouteResult } from '../types';

const IndoorNavigation: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [origin, setOrigin] = useState('NODE_ENTRANCE');
  const [destination, setDestination] = useState('NODE_MAKERSPACE');
  const [route, setRoute] = useState<NavigationRouteResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Tap the giant Microphone or select destination to start voice navigation.');
  const [nodes, setNodes] = useState<any[]>([]);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    apiClient.get('/navigation/nodes').then(res => {
      if (res.data && res.data.length > 0) {
        setNodes(res.data);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('Listening... Please state your destination (e.g. "Maker Space" or "Idea Lab").');
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleVoiceCommand(text);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setStatusMessage('Voice recognition error. You can select your destination manually below.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const speakText = (text: string) => {
    if (!isVoiceOutputEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleVoiceCommand = (commandText: string) => {
    const textLower = commandText.toLowerCase();
    if (textLower.includes('maker') || textLower.includes('maker space')) {
      setDestination('NODE_MAKERSPACE');
      calculateAndStartRoute('NODE_ENTRANCE', 'NODE_MAKERSPACE');
    } else if (textLower.includes('idea') || textLower.includes('idea lab')) {
      setDestination('NODE_IDEALAB');
      calculateAndStartRoute('NODE_ENTRANCE', 'NODE_IDEALAB');
    } else if (textLower.includes('room 2') || textLower.includes('room2')) {
      setDestination('NODE_ROOM2');
      calculateAndStartRoute('NODE_ENTRANCE', 'NODE_ROOM2');
    } else if (textLower.includes('entrance') || textLower.includes('main entrance')) {
      setDestination('NODE_ENTRANCE');
      calculateAndStartRoute('NODE_IDEALAB', 'NODE_ENTRANCE');
    } else {
      setStatusMessage(`Unrecognized destination "${commandText}". Please say "Maker Space", "Idea Lab", or "Room 2".`);
      speakText(`Unrecognized destination ${commandText}. Please try saying Maker Space, Idea Lab, or Room 2.`);
    }
  };

  const calculateAndStartRoute = async (startNode: string, destNode: string) => {
    try {
      setStatusMessage('Calculating indoor navigation graph path...');
      const res = await apiClient.get('/navigation/route', {
        params: { origin: startNode, destination: destNode }
      });

      const navRoute: NavigationRouteResult = res.data;
      setRoute(navRoute);
      setCurrentStepIndex(0);

      const firstStep = navRoute.steps[0];
      const startAudio = firstStep.audioCue || `Starting navigation to ${navRoute.destinationNode.name}. ${firstStep.instruction}`;
      setStatusMessage(firstStep.instruction);
      speakText(startAudio);

    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to calculate route';
      setStatusMessage(msg);
      speakText(msg);
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const nextStep = () => {
    if (!route) return;
    if (currentStepIndex < route.steps.length - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);
      const step = route.steps[newIndex];
      setStatusMessage(step.instruction);
      speakText(step.audioCue || step.instruction);
    }
  };

  const prevStep = () => {
    if (!route) return;
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      const step = route.steps[newIndex];
      setStatusMessage(step.instruction);
      speakText(step.audioCue || step.instruction);
    }
  };

  return (
    <div
      role="main"
      style={{
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        minHeight: '100vh',
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '3px solid #fef08a', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, color: '#fef08a' }}>
            🔊 Voice-Assisted Indoor Navigation
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '1.1rem', fontWeight: 500 }}>
            Accessible BLE indoor guidance system for blind and low-vision users.
          </p>
        </div>

        <button
          onClick={() => setIsVoiceOutputEnabled(!isVoiceOutputEnabled)}
          aria-label={isVoiceOutputEnabled ? "Mute Voice Assistance" : "Enable Voice Assistance"}
          style={{
            backgroundColor: isVoiceOutputEnabled ? '#334155' : '#e11d48',
            color: 'white',
            border: '2px solid white',
            padding: '0.75rem 1.5rem',
            borderRadius: '1rem',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {isVoiceOutputEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          {isVoiceOutputEnabled ? 'Audio Speech ON' : 'Audio Speech MUTED'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '2rem 0' }}>
        <button
          onClick={toggleMic}
          aria-label={isListening ? "Listening... Click to stop" : "Click to speak your destination"}
          style={{
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            backgroundColor: isListening ? '#dc2626' : '#2563eb',
            border: '6px solid #fef08a',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(37, 99, 235, 0.6)',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
        >
          {isListening ? <MicOff size={64} /> : <Mic size={64} />}
        </button>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '1rem', color: '#fef08a' }}>
          {isListening ? 'LISTENING... Speak your destination' : 'TAP MICROPHONE & SAY DESTINATION'}
        </div>
      </div>

      <div
        aria-live="polite"
        style={{
          backgroundColor: '#1e293b',
          border: '3px solid #38bdf8',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Current Guidance Announcement
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginTop: '0.5rem' }}>
          "{statusMessage}"
        </div>
        {transcript && (
          <div style={{ fontSize: '1rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            Heard: <span style={{ color: '#fef08a', fontWeight: 600 }}>"{transcript}"</span>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', border: '1px solid #334155' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#fef08a', fontSize: '1.2rem' }}>Manual Waypoint Selector</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>Start Location</label>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', color: 'white', border: '2px solid #475569', fontSize: '1rem', fontWeight: 600 }}
            >
              {nodes.length > 0 ? (
                nodes.map((n) => (
                  <option key={n.nodeId} value={n.nodeId}>{n.name}</option>
                ))
              ) : (
                <>
                  <option value="NODE_ENTRANCE">Main Entrance</option>
                  <option value="NODE_IDEALAB">Idea Lab</option>
                  <option value="NODE_MAKERSPACE">Maker Space</option>
                  <option value="NODE_ROOM2">Room 2</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>Destination</label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', color: 'white', border: '2px solid #475569', fontSize: '1rem', fontWeight: 600 }}
            >
              {nodes.length > 0 ? (
                nodes.map((n) => (
                  <option key={n.nodeId} value={n.nodeId}>{n.name}</option>
                ))
              ) : (
                <>
                  <option value="NODE_ROOM2">Room 2</option>
                  <option value="NODE_MAKERSPACE">Maker Space</option>
                  <option value="NODE_IDEALAB">Idea Lab</option>
                  <option value="NODE_ENTRANCE">Main Entrance</option>
                </>
              )}
            </select>
          </div>

          <div style={{ paddingTop: '1.25rem' }}>
            <button
              onClick={() => calculateAndStartRoute(origin, destination)}
              style={{
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                padding: '0.875rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Navigation size={20} /> Start Route
            </button>
          </div>
        </div>
      </div>

      {route && (
        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '2px solid #fef08a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#fef08a' }}>
                Route: {route.originNode.name} → {route.destinationNode.name}
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8' }}>
                Total Distance: <strong>{route.totalDistanceMeters}m</strong> (~{route.estimatedTimeSeconds} sec walk)
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                style={{
                  backgroundColor: '#334155',
                  color: 'white',
                  border: '1px solid #475569',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentStepIndex === 0 ? 0.5 : 1
                }}
              >
                Previous Step
              </button>

              <button
                onClick={nextStep}
                disabled={currentStepIndex === route.steps.length - 1}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  cursor: currentStepIndex === route.steps.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: currentStepIndex === route.steps.length - 1 ? 0.5 : 1
                }}
              >
                Next Step →
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {route.steps.map((step, idx) => {
              const isActive = idx === currentStepIndex;

              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: isActive ? '#0284c7' : '#0f172a',
                    color: 'white',
                    padding: '1.25rem',
                    borderRadius: '0.75rem',
                    border: isActive ? '3px solid #fef08a' : '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    transform: isActive ? 'scale(1.02)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? '#fef08a' : '#334155',
                    color: isActive ? '#0f172a' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    flexShrink: 0
                  }}>
                    {step.stepNumber}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{step.instruction}</div>
                    {step.distanceMeters > 0 && (
                      <div style={{ fontSize: '0.9rem', color: isActive ? '#fef08a' : '#94a3b8', marginTop: '0.25rem' }}>
                        Distance: {step.distanceMeters} meters
                      </div>
                    )}
                  </div>

                  {isActive && (
                    <button
                      onClick={() => speakText(step.audioCue || step.instruction)}
                      style={{
                        backgroundColor: '#fef08a',
                        color: '#0f172a',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem'
                      }}
                    >
                      <Volume2 size={18} /> Repeat Voice
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default IndoorNavigation;
