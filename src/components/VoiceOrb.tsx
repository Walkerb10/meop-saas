import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Radio, Square } from 'lucide-react';
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
  const volumeScale = 1 + (volume * 0.15);
  
  // Number of wave bars based on volume
  const waveBarCount = 5;
  const waveHeights = Array.from({ length: waveBarCount }, (_, i) => {
    const baseHeight = 8;
    const maxExtraHeight = 28;
    const positionFactor = 1 - Math.abs(i - 2) * 0.2;
    return baseHeight + (volume * maxExtraHeight * positionFactor);
  });

  // Determine which icon to show based on state
  const getIcon = () => {
    if (!isActive) {
      // Not active - show mic (ready to start)
      return <Mic className="w-10 h-10 md:w-12 md:h-12 text-primary-foreground" />;
    }
    if (state === 'thinking') {
      // Connecting - show pulsing indicator
      return <Radio className="w-10 h-10 md:w-12 md:h-12 text-primary-foreground animate-pulse" />;
    }
    // Active call - show stop icon
    return <Square className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground fill-primary-foreground rounded-sm" />;
  };

  // Only show waves when there's volume
  const showWaves = isActive && volume > 0.05;

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
          {showWaves && (
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

        {/* Icon - changes based on state */}
        <AnimatePresence mode="wait">
          {!showWaves && (
            <motion.div
              key={isActive ? 'active' : 'inactive'}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {getIcon()}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* State label - centered below the orb */}
      <div className="absolute -bottom-14 w-full flex justify-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={!isActive ? 'tap' : state}
            className={`text-sm font-medium ${isActive && state !== 'thinking' ? 'text-primary' : 'text-muted-foreground'}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            {!isActive 
              ? 'Tap to talk' 
              : state === 'thinking' 
                ? 'Connecting...' 
                : state === 'speaking' 
                  ? 'Agent speaking' 
                  : 'Listening'}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
