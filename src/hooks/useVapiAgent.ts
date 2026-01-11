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
  const [inputVolume, setInputVolume] = useState(0); // 0-1 range for user's voice level
  const [outputVolume, setOutputVolume] = useState(0); // 0-1 range for assistant's voice level
  const vapiRef = useRef<Vapi | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const conversationIdRef = useRef(conversationId);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs updated
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    conversationIdRef.current = conversationId;
  }, [onTranscript, onError, conversationId]);

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

  // Poll volume levels when active
  const startVolumePolling = useCallback(() => {
    if (volumeIntervalRef.current) return;
    
    volumeIntervalRef.current = setInterval(() => {
      if (vapiRef.current) {
        try {
          // Vapi SDK methods - access via any to bypass missing types
          const vapi = vapiRef.current as unknown as {
            getInputVolume?: () => number;
            getOutputVolume?: () => number;
          };
          const input = vapi.getInputVolume?.() ?? 0;
          const output = vapi.getOutputVolume?.() ?? 0;
          setInputVolume(input);
          setOutputVolume(output);
        } catch {
          // Vapi may not support these methods
        }
      }
    }, 50); // Poll at ~20fps for smooth animation
  }, []);

  const stopVolumePolling = useCallback(() => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    setInputVolume(0);
    setOutputVolume(0);
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
        startVolumePolling();
        
        // Ensure audio output is enabled and at full volume
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
        stopVolumePolling();
      });

      vapi.on('speech-start', () => {
        console.log('🗣️ Assistant speaking');
        setStatus('speaking');
      });

      vapi.on('speech-end', () => {
        console.log('🎤 Assistant stopped speaking');
        setStatus('listening');
      });

      vapi.on('message', (message) => {
        console.log('📨 Vapi message:', message);

        // Handle transcript messages - only final transcripts to avoid duplicates
        if (message.type === 'transcript' && message.transcriptType === 'final') {
          const transcript = message.transcript;
          const role = message.role === 'user' ? 'user' : 'assistant';
          
          if (transcript) {
            console.log(`🎤 ${role} said: ${transcript}`);
            onTranscriptRef.current?.(transcript, role);
            // Save to database
            saveTranscript(transcript, role);
          }
        }
      });

      vapi.on('error', (error) => {
        console.error('❌ Vapi error:', error);
        setStatus('idle');
        setIsActive(false);
        stopVolumePolling();
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        onErrorRef.current?.(errorMessage);
      });
    }

    return () => {
      stopVolumePolling();
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, [startVolumePolling, stopVolumePolling]);

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
      // Request microphone permission
      console.log('🎤 Requesting microphone permission...');
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach((t) => t.stop());
      console.log('✅ Microphone permission granted');

      console.log('📞 Starting Vapi call with assistant:', VAPI_ASSISTANT_ID);
      await vapiRef.current.start(VAPI_ASSISTANT_ID);
    } catch (error) {
      console.error('❌ Failed to start Vapi call:', error);
      setStatus('idle');
      onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to connect');
    }
  }, [isActive]);

  const stop = useCallback(() => {
    stopVolumePolling();
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setStatus('idle');
    setIsActive(false);
  }, [stopVolumePolling]);

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
