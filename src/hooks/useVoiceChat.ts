import { useState, useCallback, useRef } from 'react';

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UseVoiceChatOptions {
  voiceId: string;
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  onError?: (error: string) => void;
}

// Voice ID mapping
const VOICE_IDS: Record<string, string> = {
  Roger: 'CwhRBWXzGAHq8TQ4Fs17',
  Sarah: 'EXAVITQu4vr4xnSDxMaL',
  Laura: 'FGY2WhTYpPnrIDTdsKH5',
  Charlie: 'IKne3meq5aSn9XLyUdCD',
  George: 'JBFqnCBsd6RMkjVDRZzb',
  Callum: 'N2lVS1w4EtoT3dr4eOWO',
  Liam: 'TX3LPaxmHKxFdv7VOQHJ',
  Alice: 'Xb7hH8MSUJpSbSDYk0k2',
  Matilda: 'XrExE9yKIg1WjnnlVkGX',
  Jessica: 'cgSgspJ2msm6clMCkdW9',
  Eric: 'cjVigY5qzO86Huf0OWal',
  Brian: 'nPczCjzI2devNBz1zQrb',
};

export function useVoiceChat({ voiceId, onTranscript, onError }: UseVoiceChatOptions) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [isActive, setIsActive] = useState(false);
  const messagesRef = useRef<Message[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldContinueRef = useRef(false);

  const getAIResponse = useCallback(async (userText: string): Promise<string> => {
    messagesRef.current.push({ role: 'user', content: userText });
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: messagesRef.current }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'AI request failed');
    }

    const data = await response.json();
    messagesRef.current.push({ role: 'assistant', content: data.content });
    return data.content;
  }, []);

  const speakText = useCallback(async (text: string): Promise<void> => {
    const elevenLabsVoiceId = VOICE_IDS[voiceId] || VOICE_IDS.Sarah;
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text, voiceId: elevenLabsVoiceId }),
      }
    );

    if (!response.ok) {
      throw new Error('TTS request failed');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        resolve();
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        reject(new Error('Audio playback failed'));
      };
      
      audio.play().catch(reject);
    });
  }, [voiceId]);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      onError?.('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setStatus('listening');
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscript?.(transcript, 'user');
      
      if (!shouldContinueRef.current) return;
      
      setStatus('processing');
      
      try {
        const response = await getAIResponse(transcript);
        onTranscript?.(response, 'assistant');
        
        if (!shouldContinueRef.current) return;
        
        setStatus('speaking');
        await speakText(response);
        
        // Continue listening if still active
        if (shouldContinueRef.current) {
          startListening();
        }
      } catch (error) {
        console.error('Voice chat error:', error);
        onError?.(error instanceof Error ? error.message : 'An error occurred');
        setStatus('idle');
        setIsActive(false);
        shouldContinueRef.current = false;
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        onError?.(`Speech recognition error: ${event.error}`);
      }
      // Try to restart if still active
      if (shouldContinueRef.current && event.error === 'no-speech') {
        startListening();
      } else if (event.error !== 'aborted') {
        setStatus('idle');
        setIsActive(false);
        shouldContinueRef.current = false;
      }
    };

    recognition.onend = () => {
      if (status === 'listening' && shouldContinueRef.current) {
        // Restart if we ended without getting a result
        startListening();
      }
    };

    recognition.start();
  }, [getAIResponse, speakText, onTranscript, onError, status]);

  const start = useCallback(() => {
    setIsActive(true);
    shouldContinueRef.current = true;
    messagesRef.current = [];
    startListening();
  }, [startListening]);

  const stop = useCallback(() => {
    shouldContinueRef.current = false;
    setIsActive(false);
    setStatus('idle');
    
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    if (isActive) {
      stop();
    } else {
      start();
    }
  }, [isActive, start, stop]);

  return {
    status,
    isActive,
    start,
    stop,
    toggle,
  };
}

// Type declarations for Speech Recognition
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}
