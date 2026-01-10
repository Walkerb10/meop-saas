import { useConversation } from '@elevenlabs/react';
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AgentStatus = 'idle' | 'connecting' | 'listening' | 'speaking';

interface UseElevenLabsAgentOptions {
  agentId?: string;
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  onError?: (error: string) => void;
}

const DEFAULT_AGENT_ID = 'agent_5101kejg146zfkfby5xshmd0fc2z';

export function useElevenLabsAgent({
  agentId = DEFAULT_AGENT_ID,
  onTranscript,
  onError,
}: UseElevenLabsAgentOptions = {}) {
  const [isConnecting, setIsConnecting] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Connected to ElevenLabs agent - mic should be active');
      setIsConnecting(false);
    },
    onDisconnect: () => {
      console.log('❌ Disconnected from ElevenLabs agent');
      setIsConnecting(false);
    },
    onMessage: (message) => {
      console.log('📨 Agent message:', message);
      
      // Type-safe message handling
      const msg = message as unknown as Record<string, unknown>;
      
      // ElevenLabs SDK format: { source: "ai" | "user", role: "agent" | "user", message: string }
      if (msg.message && typeof msg.message === 'string') {
        const role = msg.source === 'user' || msg.role === 'user' ? 'user' : 'assistant';
        console.log(`🎤 ${role} said: ${msg.message}`);
        if (onTranscript) {
          onTranscript(msg.message as string, role);
        }
        return;
      }
      
      // Alternative format: user_transcript event
      if (msg.type === 'user_transcript') {
        const event = msg.user_transcription_event as Record<string, unknown> | undefined;
        const transcript = event?.user_transcript as string | undefined;
        if (transcript && onTranscript) {
          console.log(`🎤 user said (transcript event): ${transcript}`);
          onTranscript(transcript, 'user');
        }
      }
      
      // Alternative format: agent_response event
      if (msg.type === 'agent_response') {
        const event = msg.agent_response_event as Record<string, unknown> | undefined;
        const response = event?.agent_response as string | undefined;
        if (response && onTranscript) {
          console.log(`🤖 agent said (response event): ${response}`);
          onTranscript(response, 'assistant');
        }
      }
    },
    onError: (error) => {
      console.error('❌ Agent error:', error);
      setIsConnecting(false);
      const errorMessage = typeof error === 'string' ? error : 'Connection failed';
      onError?.(errorMessage);
    },
  });

  const start = useCallback(async () => {
    if (conversation.status === 'connected') {
      console.log('Already connected, skipping');
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Request microphone permission (prompt once, then release the stream)
      console.log('🎤 Requesting microphone permission...');
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach((t) => t.stop());
      console.log('✅ Microphone permission granted');

      // Get WebRTC conversation token from backend
      console.log('🔑 Getting conversation token...');
      const { data, error } = await supabase.functions.invoke(
        'elevenlabs-conversation-token',
        { body: { agentId } }
      );

      if (error || !data?.token) {
        throw new Error(error?.message || 'Failed to get conversation token');
      }

      console.log('✅ Got token, starting WebRTC session...');

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc',
      });

      console.log('✅ Session started, conversation status:', conversation.status);
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      setIsConnecting(false);
      onError?.(error instanceof Error ? error.message : 'Failed to connect');
    }
  }, [conversation, agentId, onError]);

  const stop = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const toggle = useCallback(async () => {
    // Only start if not connected - don't toggle off (stay on like ChatGPT voice mode)
    if (conversation.status !== 'connected') {
      await start();
    }
    // Note: To end conversation, use the explicit stop() or New Chat button
  }, [conversation.status, start]);

  // Map conversation status to our status type
  const getStatus = (): AgentStatus => {
    if (isConnecting) return 'connecting';
    if (conversation.status !== 'connected') return 'idle';
    if (conversation.isSpeaking) return 'speaking';
    return 'listening';
  };

  return {
    status: getStatus(),
    isActive: conversation.status === 'connected',
    isSpeaking: conversation.isSpeaking,
    start,
    stop,
    toggle,
  };
}
