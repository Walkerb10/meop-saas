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
      console.log('Connected to ElevenLabs agent');
      setIsConnecting(false);
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs agent');
      setIsConnecting(false);
    },
    onMessage: (message) => {
      console.log('Agent message:', message);
      
      // Type-safe message handling using unknown first
      const msg = message as unknown as Record<string, unknown>;
      
      // Handle user transcript
      if (msg.type === 'user_transcript') {
        const event = msg.user_transcription_event as Record<string, unknown> | undefined;
        const transcript = event?.user_transcript as string | undefined;
        if (transcript && onTranscript) {
          onTranscript(transcript, 'user');
        }
      }
      
      // Handle agent response
      if (msg.type === 'agent_response') {
        const event = msg.agent_response_event as Record<string, unknown> | undefined;
        const response = event?.agent_response as string | undefined;
        if (response && onTranscript) {
          onTranscript(response, 'assistant');
        }
      }
    },
    onError: (error) => {
      console.error('Agent error:', error);
      setIsConnecting(false);
      const errorMessage = typeof error === 'string' ? error : 'Connection failed';
      onError?.(errorMessage);
    },
  });

  const start = useCallback(async () => {
    if (conversation.status === 'connected') return;
    
    setIsConnecting(true);
    
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from edge function
      const { data, error } = await supabase.functions.invoke(
        'elevenlabs-conversation-token',
        { body: { agentId } }
      );

      if (error || !data?.signed_url) {
        throw new Error(error?.message || 'Failed to get conversation token');
      }

      // Start the conversation with WebSocket
      await conversation.startSession({
        signedUrl: data.signed_url,
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setIsConnecting(false);
      onError?.(error instanceof Error ? error.message : 'Failed to connect');
    }
  }, [conversation, agentId, onError]);

  const stop = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const toggle = useCallback(async () => {
    if (conversation.status === 'connected') {
      await stop();
    } else {
      await start();
    }
  }, [conversation.status, start, stop]);

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
