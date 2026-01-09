import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shouldContinueRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

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

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    // Use ElevenLabs Speech-to-Text
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    
    const { data, error } = await supabase.functions.invoke('elevenlabs-stt', {
      body: formData,
    });
    
    if (error) {
      throw new Error(error.message || 'Transcription failed');
    }
    
    return data.text || '';
  }, []);

  const processRecording = useCallback(async () => {
    if (audioChunksRef.current.length === 0) return;
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    audioChunksRef.current = [];
    
    if (audioBlob.size < 1000) {
      // Too small, probably just noise
      if (shouldContinueRef.current) {
        startRecording();
      }
      return;
    }
    
    setStatus('processing');
    
    try {
      const transcript = await transcribeAudio(audioBlob);
      
      if (!transcript.trim()) {
        if (shouldContinueRef.current) {
          setStatus('listening');
          startRecording();
        }
        return;
      }
      
      onTranscript?.(transcript, 'user');
      
      if (!shouldContinueRef.current) return;
      
      const response = await getAIResponse(transcript);
      onTranscript?.(response, 'assistant');
      
      if (!shouldContinueRef.current) return;
      
      setStatus('speaking');
      await speakText(response);
      
      if (shouldContinueRef.current) {
        setStatus('listening');
        startRecording();
      }
    } catch (error) {
      console.error('Voice chat error:', error);
      onError?.(error instanceof Error ? error.message : 'An error occurred');
      if (shouldContinueRef.current) {
        setStatus('listening');
        startRecording();
      }
    }
  }, [transcribeAudio, getAIResponse, speakText, onTranscript, onError]);

  const startRecording = useCallback(async () => {
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
      }
      
      // Set up audio analysis for silence detection
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;
      }
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        processRecording();
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setStatus('listening');
      
      // Set up silence detection
      const checkSilence = () => {
        if (!analyserRef.current || !shouldContinueRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        
        if (average < 10) {
          // Silence detected
          if (!silenceTimeoutRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              if (mediaRecorderRef.current?.state === 'recording' && audioChunksRef.current.length > 0) {
                mediaRecorderRef.current.stop();
              }
              silenceTimeoutRef.current = null;
            }, 1500); // 1.5 seconds of silence
          }
        } else {
          // Sound detected, clear silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        }
        
        if (shouldContinueRef.current && status === 'listening') {
          requestAnimationFrame(checkSilence);
        }
      };
      
      requestAnimationFrame(checkSilence);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      onError?.('Microphone access denied');
      setStatus('idle');
      setIsActive(false);
    }
  }, [processRecording, onError, status]);

  const start = useCallback(() => {
    setIsActive(true);
    shouldContinueRef.current = true;
    messagesRef.current = [];
    startRecording();
  }, [startRecording]);

  const stop = useCallback(() => {
    shouldContinueRef.current = false;
    setIsActive(false);
    setStatus('idle');
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    audioChunksRef.current = [];
  }, []);

  const toggle = useCallback(() => {
    if (isActive) {
      stop();
    } else {
      start();
    }
  }, [isActive, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    status,
    isActive,
    start,
    stop,
    toggle,
  };
}
