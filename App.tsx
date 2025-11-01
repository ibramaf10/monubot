import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { CallButton } from './components/CallButton';
import { StatusIndicator } from './components/StatusIndicator';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { CallStatus, TranscriptionEntry } from './types';
import { decode, decodeAudioData, encode } from './utils/audioUtils';

// Fix: Define the LiveSession interface locally as it's not exported from the SDK.
// This interface is based on the usage of the session object within this component.
interface LiveSession {
  sendRealtimeInput(input: { media: Blob }): void;
  close(): void;
}

const FRAME_RATE = 4; // Send 4 frames per second
const JPEG_QUALITY = 0.8;

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

const blobToBase64 = (blob: globalThis.Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
};

const App: React.FC = () => {
  const [status, setStatus] = useState<CallStatus>(CallStatus.IDLE);
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const currentInputTranscriptionRef = useRef<string>('');
  const currentOutputTranscriptionRef = useRef<string>('');
  const [currentLiveTranscription, setCurrentLiveTranscription] = useState({ user: '', bot: '' });

  const sessionRef = useRef<LiveSession | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextAudioStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);


  const handleStartCall = async () => {
    if (status !== CallStatus.IDLE) return;
    setStatus(CallStatus.CONNECTING);
    setTranscriptionHistory([]);
    setPermissionError(null);
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    setCurrentLiveTranscription({ user: '', bot: '' });

    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = 'Your browser does not support camera/microphone access. Please use a modern browser like Chrome, Firefox, or Safari.';
      setPermissionError(errorMsg);
      setStatus(CallStatus.ERROR);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      mediaStreamRef.current = stream;

      if(videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextAudioStartTimeRef.current = 0;
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are a helpful tour guide bot that speaks Moroccan Darija. Your role is to provide information about famous Moroccan monuments. You can also see the user through their camera. If they show you a monument, identify it and talk about it. Respond only in Moroccan Darija.',
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
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
            
            if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = window.setInterval(() => {
                if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) return;
                
                const canvas = canvasRef.current;
                const video = videoRef.current;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

                canvas.toBlob(
                  async (blob) => {
                      if (blob) {
                          const base64Data = await blobToBase64(blob);
                          sessionPromise.then((session) => {
                            session.sendRealtimeInput({
                              media: { data: base64Data, mimeType: 'image/jpeg' }
                            });
                          });
                      }
                  },
                  'image/jpeg',
                  JPEG_QUALITY
              );

            }, 1000/FRAME_RATE);

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

    } catch (error: any) {
      console.error('Failed to start call:', error);
      
      // Handle specific permission errors
      let errorMessage = 'Failed to access camera or microphone.';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera and microphone access was denied. Please allow access in your browser settings and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera or microphone found. Please connect a camera and microphone.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera or microphone is being used by another application. Please close other applications and try again.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'Camera settings could not be satisfied. Please try a different camera.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setPermissionError(errorMessage);
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
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setPermissionError(null);
    if(scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
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
    <div className="min-h-screen bg-[#EADDCB] text-[#5D4E37] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Curved background shapes */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#A08B73] rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#A08B73] rounded-full blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2"></div>
      
      <div className="w-full max-w-3xl h-[90vh] flex flex-col bg-[#DDC8B4] backdrop-blur-sm rounded-3xl shadow-xl border border-[#A08B73]/20 relative z-10">
        <header className="p-6 border-b border-[#A08B73]/20 text-center">
            <h1 className="text-2xl font-bold text-[#5D4E37] mb-1">Moroccan Monuments Bot</h1>
            <p className="text-sm text-[#8B7355]">Ask me about any monument in Morocco in Darija!</p>
        </header>
        <main className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
             <div className="relative aspect-video bg-[#C9B8A3] rounded-2xl overflow-hidden border border-[#A08B73]/30 shadow-inner">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover rounded-2xl"></video>
                {status === CallStatus.IDLE && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#A08B73]/40 rounded-2xl">
                        <p className="text-[#5D4E37] font-medium">Press Start Call to enable video</p>
                    </div>
                )}
             </div>
             <TranscriptionDisplay history={transcriptionHistory} current={currentLiveTranscription} />
        </main>
        <footer className="p-6 border-t border-[#A08B73]/20 flex flex-col items-center justify-center gap-4">
             <StatusIndicator status={status} />
             {permissionError && (
               <div className="w-full max-w-md p-4 bg-[#F5EDE0] border-2 border-[#B8866B] rounded-xl text-center">
                 <p className="text-sm text-[#5D4E37] font-medium mb-2">⚠️ Permission Required</p>
                 <p className="text-xs text-[#8B7355] mb-3">{permissionError}</p>
                 <div className="text-xs text-[#8B7355] space-y-1">
                   <p className="font-semibold">To fix this in Chrome:</p>
                   <ol className="list-decimal list-inside space-y-0.5 text-left max-w-xs mx-auto">
                     <li>Click the lock/camera icon in the address bar</li>
                     <li>Change camera/microphone to "Allow"</li>
                     <li>Refresh the page and try again</li>
                   </ol>
                 </div>
               </div>
             )}
             <CallButton status={status} onClick={onButtonClick} />
        </footer>
      </div>
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );
};

export default App;
