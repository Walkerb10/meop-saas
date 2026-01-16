import { useState, useCallback, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { supabase } from '@/integrations/supabase/client';
import { getVapiInstance } from './useVapiPreload';

export type AgentStatus = 'idle' | 'connecting' | 'listening' | 'speaking';

interface UseVapiAgentOptions {
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  onError?: (error: string) => void;
  conversationId?: string;
}

// Vapi assistant ID
const VAPI_ASSISTANT_ID = '9526dfda-7749-42f3-af9c-0dfec7fdd6cd';

// Session timeout in milliseconds (10 minutes)
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const CONVERSATION_ID_KEY = 'vapi_conversation_id';
const LAST_ACTIVITY_KEY = 'vapi_last_activity';

export function useVapiAgent({
  onTranscript,
  onError,
  conversationId: externalConversationId,
}: UseVapiAgentOptions = {}) {
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [isActive, setIsActive] = useState(false);
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const vapiRef = useRef<Vapi | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const statusRef = useRef<AgentStatus>('idle');
  
  // Audio analyzer refs for real mic detection
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startMicAnalyzerRef = useRef<() => Promise<void>>();
  const stopMicAnalyzerRef = useRef<() => void>();

  // Keep refs updated
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    statusRef.current = status;
  }, [onTranscript, onError, status]);

  // Initialize or restore conversation ID
  useEffect(() => {
    if (externalConversationId) {
      setConversationId(externalConversationId);
      return;
    }
    
    // Check for existing session
    const storedId = localStorage.getItem(CONVERSATION_ID_KEY);
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    
    if (storedId && lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed < SESSION_TIMEOUT_MS) {
        // Session still valid
        setConversationId(storedId);
        return;
      }
    }
    
    // Create new conversation ID
    const newId = crypto.randomUUID();
    setConversationId(newId);
    localStorage.setItem(CONVERSATION_ID_KEY, newId);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, [externalConversationId]);

  // Update last activity timestamp on any interaction
  const updateActivity = useCallback(() => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  // Save transcript to database and generate embedding
  const saveTranscript = useCallback(async (text: string, role: 'user' | 'assistant') => {
    if (!conversationId || !text.trim()) return;
    
    updateActivity();
    
    try {
      const { data: inserted, error } = await supabase
        .from('conversation_transcripts')
        .insert({
          role,
          content: text.trim(),
          conversation_id: conversationId,
          raw_payload: { source: 'vapi', timestamp: new Date().toISOString() },
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      // Generate embedding asynchronously (don't await to avoid blocking)
      if (inserted?.id) {
        supabase.functions.invoke('generate-conversation-embedding', {
          body: { transcriptId: inserted.id, content: text.trim() },
        }).catch(err => console.error('Embedding generation failed:', err));
      }
    } catch (error) {
      console.error('Failed to save transcript:', error);
    }
  }, [conversationId, updateActivity]);

  // Reset volume levels
  const resetVolumes = useCallback(() => {
    setInputVolume(0);
    setOutputVolume(0);
  }, []);

  // Start new conversation (resets session)
  const startNewConversation = useCallback(() => {
    const newId = crypto.randomUUID();
    setConversationId(newId);
    localStorage.setItem(CONVERSATION_ID_KEY, newId);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    return newId;
  }, []);

  // Start real-time microphone volume detection using Web Audio API
  const startMicAnalyzer = async () => {
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
  };

  // Stop microphone analyzer
  const stopMicAnalyzer = () => {
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
  };

  // Keep analyzer functions in refs
  startMicAnalyzerRef.current = startMicAnalyzer;
  stopMicAnalyzerRef.current = stopMicAnalyzer;

  // Initialize Vapi instance (uses pre-loaded singleton)
  useEffect(() => {
    if (!vapiRef.current) {
      console.log('🎙️ Getting Vapi instance...');
      vapiRef.current = getVapiInstance();

      const vapi = vapiRef.current;

      vapi.on('call-start', () => {
        console.log('✅ Vapi call started');
        setStatus('listening');
        setIsActive(true);
        updateActivity();
        
        // Start our local mic analyzer for real-time volume
        startMicAnalyzerRef.current?.();
        
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
        setInputVolume(0);
        setOutputVolume(0);
        stopMicAnalyzerRef.current?.();
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
        updateActivity();

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
        setInputVolume(0);
        setOutputVolume(0);
        stopMicAnalyzerRef.current?.();
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        onErrorRef.current?.(errorMessage);
      });
    }

    return () => {
      setInputVolume(0);
      setOutputVolume(0);
      stopMicAnalyzerRef.current?.();
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, [saveTranscript, updateActivity]);

  // Send text message to Vapi - injects into live conversation and triggers response
  const sendMessage = useCallback((text: string) => {
    if (!vapiRef.current || !text.trim()) return false;
    
    // Must have an active call to send messages
    if (!isActive) {
      console.warn('Cannot send message: no active Vapi call');
      return false;
    }
    
    updateActivity();
    
    try {
      // Use 'add-message' to inject the user message into the conversation
      vapiRef.current.send({
        type: 'add-message',
        message: {
          role: 'user',
          content: text.trim(),
        },
      });
      
      // Immediately show in transcript (Vapi won't echo back typed messages)
      onTranscriptRef.current?.(text.trim(), 'user');
      saveTranscript(text.trim(), 'user');
      
      console.log('📤 Sent text message to Vapi:', text);
      return true;
    } catch (error) {
      console.error('Failed to send message to Vapi:', error);
      return false;
    }
  }, [isActive, saveTranscript, updateActivity]);

  const start = useCallback(async (previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    if (!vapiRef.current) {
      vapiRef.current = getVapiInstance();
    }

    if (isActive) {
      console.log('Already in a call, skipping');
      return;
    }

    // Check if session expired
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed >= SESSION_TIMEOUT_MS) {
        // Session expired, start new one
        startNewConversation();
      }
    }

    setStatus('connecting');
    updateActivity();

    const vapi = vapiRef.current;

    // Helper: ensure the call is actually started before we inject history.
    // In practice, sending add-message too early can be ignored by the call transport.
    const waitForCallStart = () =>
      new Promise<void>((resolve) => {
        if (!vapi) return resolve();

        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };

        const timeout = window.setTimeout(done, 1500);

        // Using `.once` so we don't leak listeners.
        vapi.once('call-start', () => {
          window.clearTimeout(timeout);
          done();
        });
        vapi.once('call-start-failed', () => {
          window.clearTimeout(timeout);
          done();
        });
      });

    try {
      console.log('📞 Starting Vapi call with assistant:', VAPI_ASSISTANT_ID);

      const hasHistory = !!previousMessages && previousMessages.length > 0;
      const history = (previousMessages ?? []).slice(-20);

      if (hasHistory) {
        console.log(`🧠 Resuming with ${history.length} messages of context`);

        const historyText = history
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n');

        const callStartPromise = waitForCallStart();

        // Start call (suppress greeting if resuming)
        await vapi?.start(VAPI_ASSISTANT_ID, {
          firstMessage: '',
          variableValues: {
            // Provide at least last 20 messages (requested) as a single context string,
            // so it works even if the assistant prompt only looks at variables.
            conversationContext: historyText,
            isResuming: 'true',
          },
        });

        // Wait until the call transport is up before injecting history into the live call.
        await callStartPromise;

        // Inject the *full* history into the live call so Vapi actually “remembers”.
        // Keep triggerResponseEnabled=false so it doesn't auto-respond to each injected line.
        vapi?.send({
          type: 'add-message',
          message: {
            role: 'system',
            content:
              `Conversation history for context. Continue naturally. Do not repeat greetings. Do not mention you were given history.\n\n${historyText}`,
          },
          triggerResponseEnabled: false,
        });

        history.forEach((m) => {
          vapi?.send({
            type: 'add-message',
            message: {
              role: m.role,
              content: m.content,
            },
            triggerResponseEnabled: false,
          });
        });
      } else {
        await vapi?.start(VAPI_ASSISTANT_ID);
      }
    } catch (error) {
      console.error('❌ Failed to start Vapi call:', error);
      setStatus('idle');
      onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to connect');
    }
  }, [isActive, startNewConversation, updateActivity]);

  const stop = useCallback(() => {
    setInputVolume(0);
    setOutputVolume(0);
    stopMicAnalyzerRef.current?.();
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setStatus('idle');
    setIsActive(false);
  }, []);

  const toggle = useCallback(async (previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    if (isActive) {
      stop();
    } else {
      await start(previousMessages);
    }
  }, [isActive, start, stop]);

  return {
    status,
    isActive,
    isSpeaking: status === 'speaking',
    inputVolume,
    outputVolume,
    conversationId,
    start,
    stop,
    toggle,
    sendMessage,
    startNewConversation,
  };
}
