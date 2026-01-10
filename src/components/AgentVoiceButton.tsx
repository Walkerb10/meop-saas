import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { AgentStatus } from '@/hooks/useElevenLabsAgent';

interface AgentVoiceButtonProps {
  status: AgentStatus;
  isActive: boolean;
  onToggle: () => void;
}

export function AgentVoiceButton({ status, isActive, onToggle }: AgentVoiceButtonProps) {
  const isListening = status === 'listening';
  const isSpeaking = status === 'speaking';
  const isConnecting = status === 'connecting';

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse ring when active */}
      {isActive && (
        <motion.div
          className="absolute w-36 h-36 rounded-full border-2 border-primary/50"
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
              className="absolute w-32 h-32 rounded-full border border-primary/40"
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
      {isListening && (
        <motion.div
          className="absolute w-36 h-36 rounded-full bg-primary/20"
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
      <div 
        className={`absolute w-40 h-40 rounded-full blur-3xl transition-all duration-500 ${
          isActive ? 'opacity-50 scale-100' : 'opacity-0 scale-50'
        }`}
        style={{ background: 'hsl(var(--primary) / 0.4)' }}
      />

      {/* Main button */}
      <motion.button
        onClick={onToggle}
        disabled={isConnecting}
        className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
          isActive 
            ? 'bg-primary shadow-[0_0_40px_hsl(var(--primary)/0.5)]' 
            : 'bg-primary/80 hover:bg-primary hover:shadow-[0_0_30px_hsl(var(--primary)/0.3)]'
        } ${isConnecting ? 'cursor-wait' : ''}`}
        whileHover={{ scale: isConnecting ? 1 : 1.05 }}
        whileTap={{ scale: isConnecting ? 1 : 0.95 }}
      >
        {/* Wave bars when speaking */}
        {isSpeaking ? (
          <div className="flex items-center justify-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1.5 bg-primary-foreground rounded-full"
                animate={{ height: [8, 32, 8] }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        ) : isConnecting ? (
          <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
        ) : isActive ? (
          <MicOff className="w-12 h-12 text-primary-foreground" />
        ) : (
          <Mic className="w-12 h-12 text-primary-foreground" />
        )}
      </motion.button>

      {/* Status label with animation */}
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
    </div>
  );
}
