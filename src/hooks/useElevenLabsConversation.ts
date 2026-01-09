import { useConversation } from "@elevenlabs/react";
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConversationStatus = 'disconnected' | 'connecting' | 'connected';

interface UseElevenLabsConversationOptions {
  agentId: string;
  onMessage?: (message: { role: 'user' | 'assistant'; content: string }) => void;
  onError?: (error: string) => void;
}

export function useElevenLabsConversation({ 
  agentId, 
  onMessage,
  onError 
}: UseElevenLabsConversationOptions) {
  const [status, setStatus] = useState<ConversationStatus>('disconnected');

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs agent");
      setStatus('connected');
    },
    onDisconnect: () => {
      console.log("Disconnected from agent");
      setStatus('disconnected');
    },
    onMessage: (message: unknown) => {
      console.log("Message received:", message);
      
      const msg = message as Record<string, unknown>;
      if (msg.type === 'user_transcript') {
        const event = msg.user_transcription_event as Record<string, unknown> | undefined;
        const userTranscript = event?.user_transcript as string | undefined;
        if (userTranscript && onMessage) {
          onMessage({ role: 'user', content: userTranscript });
        }
      } else if (msg.type === 'agent_response') {
        const event = msg.agent_response_event as Record<string, unknown> | undefined;
        const agentResponse = event?.agent_response as string | undefined;
        if (agentResponse && onMessage) {
          onMessage({ role: 'assistant', content: agentResponse });
        }
      }
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      setStatus('disconnected');
      onError?.(typeof error === 'string' ? error : 'Connection error');
    },
  });

  const startConversation = useCallback(async () => {
    try {
      setStatus('connecting');
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from edge function
      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-conversation-token",
        { body: { agentId } }
      );

      if (error || !data?.signed_url) {
        throw new Error(error?.message || "No signed URL received");
      }

      console.log("Got signed URL, starting session...");

      // Start the conversation
      await conversation.startSession({
        signedUrl: data.signed_url,
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setStatus('disconnected');
      onError?.(error instanceof Error ? error.message : 'Failed to connect');
    }
  }, [conversation, agentId, onError]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    setStatus('disconnected');
  }, [conversation]);

  return {
    status,
    isSpeaking: conversation.isSpeaking,
    startConversation,
    stopConversation,
  };
}
