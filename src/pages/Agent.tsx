import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VoiceOrb } from '@/components/VoiceOrb';
import { useVapiAgent, AgentStatus } from '@/hooks/useVapiAgent';
import { cn } from '@/lib/utils';
import { AIState } from '@/types/agent';

interface TranscriptItem {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  timestamp: Date;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isActive, status, toggle, inputVolume, outputVolume } = useVapiAgent({
    onTranscript: (text, role) => {
      setTranscript(prev => [...prev, { 
        id: crypto.randomUUID(),
        text, 
        role,
        timestamp: new Date()
      }]);
    },
  });

  const aiState = mapStatusToState(status);

  // Track if conversation has started
  useEffect(() => {
    if (isActive) {
      setHasStarted(true);
    }
  }, [isActive]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleToggle = () => {
    toggle();
  };

  const handleSendText = () => {
    if (!inputValue.trim()) return;
    // For now, start voice if not active
    if (!isActive) {
      toggle();
    }
    setInputValue('');
    setHasStarted(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleNewChat = () => {
    setHasStarted(false);
    setTranscript([]);
    if (isActive) {
      toggle();
    }
  };

  return (
    <AppLayout 
      showNewChatButton={hasStarted} 
      onNewChat={handleNewChat}
    >
      <div className="flex flex-col h-full bg-background relative">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Voice Orb - animates to top when started */}
          <motion.div
            className={cn(
              "flex flex-col items-center justify-center",
              hasStarted ? "py-6" : "flex-1"
            )}
            layout
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            {/* Tagline - Only show when not started */}
            <AnimatePresence>
              {!hasStarted && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40, transition: { duration: 0.2 } }}
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

            {/* Voice Orb with volume visualization */}
            <VoiceOrb
              state={aiState}
              isActive={isActive}
              onToggle={handleToggle}
              inputVolume={inputVolume}
              outputVolume={outputVolume}
            />
          </motion.div>

          {/* Transcript display - takes remaining space when started */}
          <AnimatePresence>
            {hasStarted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto', flex: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex-1 overflow-hidden px-4"
              >
                <ScrollArea className="h-full" ref={scrollRef}>
                  <div className="max-w-2xl mx-auto space-y-4 py-4">
                    {transcript.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center text-muted-foreground text-sm py-8"
                      >
                        {isActive ? 'Listening...' : 'Tap the mic to start talking'}
                      </motion.div>
                    ) : (
                      transcript.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            'flex gap-3',
                            item.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {item.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Bot className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={cn(
                              'max-w-[80%] rounded-2xl px-4 py-3',
                              item.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">{item.text}</p>
                          </div>
                          {item.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                </ScrollArea>
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
