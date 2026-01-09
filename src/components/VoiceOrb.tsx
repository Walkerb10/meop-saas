import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { AIState } from '@/types/agent';

interface VoiceOrbProps {
  state: AIState;
  isActive: boolean;
  onToggle: () => void;
}

export function VoiceOrb({ state, isActive, onToggle }: VoiceOrbProps) {
  const getStateClass = () => {
    if (!isActive) return '';
    if (state === 'speaking') return 'speaking';
    if (state === 'listening' || state === 'thinking') return 'active';
    return '';
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Ripple effects when active */}
      <AnimatePresence>
        {isActive && (
          <>
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute w-32 h-32 rounded-full border border-primary/30"
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ opacity: 0 }}
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

      {/* Glow background */}
      <div 
        className={`absolute w-40 h-40 rounded-full blur-3xl transition-opacity duration-500 ${
          isActive ? 'opacity-40' : 'opacity-0'
        }`}
        style={{ background: 'hsl(175 80% 50% / 0.3)' }}
      />

      {/* Main orb button */}
      <motion.button
        onClick={onToggle}
        className={`voice-orb relative w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center ${getStateClass()}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        {/* Wave visualization when speaking */}
        <AnimatePresence>
          {state === 'speaking' && isActive && (
            <div className="absolute inset-0 flex items-center justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="wave-bar w-1 bg-primary-foreground/80 rounded-full"
                  initial={{ height: 8 }}
                  animate={{ height: [8, 24, 8] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Icon */}
        {state !== 'speaking' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {isActive ? (
              <Mic className="w-10 h-10 md:w-12 md:h-12 text-primary-foreground" />
            ) : (
              <MicOff className="w-10 h-10 md:w-12 md:h-12 text-primary-foreground/80" />
            )}
          </motion.div>
        )}
      </motion.button>

      {/* State label */}
      <motion.div
        className="absolute -bottom-12 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <span className="text-sm font-medium text-muted-foreground capitalize">
          {isActive ? state : 'Tap to start'}
        </span>
      </motion.div>
    </div>
  );
}
