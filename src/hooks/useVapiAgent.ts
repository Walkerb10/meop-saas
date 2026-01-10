import { useState, useCallback, useEffect, useRef } from 'react';

export type AgentStatus = 'idle' | 'connecting' | 'listening' | 'speaking';

interface UseVapiAgentOptions {
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  onError?: (error: string) => void;
}

// Vapi public key and assistant ID
const VAPI_PUBLIC_KEY = '2ae7fd34-1277-4b62-bebe-b995ec39222e';
const VAPI_ASSISTANT_ID = '9526dfda-7749-42f3-af9c-0dfec7fdd6cd';

// Declare Vapi types for TypeScript
declare global {
  interface Window {
    vapiSDK: {
      run: (config: { apiKey: string; assistant: string; config?: Record<string, unknown> }) => VapiInstance;
    };
    vapiSDKLoaded?: boolean;
  }
}

interface VapiInstance {
  start: () => Promise<void>;
  stop: () => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
  isMuted: () => boolean;
  setMuted: (muted: boolean) => void;
}

export function useVapiAgent({
  onTranscript,
  onError,
}: UseVapiAgentOptions = {}) {
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [isActive, setIsActive] = useState(false);
  const vapiRef = useRef<VapiInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  // Keep refs updated
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
  }, [onTranscript, onError]);

  // Initialize Vapi instance
  useEffect(() => {
    const initVapi = () => {
      if (typeof window !== 'undefined' && window.vapiSDK && !vapiRef.current) {
        console.log('🎙️ Initializing Vapi with SDK...');
        vapiRef.current = window.vapiSDK.run({
          apiKey: VAPI_PUBLIC_KEY,
          assistant: VAPI_ASSISTANT_ID,
        });

      // Set up event listeners
      const vapi = vapiRef.current;

      vapi.on('call-start', () => {
        console.log('✅ Vapi call started');
        setStatus('listening');
        setIsActive(true);
      });

      vapi.on('call-end', () => {
        console.log('❌ Vapi call ended');
        setStatus('idle');
        setIsActive(false);
      });

      vapi.on('speech-start', () => {
        console.log('🗣️ Assistant speaking');
        setStatus('speaking');
      });

      vapi.on('speech-end', () => {
        console.log('🎤 Assistant stopped speaking');
        setStatus('listening');
      });

      vapi.on('message', (message: unknown) => {
        console.log('📨 Vapi message:', message);
        const msg = message as Record<string, unknown>;

        // Handle transcript messages
        if (msg.type === 'transcript') {
          const transcript = msg.transcript as string;
          const role = msg.transcriptType === 'final' 
            ? (msg.role === 'user' ? 'user' : 'assistant')
            : null;
          
          if (role && transcript && onTranscriptRef.current) {
            console.log(`🎤 ${role} said: ${transcript}`);
            onTranscriptRef.current(transcript, role);
          }
        }

        // Handle conversation updates
        if (msg.type === 'conversation-update') {
          const conversation = msg.conversation as Array<{ role: string; content: string }>;
          if (conversation && conversation.length > 0) {
            const lastMessage = conversation[conversation.length - 1];
            if (lastMessage && onTranscriptRef.current) {
              const role = lastMessage.role === 'user' ? 'user' : 'assistant';
              console.log(`💬 ${role}: ${lastMessage.content}`);
              onTranscriptRef.current(lastMessage.content, role);
            }
          }
        }
      });

      vapi.on('error', (error: unknown) => {
        console.error('❌ Vapi error:', error);
        setStatus('idle');
        setIsActive(false);
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        onErrorRef.current?.(errorMessage);
      });
      }
    };

    // Check if SDK is already loaded
    if (window.vapiSDKLoaded && window.vapiSDK) {
      initVapi();
    } else {
      // Wait for SDK to load
      const checkInterval = setInterval(() => {
        if (window.vapiSDKLoaded && window.vapiSDK) {
          clearInterval(checkInterval);
          initVapi();
        }
      }, 100);

      // Cleanup interval after 10 seconds
      setTimeout(() => clearInterval(checkInterval), 10000);
    }

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, []);

  const start = useCallback(async () => {
    if (!vapiRef.current) {
      // Try to initialize if not ready
      if (typeof window !== 'undefined' && window.vapiSDK) {
        vapiRef.current = window.vapiSDK.run({
          apiKey: VAPI_PUBLIC_KEY,
          assistant: VAPI_ASSISTANT_ID,
        });
      } else {
        onErrorRef.current?.('Vapi SDK not loaded yet. Please wait a moment and try again.');
        return;
      }
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

      console.log('📞 Starting Vapi call...');
      await vapiRef.current.start();
    } catch (error) {
      console.error('❌ Failed to start Vapi call:', error);
      setStatus('idle');
      onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to connect');
    }
  }, [isActive]);

  const stop = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setStatus('idle');
    setIsActive(false);
  }, []);

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
    start,
    stop,
    toggle,
  };
}
