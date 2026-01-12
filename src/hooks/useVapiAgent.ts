import { useState, useCallback, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { supabase } from '@/integrations/supabase/client';

export type AgentStatus = 'idle' | 'connecting' | 'listening' | 'speaking';

interface UseVapiAgentOptions {
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  onError?: (error: string) => void;
  conversationId?: string;
}

// Vapi public key and assistant ID
const VAPI_PUBLIC_KEY = '2ae7fd34-1277-4b62-bebe-b995ec39222e';
const VAPI_ASSISTANT_ID = '9526dfda-7749-42f3-af9c-0dfec7fdd6cd';

export function useVapiAgent({
  onTranscript,
  onError,
  conversationId,
}: UseVapiAgentOptions = {}) {
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [isActive, setIsActive] = useState(false);
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const vapiRef = useRef<Vapi | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const conversationIdRef = useRef(conversationId);
  const statusRef = useRef<AgentStatus>('idle');
  
  // Audio analyzer refs for real mic detection
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Keep refs updated
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    conversationIdRef.current = conversationId;
    statusRef.current = status;
  }, [onTranscript, onError, conversationId, status]);

  // Save transcript to database
  const saveTranscript = useCallback(async (text: string, role: 'user' | 'assistant') => {
    if (!conversationIdRef.current || !text.trim()) return;
    
    try {
      await supabase.from('conversation_transcripts').insert({
        role,
        content: text.trim(),
        conversation_id: conversationIdRef.current,
        raw_payload: { source: 'vapi', timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error('Failed to save transcript:', error);
    }
  }, []);

  // Reset volume levels
  const resetVolumes = useCallback(() => {
    setInputVolume(0);
    setOutputVolume(0);
  }, []);

  // Start real-time microphone volume detection using Web Audio API
  const startMicAnalyzer = useCallback(async () => {
    try {
      console.log('🎤 Starting mic analyzer...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true 
        } 
      });
      micStreamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateVolume = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume from frequency data
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // Normalize to 0-1 range (values typically 0-255)
        const normalizedVolume = Math.min(1, average / 128);
        
        // Only update input volume when in listening state
        if (statusRef.current === 'listening') {
          setInputVolume(normalizedVolume);
        }
        
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();
      console.log('✅ Mic analyzer started');
    } catch (error) {
      console.error('Failed to start mic analyzer:', error);
    }
  }, []);

  // Stop microphone analyzer
  const stopMicAnalyzer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    console.log('🔇 Mic analyzer stopped');
  }, []);

  // Initialize Vapi instance
  useEffect(() => {
    if (!vapiRef.current) {
      console.log('🎙️ Initializing Vapi SDK...');
      vapiRef.current = new Vapi(VAPI_PUBLIC_KEY);

      const vapi = vapiRef.current;

      vapi.on('call-start', () => {
        console.log('✅ Vapi call started');
        setStatus('listening');
        setIsActive(true);
        
        // Start our local mic analyzer for real-time volume
        startMicAnalyzer();
        
        // Ensure audio output is enabled
        try {
          vapi.setMuted(false);
          console.log('🔊 Audio unmuted');
        } catch (e) {
          console.warn('Could not set muted state:', e);
        }
      });

      vapi.on('call-end', () => {
        console.log('❌ Vapi call ended');
        setStatus('idle');
        setIsActive(false);
        resetVolumes();
        stopMicAnalyzer();
      });

      vapi.on('speech-start', () => {
        console.log('🗣️ Assistant speaking');
        setStatus('speaking');
        // When assistant speaks, clear input volume
        setInputVolume(0);
      });

      vapi.on('speech-end', () => {
        console.log('🎤 Assistant stopped speaking');
        setStatus('listening');
        setOutputVolume(0);
      });

      // Listen for Vapi volume levels (for output/assistant voice)
      vapi.on('volume-level', (volume: number) => {
        if (statusRef.current === 'speaking') {
          setOutputVolume(volume);
        }
      });

      vapi.on('message', (message) => {
        console.log('📨 Vapi message:', message);

        if (message.type === 'transcript' && message.transcriptType === 'final') {
          const transcript = message.transcript;
          const role = message.role === 'user' ? 'user' : 'assistant';
          
          if (transcript) {
            console.log(`🎤 ${role} said: ${transcript}`);
            onTranscriptRef.current?.(transcript, role);
            saveTranscript(transcript, role);
          }
        }
      });

      vapi.on('error', (error) => {
        console.error('❌ Vapi error:', error);
        setStatus('idle');
        setIsActive(false);
        resetVolumes();
        stopMicAnalyzer();
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        onErrorRef.current?.(errorMessage);
      });
    }

    return () => {
      resetVolumes();
      stopMicAnalyzer();
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, [resetVolumes, saveTranscript, startMicAnalyzer, stopMicAnalyzer]);

  const start = useCallback(async () => {
    if (!vapiRef.current) {
      vapiRef.current = new Vapi(VAPI_PUBLIC_KEY);
    }

    if (isActive) {
      console.log('Already in a call, skipping');
      return;
    }

    setStatus('connecting');

    try {
      console.log('📞 Starting Vapi call with assistant:', VAPI_ASSISTANT_ID);
      await vapiRef.current.start(VAPI_ASSISTANT_ID);
    } catch (error) {
      console.error('❌ Failed to start Vapi call:', error);
      setStatus('idle');
      onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to connect');
    }
  }, [isActive]);

  const stop = useCallback(() => {
    resetVolumes();
    stopMicAnalyzer();
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setStatus('idle');
    setIsActive(false);
  }, [resetVolumes, stopMicAnalyzer]);

  const toggle = useCallback(async () => {
    if (isActive) {
      stop();
    } else {
      await start();
    }
  }, [isActive, start, stop]);

  return {
    status,
    isActive,
    isSpeaking: status === 'speaking',
    inputVolume,
    outputVolume,
    start,
    stop,
    toggle,
  };
}
