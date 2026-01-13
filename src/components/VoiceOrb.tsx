import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';
import { AIState } from '@/types/agent';

interface VoiceOrbProps {
  state: AIState;
  isActive: boolean;
  onToggle: () => void;
  inputVolume?: number;
  outputVolume?: number;
}

export function VoiceOrb({ state, isActive, onToggle, inputVolume = 0, outputVolume = 0 }: VoiceOrbProps) {
  // Calculate dynamic scale based on volume
  const volume = state === 'speaking' ? outputVolume : inputVolume;
  const volumeScale = 1 + (volume * 0.15); // Scale up to 15% based on volume
  
  // Number of wave bars based on volume
  const waveBarCount = 5;
  const waveHeights = Array.from({ length: waveBarCount }, (_, i) => {
    const baseHeight = 8;
    const maxExtraHeight = 28;
    // Create varied heights based on position and volume
    const positionFactor = 1 - Math.abs(i - 2) * 0.2; // Middle bars taller
    return baseHeight + (volume * maxExtraHeight * positionFactor);
  });

  // Only show status label when active and doing something
  const showStatusLabel = isActive && (state === 'speaking' || state === 'listening' || state === 'thinking');

  return (
    <div className="relative flex items-center justify-center">
      {/* Ripple effects when active - volume reactive */}
      <AnimatePresence>
        {isActive && (
          <>
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-primary/40"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ 
                  scale: [1, 1.8 + (volume * 0.5), 2.2 + (volume * 0.5)], 
                  opacity: [0.5, 0.2, 0] 
                }}
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
      </AnimatePresence>

      {/* Glow background - intensity based on volume */}
      <motion.div 
        className="absolute w-40 h-40 md:w-48 md:h-48 rounded-full blur-3xl bg-primary/30"
        animate={{
          opacity: isActive ? 0.3 + (volume * 0.4) : 0,
          scale: isActive ? volumeScale : 0.8,
        }}
        transition={{ duration: 0.15 }}
      />

      {/* Main orb button */}
      <motion.button
        onClick={onToggle}
        className="voice-orb relative w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center bg-primary shadow-lg shadow-primary/30"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ 
          scale: isActive ? volumeScale : 1,
        }}
        transition={{ 
          scale: { duration: 0.1 },
          type: 'spring', 
          stiffness: 300, 
          damping: 20 
        }}
      >
        {/* Wave visualization when speaking or listening with volume */}
        <AnimatePresence>
          {isActive && volume > 0.05 && (
            <motion.div 
              className="absolute inset-0 flex items-center justify-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {waveHeights.map((height, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 bg-primary-foreground/90 rounded-full"
                  animate={{ height }}
                  transition={{ duration: 0.1 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mic icon - always show Mic (no slash) */}
        <AnimatePresence>
          {(!isActive || volume <= 0.05) && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Mic className="w-10 h-10 md:w-12 md:h-12 text-primary-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* State label - only show when active and doing something */}
      <AnimatePresence>
        {showStatusLabel && (
          <motion.div
            className="absolute -bottom-10 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-sm font-medium text-muted-foreground capitalize">
              {state === 'thinking' && 'Connecting...'}
              {state === 'listening' && 'Listening...'}
              {state === 'speaking' && 'Speaking...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap to talk - only show when inactive */}
      <AnimatePresence>
        {!isActive && (
          <motion.div
            className="absolute -bottom-10 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-sm font-medium text-muted-foreground">
              Tap to talk
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
