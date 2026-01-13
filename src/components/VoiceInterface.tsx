import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWebSpeech, VoiceStatus } from '@/hooks/useWebSpeech';
import { useToast } from '@/hooks/use-toast';

interface VoiceInterfaceProps {
  onTranscript?: (text: string) => void;
  onSendMessage?: (message: string) => Promise<string>;
  size?: 'small' | 'normal' | 'large';
  showTranscript?: boolean;
  autoRespond?: boolean;
}

export function VoiceInterface({ 
  onTranscript, 
  onSendMessage,
  size = 'normal',
  showTranscript = true,
  autoRespond = true,
}: VoiceInterfaceProps) {
  const [processing, setProcessing] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const { toast } = useToast();

  const handleTranscript = useCallback(async (text: string) => {
    setLastTranscript(text);
    onTranscript?.(text);

    if (autoRespond && onSendMessage && text.trim()) {
      setProcessing(true);
      try {
        const response = await onSendMessage(text);
        setLastResponse(response);
        speak(response);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to get response',
        });
      } finally {
        setProcessing(false);
      }
    }
  }, [onTranscript, onSendMessage, autoRespond, toast]);

  const handleError = useCallback((error: string) => {
    // Don't show error for common non-critical issues
    if (error === 'no-speech' || error === 'aborted') return;
    
    toast({
      variant: 'destructive',
      title: 'Voice Error',
      description: error === 'not-allowed' 
        ? 'Please allow microphone access to use voice input' 
        : error,
    });
  }, [toast]);

  const {
    status,
    isListening,
    isSupported,
    interimTranscript,
    speak,
    stopSpeaking,
    toggle,
  } = useWebSpeech({
    onTranscript: handleTranscript,
    onError: handleError,
  });

  const combinedStatus: VoiceStatus = processing ? 'processing' : status;

  const sizeClasses = {
    small: 'w-14 h-14',
    normal: 'w-24 h-24',
    large: 'w-32 h-32',
  };

  const iconSizes = {
    small: 'w-6 h-6',
    normal: 'w-10 h-10',
    large: 'w-12 h-12',
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
        <AlertCircle className="w-6 h-6 text-destructive" />
        <p className="text-sm text-destructive text-center">
          Voice input is not supported in this browser.
          Please use Chrome, Edge, or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Main Voice Orb */}
      <div className="relative">
        {/* Ripple effects when listening */}
        <AnimatePresence>
          {isListening && (
            <>
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full bg-primary/30"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 1.5 + i * 0.4, opacity: 0 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.4,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Speaking pulse */}
        <AnimatePresence>
          {combinedStatus === 'speaking' && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{
                background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
              }}
            />
          )}
        </AnimatePresence>

        {/* Main orb button */}
        <motion.button
          whileHover={{ scale: processing ? 1 : 1.05 }}
          whileTap={{ scale: processing ? 1 : 0.95 }}
          onClick={toggle}
          disabled={processing}
          className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
          style={{
            background: isListening 
              ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(280 70% 50%))'
              : combinedStatus === 'speaking'
              ? 'linear-gradient(135deg, hsl(142 70% 45%), hsl(160 70% 40%))'
              : 'linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--muted)))',
            boxShadow: isListening 
              ? '0 0 40px hsl(var(--primary) / 0.5), 0 10px 30px rgba(0,0,0,0.3)'
              : combinedStatus === 'speaking'
              ? '0 0 40px hsl(142 70% 45% / 0.5), 0 10px 30px rgba(0,0,0,0.3)'
              : '0 10px 30px rgba(0,0,0,0.2)',
          }}
        >
          {/* Inner glow */}
          <div 
            className="absolute inset-2 rounded-full opacity-50"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)',
            }}
          />
          
          {/* Icon */}
          {combinedStatus === 'processing' ? (
            <Loader2 className={`${iconSizes[size]} text-white animate-spin`} />
          ) : combinedStatus === 'speaking' ? (
            <Volume2 className={`${iconSizes[size]} text-white`} />
          ) : isListening ? (
            <Mic className={`${iconSizes[size]} text-white`} />
          ) : (
            <MicOff className={`${iconSizes[size]} text-foreground/70`} />
          )}
        </motion.button>
      </div>

      {/* Status Badge */}
      <Badge 
        variant={isListening ? 'default' : combinedStatus === 'speaking' ? 'default' : 'secondary'}
        className={`capitalize transition-all ${
          isListening ? 'bg-primary' : combinedStatus === 'speaking' ? 'bg-green-500' : ''
        }`}
      >
        {combinedStatus === 'idle' && 'Tap to talk'}
        {combinedStatus === 'listening' && '🎤 Listening...'}
        {combinedStatus === 'processing' && '🤔 Thinking...'}
        {combinedStatus === 'speaking' && '🔊 Speaking...'}
      </Badge>

      {/* Transcript Display */}
      {showTranscript && (
        <div className="max-w-md text-center space-y-2">
          <AnimatePresence mode="wait">
            {interimTranscript && (
              <motion.p
                key="interim"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm text-muted-foreground italic"
              >
                {interimTranscript}
              </motion.p>
            )}
          </AnimatePresence>
          
          {lastTranscript && !interimTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <p className="text-sm text-foreground bg-primary/10 rounded-lg px-3 py-2">
                <span className="text-xs text-muted-foreground">You:</span> {lastTranscript}
              </p>
              {lastResponse && (
                <p className="text-sm text-foreground bg-secondary rounded-lg px-3 py-2">
                  <span className="text-xs text-muted-foreground">AI:</span> {lastResponse.slice(0, 150)}
                  {lastResponse.length > 150 && '...'}
                </p>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Stop speaking button */}
      {combinedStatus === 'speaking' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Button 
            variant="outline" 
            size="sm"
            onClick={stopSpeaking}
            className="gap-2"
          >
            <VolumeX className="w-4 h-4" />
            Stop Speaking
          </Button>
        </motion.div>
      )}

      {/* Hint text */}
      {combinedStatus === 'idle' && !lastTranscript && (
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Click the orb and speak. The AI will listen, process, and respond with voice.
        </p>
      )}
    </div>
  );
}