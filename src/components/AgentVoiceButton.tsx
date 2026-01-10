import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { AgentStatus } from '@/hooks/useElevenLabsAgent';

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

  const isSmall = size === 'small';
  const buttonSize = isSmall ? 'w-16 h-16' : 'w-32 h-32';
  const iconSize = isSmall ? 'w-6 h-6' : 'w-12 h-12';
  const pulseSize = isSmall ? 'w-20 h-20' : 'w-36 h-36';
  const glowSize = isSmall ? 'w-24 h-24' : 'w-40 h-40';

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse ring when active */}
      {isActive && !isSmall && (
        <motion.div
          className={`absolute ${pulseSize} rounded-full border-2 border-primary/50`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.2, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Speaking indicator rings */}
      {isSpeaking && (
        <>
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className={`absolute ${isSmall ? 'w-16 h-16' : 'w-32 h-32'} rounded-full border border-primary/40`}
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Listening pulse */}
      {isListening && !isSmall && (
        <motion.div
          className={`absolute ${pulseSize} rounded-full bg-primary/20`}
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Glow effect */}
      {!isSmall && (
        <div 
          className={`absolute ${glowSize} rounded-full blur-3xl transition-all duration-500 ${
            isActive ? 'opacity-50 scale-100' : 'opacity-0 scale-50'
          }`}
          style={{ background: 'hsl(var(--primary) / 0.4)' }}
        />
      )}

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
        {/* Wave bars when speaking */}
        {isSpeaking ? (
          <div className="flex items-center justify-center gap-1">
            {[...Array(isSmall ? 3 : 5)].map((_, i) => (
              <motion.div
                key={i}
                className={`${isSmall ? 'w-1' : 'w-1.5'} bg-primary-foreground rounded-full`}
                animate={{ height: isSmall ? [4, 16, 4] : [8, 32, 8] }}
                transition={{
                  duration: 0.5,
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
