import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VoiceOrb } from '@/components/VoiceOrb';
import { useVapiAgent, AgentStatus } from '@/hooks/useVapiAgent';
import { cn } from '@/lib/utils';
import { AIState } from '@/types/agent';

interface TranscriptItem {
  text: string;
  role: 'user' | 'assistant';
}

// Map AgentStatus to AIState for the VoiceOrb
const mapStatusToState = (status: AgentStatus): AIState => {
  switch (status) {
    case 'speaking':
      return 'speaking';
    case 'listening':
      return 'listening';
    case 'connecting':
      return 'thinking';
    default:
      return 'idle';
  }
};

export default function AgentPage() {
  const [inputValue, setInputValue] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isActive, status, toggle } = useVapiAgent({
    onTranscript: (text, role) => {
      setTranscript(prev => [...prev, { text, role }]);
    },
  });

  const aiState = mapStatusToState(status);

  // Track if conversation has started
  useEffect(() => {
    if (isActive || transcript.length > 0) {
      setHasStarted(true);
    }
  }, [isActive, transcript]);

  const handleToggle = () => {
    toggle();
  };

  const handleSendText = () => {
    if (!inputValue.trim()) return;
    // Text input - for now just clear (voice is primary)
    setInputValue('');
    setHasStarted(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-background relative">
        {/* Main Content - Centered */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Tagline - Only show when not started */}
          <AnimatePresence>
            {!hasStarted && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.4 }}
                className="text-center mb-12"
              >
                <p className="text-xl md:text-2xl font-medium text-foreground leading-relaxed">
                  Speak your problem.
                </p>
                <p className="text-xl md:text-2xl font-medium text-foreground leading-relaxed">
                  Agents handle it.
                </p>
                <p className="text-xl md:text-2xl font-medium text-foreground leading-relaxed">
                  Start to finish.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Voice Orb */}
          <VoiceOrb
            state={aiState}
            isActive={isActive}
            onToggle={handleToggle}
          />

          {/* Transcript display when active */}
          <AnimatePresence>
            {hasStarted && transcript.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 w-full max-w-lg space-y-3"
              >
                {transcript.slice(-4).map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'rounded-2xl px-4 py-3 text-sm',
                      item.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-8'
                        : 'bg-muted text-foreground mr-8'
                    )}
                  >
                    {item.text}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Input Bar */}
        <div className="sticky bottom-0 p-4 bg-background/80 backdrop-blur-sm border-t border-border">
          <div className="max-w-2xl mx-auto flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-muted/50"
            />
            <Button
              onClick={handleSendText}
              disabled={!inputValue.trim()}
              size="icon"
              className={cn(
                'transition-all',
                inputValue.trim() ? 'bg-primary hover:bg-primary/90' : 'bg-muted text-muted-foreground'
              )}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
