import { useState, useCallback, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { supabase } from '@/integrations/supabase/client';
import { getVapiInstance } from './useVapiPreload';

export type ConversationStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'thinking';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  source: 'voice' | 'text';
}

interface UseUnifiedConversationOptions {
  onError?: (error: string) => void;
}

// Vapi assistant ID
const VAPI_ASSISTANT_ID = '9526dfda-7749-42f3-af9c-0dfec7fdd6cd';

// Session timeout in milliseconds (10 minutes)
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const SESSION_ID_KEY = 'unified_session_id';
const LAST_ACTIVITY_KEY = 'unified_last_activity';
const CHAT_ID_KEY = 'unified_chat_id';

export function useUnifiedConversation({ onError }: UseUnifiedConversationOptions = {}) {
  // Core state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [status, setStatus] = useState<ConversationStatus>('idle');
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const [isTextLoading, setIsTextLoading] = useState(false);
  
  // Refs
  const vapiRef = useRef<Vapi | null>(null);
  const onErrorRef = useRef(onError);
  const statusRef = useRef<ConversationStatus>('idle');
  const previousChatIdRef = useRef<string | null>(null);
  const pendingTextRef = useRef<string | null>(null);
  
  // Audio analyzer refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Keep refs updated
  useEffect(() => {
    onErrorRef.current = onError;
    statusRef.current = status;
  }, [onError, status]);

  // Initialize or restore session
  useEffect(() => {
    const storedId = localStorage.getItem(SESSION_ID_KEY);
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    const storedChatId = localStorage.getItem(CHAT_ID_KEY);
    
    if (storedId && lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed < SESSION_TIMEOUT_MS) {
        setSessionId(storedId);
        if (storedChatId) {
          previousChatIdRef.current = storedChatId;
        }
        return;
      }
    }
    
    // Create new session
    const newId = crypto.randomUUID();
    setSessionId(newId);
    localStorage.setItem(SESSION_ID_KEY, newId);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    localStorage.removeItem(CHAT_ID_KEY);
    previousChatIdRef.current = null;
  }, []);

  const updateActivity = useCallback(() => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  // Add message to conversation
  const addMessage = useCallback((content: string, role: 'user' | 'assistant', source: 'voice' | 'text') => {
    const message: ConversationMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
      source,
    };
    setMessages(prev => [...prev, message]);
    updateActivity();
    
    // Save to database
    if (sessionId) {
      supabase.from('conversation_transcripts').insert({
        role,
        content,
        conversation_id: sessionId,
        raw_payload: { source, timestamp: new Date().toISOString() },
      }).then(({ data, error }) => {
        if (error) console.error('Failed to save transcript:', error);
        if (data) {
          // Generate embedding asynchronously
          supabase.functions.invoke('generate-conversation-embedding', {
            body: { transcriptId: (data as { id: string }).id, content },
          }).catch(err => console.error('Embedding generation failed:', err));
        }
      });
    }
  }, [sessionId, updateActivity]);

  // Start new conversation
  const startNewConversation = useCallback(() => {
    // End any active call
    if (vapiRef.current && isVoiceCallActive) {
      vapiRef.current.stop();
    }
    
    // Clear state
    setMessages([]);
    setStatus('idle');
    setIsVoiceCallActive(false);
    setVoiceModeEnabled(false);
    previousChatIdRef.current = null;
    
    // Create new session
    const newId = crypto.randomUUID();
    setSessionId(newId);
    localStorage.setItem(SESSION_ID_KEY, newId);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    localStorage.removeItem(CHAT_ID_KEY);
    
    return newId;
  }, [isVoiceCallActive]);

  // Mic analyzer
  const startMicAnalyzer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
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
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;
        const normalizedVolume = Math.min(1, average / 128);
        
        if (statusRef.current === 'listening') {
          setInputVolume(normalizedVolume);
        }
        
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();
    } catch (error) {
      console.error('Failed to start mic analyzer:', error);
    }
  };

  const stopMicAnalyzer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    analyserRef.current = null;
    micStreamRef.current = null;
    audioContextRef.current = null;
    animationFrameRef.current = null;
  };

  // Initialize Vapi
  useEffect(() => {
    if (!vapiRef.current) {
      vapiRef.current = getVapiInstance();
      const vapi = vapiRef.current;

      vapi.on('call-start', () => {
        console.log('✅ Vapi call started');
        setStatus('listening');
        setIsVoiceCallActive(true);
        updateActivity();
        startMicAnalyzer();
        
        // If there was a pending text message, send it now
        if (pendingTextRef.current) {
          const text = pendingTextRef.current;
          pendingTextRef.current = null;
          setTimeout(() => {
            vapi.send({
              type: 'add-message',
              message: { role: 'user', content: text },
            });
          }, 500);
        }
      });

      vapi.on('call-end', () => {
        console.log('❌ Vapi call ended');
        setStatus('idle');
        setIsVoiceCallActive(false);
        setInputVolume(0);
        setOutputVolume(0);
        stopMicAnalyzer();
      });

      vapi.on('speech-start', () => {
        setStatus('speaking');
        setInputVolume(0);
      });

      vapi.on('speech-end', () => {
        setStatus('listening');
        setOutputVolume(0);
      });

      vapi.on('volume-level', (volume: number) => {
        if (statusRef.current === 'speaking') {
          setOutputVolume(volume);
        }
      });

      vapi.on('message', (message) => {
        updateActivity();
        if (message.type === 'transcript' && message.transcriptType === 'final') {
          const transcript = message.transcript;
          const role = message.role === 'user' ? 'user' : 'assistant';
          if (transcript) {
            addMessage(transcript, role, 'voice');
          }
        }
      });

      vapi.on('error', (error) => {
        console.error('❌ Vapi error:', error);
        setStatus('idle');
        setIsVoiceCallActive(false);
        stopMicAnalyzer();
        onErrorRef.current?.(error instanceof Error ? error.message : 'Connection failed');
      });
    }

    return () => {
      stopMicAnalyzer();
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, [addMessage, updateActivity]);

  // Start voice call
  const startVoiceCall = useCallback(async () => {
    if (!vapiRef.current || isVoiceCallActive) return;
    
    setStatus('connecting');
    updateActivity();
    
    try {
      await vapiRef.current.start(VAPI_ASSISTANT_ID);
      setVoiceModeEnabled(true);
    } catch (error) {
      console.error('Failed to start voice call:', error);
      setStatus('idle');
      onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to connect');
    }
  }, [isVoiceCallActive, updateActivity]);

  // Stop voice call (but keep session)
  const stopVoiceCall = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setVoiceModeEnabled(false);
    setStatus('idle');
    setIsVoiceCallActive(false);
    setInputVolume(0);
    setOutputVolume(0);
    stopMicAnalyzer();
  }, []);

  // Toggle voice mode
  const toggleVoiceMode = useCallback(async () => {
    if (isVoiceCallActive) {
      stopVoiceCall();
    } else {
      await startVoiceCall();
    }
  }, [isVoiceCallActive, startVoiceCall, stopVoiceCall]);

  // Send text message
  const sendTextMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    const trimmedText = text.trim();
    updateActivity();
    
    // If voice call is active, inject text into the call
    if (isVoiceCallActive && vapiRef.current) {
      try {
        vapiRef.current.send({
          type: 'add-message',
          message: { role: 'user', content: trimmedText },
        });
        // Add to messages immediately (Vapi won't echo back typed messages)
        addMessage(trimmedText, 'user', 'text');
        return;
      } catch (error) {
        console.error('Failed to inject text into voice call:', error);
      }
    }
    
    // If voice mode is enabled but call isn't active yet, queue the message and start call
    if (voiceModeEnabled && !isVoiceCallActive) {
      pendingTextRef.current = trimmedText;
      addMessage(trimmedText, 'user', 'text');
      await startVoiceCall();
      return;
    }
    
    // Text-only mode: use Vapi Chat API
    addMessage(trimmedText, 'user', 'text');
    setIsTextLoading(true);
    setStatus('thinking');
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vapi-chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmedText,
            previousChatId: previousChatIdRef.current,
            sessionId,
          }),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }
      
      const data = await response.json();
      
      // Update chat ID for context chain
      if (data.id) {
        previousChatIdRef.current = data.id;
        localStorage.setItem(CHAT_ID_KEY, data.id);
      }
      
      // Add assistant response
      if (data.output) {
        addMessage(data.output, 'assistant', 'text');
      }
      
    } catch (error) {
      console.error('Text chat error:', error);
      onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsTextLoading(false);
      setStatus('idle');
    }
  }, [isVoiceCallActive, voiceModeEnabled, sessionId, startVoiceCall, addMessage, updateActivity]);

  return {
    // State
    sessionId,
    messages,
    status,
    voiceModeEnabled,
    isVoiceCallActive,
    inputVolume,
    outputVolume,
    isLoading: isTextLoading || status === 'connecting' || status === 'thinking',
    
    // Actions
    sendTextMessage,
    toggleVoiceMode,
    startVoiceCall,
    stopVoiceCall,
    startNewConversation,
    setVoiceModeEnabled,
  };
}
