
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { CallButton } from './components/CallButton';
import { StatusIndicator } from './components/StatusIndicator';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { CallStatus, TranscriptionEntry } from './types';
import { decode, decodeAudioData, encode } from './utils/audioUtils';

// Helper to create PCM audio blob from Float32Array
const createPcmBlob = (data: Float32Array): Blob => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
};

const App: React.FC = () => {
  const [status, setStatus] = useState<CallStatus>(CallStatus.IDLE);
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);
  
  const currentInputTranscriptionRef = useRef<string>('');
  const currentOutputTranscriptionRef = useRef<string>('');
  const [currentLiveTranscription, setCurrentLiveTranscription] = useState({ user: '', bot: '' });

  const sessionRef = useRef<LiveSession | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextAudioStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const handleStartCall = async () => {
    if (status !== CallStatus.IDLE) return;
    setStatus(CallStatus.CONNECTING);
    setTranscriptionHistory([]);
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    setCurrentLiveTranscription({ user: '', bot: '' });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // FIX: Cast window to `any` to fix TypeScript error for `webkitAudioContext` on line 46
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // FIX: Cast window to `any` to fix TypeScript error for `webkitAudioContext` on line 47
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextAudioStartTimeRef.current = 0;
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are a helpful tour guide bot that speaks Moroccan Darija. Your role is to provide information about famous Moroccan monuments. Respond only in Moroccan Darija.',
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setStatus(CallStatus.ACTIVE);
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              // FIX: Use helper function to create PCM blob for robustness and performance.
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: handleLiveMessage,
          onerror: (e: ErrorEvent) => {
            console.error('Gemini Live API Error:', e);
            setStatus(CallStatus.ERROR);
            cleanup();
          },
          onclose: () => {
            cleanup();
          },
        },
      });
      sessionRef.current = await sessionPromise;

    } catch (error) {
      console.error('Failed to start call:', error);
      setStatus(CallStatus.ERROR);
      cleanup();
    }
  };
  
  const handleLiveMessage = async (message: LiveServerMessage) => {
    if (message.serverContent?.outputTranscription) {
      currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
      setCurrentLiveTranscription(prev => ({ ...prev, bot: currentOutputTranscriptionRef.current }));
    }
    if (message.serverContent?.inputTranscription) {
      currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
      setCurrentLiveTranscription(prev => ({ ...prev, user: currentInputTranscriptionRef.current }));
    }
    if (message.serverContent?.turnComplete) {
      if(currentInputTranscriptionRef.current.trim()){
          setTranscriptionHistory(prev => [...prev, {id: Date.now(), speaker: 'user', text: currentInputTranscriptionRef.current.trim()}]);
      }
      if(currentOutputTranscriptionRef.current.trim()){
          setTranscriptionHistory(prev => [...prev, {id: Date.now()+1, speaker: 'bot', text: currentOutputTranscriptionRef.current.trim()}]);
      }
      currentInputTranscriptionRef.current = '';
      currentOutputTranscriptionRef.current = '';
      setCurrentLiveTranscription({ user: '', bot: '' });
    }
    
    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
    if (base64Audio && outputAudioContextRef.current) {
        const audioContext = outputAudioContextRef.current;
        nextAudioStartTimeRef.current = Math.max(nextAudioStartTimeRef.current, audioContext.currentTime);

        const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        source.addEventListener('ended', () => {
            audioSourcesRef.current.delete(source);
        });
        
        source.start(nextAudioStartTimeRef.current);
        nextAudioStartTimeRef.current += audioBuffer.duration;
        audioSourcesRef.current.add(source);
    }
    
     if (message.serverContent?.interrupted) {
        for (const source of audioSourcesRef.current.values()) {
            source.stop();
            audioSourcesRef.current.delete(source);
        }
        nextAudioStartTimeRef.current = 0;
      }
  };

  const cleanup = useCallback(() => {
    if(sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    if(scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    setStatus(CallStatus.IDLE);
  }, []);
  
  const handleEndCall = () => {
      cleanup();
  };
  
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const onButtonClick = status === CallStatus.ACTIVE ? handleEndCall : handleStartCall;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
      <div className="w-full max-w-2xl h-[80vh] flex flex-col bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10">
        <header className="p-4 border-b border-white/10 text-center">
            <h1 className="text-xl font-bold text-gray-100">Moroccan Monuments Bot</h1>
            <p className="text-sm text-gray-400">Ask me about any monument in Morocco in Darija!</p>
        </header>
        <main className="flex-1 flex flex-col p-4 overflow-hidden">
             <TranscriptionDisplay history={transcriptionHistory} current={currentLiveTranscription} />
        </main>
        <footer className="p-4 border-t border-white/10 flex flex-col items-center justify-center gap-4">
             <StatusIndicator status={status} />
             <CallButton status={status} onClick={onButtonClick} />
        </footer>
      </div>
    </div>
  );
};

export default App;
