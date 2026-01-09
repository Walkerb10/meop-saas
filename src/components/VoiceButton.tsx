import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

interface VoiceButtonProps {
  status: 'disconnected' | 'connecting' | 'connected';
  isSpeaking: boolean;
  onToggle: () => void;
}

export function VoiceButton({ status, isSpeaking, onToggle }: VoiceButtonProps) {
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse ring when connected */}
      {isConnected && (
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

      {/* Glow effect */}
      <div 
        className={`absolute w-40 h-40 rounded-full blur-3xl transition-all duration-500 ${
          isConnected ? 'opacity-50 scale-100' : 'opacity-0 scale-50'
        }`}
        style={{ background: 'hsl(175 80% 50% / 0.4)' }}
      />

      {/* Main button */}
      <motion.button
        onClick={onToggle}
        disabled={isConnecting}
        className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
          isConnected 
            ? 'bg-primary shadow-[0_0_40px_hsl(175_80%_50%/0.5)]' 
            : 'bg-primary/80 hover:bg-primary hover:shadow-[0_0_30px_hsl(175_80%_50%/0.3)]'
        } ${isConnecting ? 'animate-pulse' : ''}`}
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
        ) : (
          <Mic className={`w-12 h-12 text-primary-foreground ${isConnecting ? 'opacity-50' : ''}`} />
        )}
      </motion.button>

      {/* Status label */}
      <motion.div
        className="absolute -bottom-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <span className="text-sm font-medium text-muted-foreground">
          {isConnecting ? 'Connecting...' : isConnected ? (isSpeaking ? 'Speaking' : 'Listening') : 'Tap to talk'}
        </span>
      </motion.div>
    </div>
  );
}
