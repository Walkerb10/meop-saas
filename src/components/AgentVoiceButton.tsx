import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { AgentStatus } from '@/hooks/useVapiAgent';

interface AgentVoiceButtonProps {
  status: AgentStatus;
  isActive: boolean;
  onToggle: () => void;
  size?: 'normal' | 'small';
}

export function AgentVoiceButton({ status, isActive, onToggle, size = 'normal' }: AgentVoiceButtonProps) {
  const isListening = status === 'listening';
  const isSpeaking = status === 'speaking';
  const isConnecting = status === 'connecting';
  const isAudioActive = isListening || isSpeaking;

  const isSmall = size === 'small';
  const buttonSize = isSmall ? 'w-16 h-16' : 'w-32 h-32';
  const iconSize = isSmall ? 'w-6 h-6' : 'w-12 h-12';

  return (
    <div className="relative flex items-center justify-center">
      {/* Main button */}
      <motion.button
        onClick={onToggle}
        disabled={isConnecting}
        className={`relative ${buttonSize} rounded-full flex items-center justify-center transition-all duration-300 ${
          isActive 
            ? 'bg-primary shadow-[0_0_40px_hsl(var(--primary)/0.5)]' 
            : 'bg-primary/80 hover:bg-primary hover:shadow-[0_0_30px_hsl(var(--primary)/0.3)]'
        } ${isConnecting ? 'cursor-wait' : ''}`}
        whileHover={{ scale: isConnecting ? 1 : 1.05 }}
        whileTap={{ scale: isConnecting ? 1 : 0.95 }}
      >
        {/* Wave bars when speaking OR listening */}
        {isAudioActive ? (
          <div className="flex items-center justify-center gap-1">
            {[...Array(isSmall ? 3 : 5)].map((_, i) => (
              <motion.div
                key={i}
                className={`${isSmall ? 'w-1' : 'w-1.5'} bg-primary-foreground rounded-full`}
                animate={{ 
                  height: isSpeaking 
                    ? (isSmall ? [4, 16, 4] : [8, 32, 8])
                    : (isSmall ? [4, 10, 4] : [8, 20, 8]) // Smaller animation when listening
                }}
                transition={{
                  duration: isSpeaking ? 0.5 : 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        ) : isConnecting ? (
          <Loader2 className={`${iconSize} text-primary-foreground animate-spin`} />
        ) : isActive ? (
          <MicOff className={`${iconSize} text-primary-foreground`} />
        ) : (
          <Mic className={`${iconSize} text-primary-foreground`} />
        )}
      </motion.button>

      {/* Status label with animation - only for normal size */}
      {!isSmall && (
        <motion.div
          className="absolute -bottom-10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={isActive ? 'stop' : 'talk'}
              className="text-sm font-medium text-muted-foreground inline-block"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {isConnecting ? 'Connecting...' : isSpeaking ? 'Speaking' : isListening ? 'Listening...' : isActive ? 'Tap to stop' : 'Tap to talk'}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
