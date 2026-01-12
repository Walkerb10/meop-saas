import { useState, useCallback, useEffect } from 'react';
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
}

export function VoiceInterface({ 
  onTranscript, 
  onSendMessage,
  size = 'normal',
  showTranscript = true,
}: VoiceInterfaceProps) {
  const [processing, setProcessing] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const { toast } = useToast();

  const handleTranscript = useCallback(async (text: string) => {
    setLastTranscript(text);
    onTranscript?.(text);

    if (onSendMessage && text.trim()) {
      setProcessing(true);
      try {
        const response = await onSendMessage(text);
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
  }, [onTranscript, onSendMessage, toast]);

  const handleError = useCallback((error: string) => {
    toast({
      variant: 'destructive',
      title: 'Voice Error',
      description: error,
    });
  }, [toast]);

  const {
    status,
    isListening,
    isSupported,
    interimTranscript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggle,
  } = useWebSpeech({
    onTranscript: handleTranscript,
    onError: handleError,
  });

  const combinedStatus: VoiceStatus = processing ? 'processing' : status;

  const sizeClasses = {
    small: 'w-12 h-12',
    normal: 'w-20 h-20',
    large: 'w-28 h-28',
  };

  const iconSizes = {
    small: 'w-5 h-5',
    normal: 'w-8 h-8',
    large: 'w-10 h-10',
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
      {/* Main Voice Button */}
      <div className="relative">
        {/* Ripple effects when listening */}
        <AnimatePresence>
          {isListening && (
            <>
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full bg-primary/20"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5 + i * 0.3, opacity: 0 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Speaking indicator */}
        <AnimatePresence>
          {combinedStatus === 'speaking' && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                boxShadow: [
                  '0 0 0 0 hsl(var(--primary) / 0.4)',
                  '0 0 30px 10px hsl(var(--primary) / 0.2)',
                  '0 0 0 0 hsl(var(--primary) / 0.4)',
                ],
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggle}
          disabled={processing}
          className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
            isListening
              ? 'bg-primary text-primary-foreground shadow-[0_0_40px_hsl(var(--primary)/0.5)]'
              : combinedStatus === 'speaking'
              ? 'bg-green-500 text-white'
              : 'bg-secondary text-foreground hover:bg-primary/10'
          }`}
        >
          {processing ? (
            <Loader2 className={`${iconSizes[size]} animate-spin`} />
          ) : isListening ? (
            <Mic className={iconSizes[size]} />
          ) : combinedStatus === 'speaking' ? (
            <Volume2 className={iconSizes[size]} />
          ) : (
            <MicOff className={iconSizes[size]} />
          )}
        </motion.button>
      </div>

      {/* Status Badge */}
      <Badge 
        variant={isListening ? 'default' : 'secondary'}
        className="capitalize"
      >
        {combinedStatus === 'idle' && 'Tap to talk'}
        {combinedStatus === 'listening' && 'Listening...'}
        {combinedStatus === 'processing' && 'Thinking...'}
        {combinedStatus === 'speaking' && 'Speaking...'}
      </Badge>

      {/* Transcript Display */}
      {showTranscript && (interimTranscript || lastTranscript) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          {interimTranscript && (
            <p className="text-sm text-muted-foreground italic">
              {interimTranscript}
            </p>
          )}
          {lastTranscript && !interimTranscript && (
            <p className="text-sm text-foreground">
              "{lastTranscript}"
            </p>
          )}
        </motion.div>
      )}

      {/* Stop speaking button */}
      {combinedStatus === 'speaking' && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={stopSpeaking}
          className="gap-2"
        >
          <VolumeX className="w-4 h-4" />
          Stop
        </Button>
      )}
    </div>
  );
}
