import { motion } from 'framer-motion';

export function VoiceSettings() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-lg font-semibold mb-2">Voice Settings</h2>
        <p className="text-sm text-muted-foreground">
          Voice configuration is managed in your Vapi dashboard.
        </p>
      </div>
    </motion.div>
  );
}