import { useState, useCallback, useRef, useEffect } from 'react';

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
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceIdRef = useRef(voiceId);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    voiceIdRef.current = voiceId;
  }, [voiceId]);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const getAIResponse = useCallback(async (userText: string): Promise<string> => {
    messagesRef.current.push({ role: 'user', content: userText });
    
    console.log('Getting AI response for:', userText);
    
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
    console.log('AI response:', data.content);
    messagesRef.current.push({ role: 'assistant', content: data.content });
    return data.content;
  }, []);

  const speakText = useCallback(async (text: string): Promise<void> => {
    const elevenLabsVoiceId = VOICE_IDS[voiceIdRef.current] || VOICE_IDS.Sarah;
    
    console.log('Speaking text with voice:', elevenLabsVoiceId);
    
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
      const error = await response.json();
      throw new Error(error.error || 'TTS request failed');
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
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    
    console.log('Transcribing audio, size:', audioBlob.size);
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-stt`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: formData,
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Transcription failed');
    }
    
    const data = await response.json();
    console.log('Transcription result:', data.text);
    return data.text || '';
  }, []);

  const processAndContinue = useCallback(async () => {
    if (audioChunksRef.current.length === 0) {
      console.log('No audio chunks to process');
      if (shouldContinueRef.current) {
        startListening();
      }
      return;
    }
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    audioChunksRef.current = [];
    
    console.log('Processing audio blob, size:', audioBlob.size);
    
    if (audioBlob.size < 1000) {
      console.log('Audio too small, skipping');
      if (shouldContinueRef.current) {
        startListening();
      }
      return;
    }
    
    setStatus('processing');
    
    try {
      const transcript = await transcribeAudio(audioBlob);
      
      if (!transcript.trim()) {
        console.log('Empty transcript, continuing to listen');
        if (shouldContinueRef.current) {
          setStatus('listening');
          startListening();
        }
        return;
      }
      
      onTranscriptRef.current?.(transcript, 'user');
      
      if (!shouldContinueRef.current) return;
      
      const response = await getAIResponse(transcript);
      onTranscriptRef.current?.(response, 'assistant');
      
      if (!shouldContinueRef.current) return;
      
      setStatus('speaking');
      await speakText(response);
      
      if (shouldContinueRef.current) {
        setStatus('listening');
        startListening();
      }
    } catch (error) {
      console.error('Voice chat error:', error);
      onErrorRef.current?.(error instanceof Error ? error.message : 'An error occurred');
      if (shouldContinueRef.current) {
        setStatus('listening');
        startListening();
      }
    }
  }, [transcribeAudio, getAIResponse, speakText]);

  const startListening = useCallback(async () => {
    try {
      if (!streamRef.current) {
        console.log('Requesting microphone access...');
        streamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        console.log('Microphone access granted');
      }
      
      // Check for supported MIME types
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      
      console.log('Using MIME type:', mimeType);
      
      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('Recording stopped, chunks:', audioChunksRef.current.length);
        processAndContinue();
      };
      
      mediaRecorder.start(100);
      setStatus('listening');
      console.log('Recording started');
      
      // Auto-stop after 5 seconds of recording
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          console.log('Auto-stopping after timeout');
          mediaRecorderRef.current.stop();
        }
      }, 5000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      onErrorRef.current?.('Microphone access denied');
      setStatus('idle');
      setIsActive(false);
    }
  }, [processAndContinue]);

  const start = useCallback(() => {
    console.log('Starting voice chat');
    setIsActive(true);
    shouldContinueRef.current = true;
    messagesRef.current = [];
    startListening();
  }, [startListening]);

  const stop = useCallback(() => {
    console.log('Stopping voice chat');
    shouldContinueRef.current = false;
    setIsActive(false);
    setStatus('idle');
    
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
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

  useEffect(() => {
    return () => {
      shouldContinueRef.current = false;
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return {
    status,
    isActive,
    start,
    stop,
    toggle,
  };
}