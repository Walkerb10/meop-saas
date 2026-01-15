import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, Square } from 'lucide-react';
import { AIState } from '@/types/agent';

interface VoiceOrbProps {
  state: AIState;
  isActive: boolean;
  isConnecting?: boolean;
  onToggle: () => void;
  inputVolume?: number;
  outputVolume?: number;
}

export function VoiceOrb({ state, isActive, isConnecting = false, onToggle, inputVolume = 0, outputVolume = 0 }: VoiceOrbProps) {
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
    // Connecting - show spinner
    if (isConnecting) {
      return <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-primary-foreground animate-spin" />;
    }

    // Not active - show mic
    if (!isActive) {
      return <Mic className="w-10 h-10 md:w-12 md:h-12 text-primary-foreground" />;
    }

    // Active call with no volume - show stop icon
    return <Square className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground fill-primary-foreground rounded-sm" />;
  };

  // Only show waves when there's volume and not connecting
  const showWaves = isActive && !isConnecting && volume > 0.05;

  return (
    <div className="relative flex flex-col items-center justify-center">

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

      {/* State label - single line, never overlaps transcript */}
      <motion.div
        className="mt-3 flex h-5 w-full items-center justify-center"
        initial={false}
        animate={{ opacity: 1 }}
      >
        <span className="text-xs font-medium tracking-wide text-primary-foreground">
          {isConnecting
            ? 'Connecting…'
            : isActive
              ? (state === 'speaking' ? 'Speaking' : 'Listening')
              : 'Tap to talk'}
        </span>
      </motion.div>
    </div>
  );
}
