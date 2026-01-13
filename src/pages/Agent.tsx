import { useState, useEffect, useRef, useCallback } from 'react';
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

interface TranscriptMessage {
  id: string;
  lines: string[];
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
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastRoleRef = useRef<'user' | 'assistant' | null>(null);

  // Handle incoming transcripts - consolidate same speaker messages
  const handleTranscript = useCallback((text: string, role: 'user' | 'assistant') => {
    setMessages(prev => {
      // If same role as last message, append to existing message
      if (prev.length > 0 && prev[prev.length - 1].role === role) {
        const updated = [...prev];
        const lastMsg = { ...updated[updated.length - 1] };
        lastMsg.lines = [...lastMsg.lines, text];
        updated[updated.length - 1] = lastMsg;
        return updated;
      }
      
      // New speaker, create new message
      return [...prev, {
        id: crypto.randomUUID(),
        lines: [text],
        role,
        timestamp: new Date()
      }];
    });
    lastRoleRef.current = role;
  }, []);

  const { isActive, status, toggle, inputVolume, outputVolume } = useVapiAgent({
    onTranscript: handleTranscript,
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
    // Use requestAnimationFrame to ensure scroll happens after render
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [messages]);

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
    setMessages([]);
    lastRoleRef.current = null;
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
                  className="text-center mb-12 space-y-3"
                >
                  <p className="text-xl md:text-3xl font-light text-foreground tracking-wide">
                    Speak your problem.
                  </p>
                  <p className="text-xl md:text-3xl font-light text-foreground tracking-wide">
                    Agents handle it.
                  </p>
                  <p className="text-xl md:text-3xl font-light text-foreground tracking-wide">
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

          {/* Transcript display - below the orb with proper spacing */}
          <AnimatePresence>
            {hasStarted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto', flex: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex-1 overflow-hidden px-4 mt-4"
              >
                <ScrollArea className="h-full" ref={scrollRef}>
                  <div className="max-w-2xl mx-auto space-y-4 py-4 pb-8">
                    {messages.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center text-muted-foreground text-sm py-8"
                      >
                        {isActive ? 'Listening...' : 'Tap the mic to start talking'}
                      </motion.div>
                    ) : (
                      messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            'flex gap-3',
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {message.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Bot className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={cn(
                              'max-w-[80%] rounded-2xl px-4 py-3',
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            )}
                          >
                            {/* Render each line, with line breaks between them */}
                            <div className="text-sm space-y-1">
                              {message.lines.map((line, idx) => (
                                <p key={idx} className="whitespace-pre-wrap">{line}</p>
                              ))}
                            </div>
                          </div>
                          {message.role === 'user' && (
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
