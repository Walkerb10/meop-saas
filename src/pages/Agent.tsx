import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Mic } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  const { 
    isActive, 
    status, 
    toggle, 
    inputVolume, 
    outputVolume, 
    sendMessage,
    startNewConversation 
  } = useVapiAgent({
    onTranscript: handleTranscript,
  });

  const aiState = mapStatusToState(status);
  const orbDocked = status === 'connecting' || isActive;

  // Track if conversation has started
  useEffect(() => {
    if (isActive) {
      setHasStarted(true);
    }
  }, [isActive]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Scroll the end marker into view
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  const handleToggle = () => {
    // Start animation immediately on click, don't wait for SDK
    if (!isActive) {
      setHasStarted(true);
    }
    toggle();
  };

  // Track pending message to send once call is active
  const pendingMessageRef = useRef<string | null>(null);

  // Send pending message once call becomes active
  useEffect(() => {
    if (isActive && pendingMessageRef.current) {
      const message = pendingMessageRef.current;
      pendingMessageRef.current = null;
      // Small delay to ensure Vapi is fully ready
      setTimeout(() => {
        sendMessage(message);
      }, 500);
    }
  }, [isActive, sendMessage]);

  const handleSendText = () => {
    if (!inputValue.trim()) return;
    
    if (isActive) {
      // Send to live Vapi session immediately
      sendMessage(inputValue);
    } else {
      // Queue the message and start the call
      pendingMessageRef.current = inputValue;
      setHasStarted(true);
      toggle();
    }
    setInputValue('');
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
    startNewConversation();
    if (isActive) {
      toggle();
    }
  };

  // Dictation handler
  const handleDictation = () => {
    if (!isActive) {
      setHasStarted(true);
      toggle();
    }
    inputRef.current?.focus();
  };

  return (
    <AppLayout 
      showNewChatButton={hasStarted} 
      onNewChat={handleNewChat}
    >
      <div className="flex flex-col h-full bg-background relative">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Voice Orb */}
          <motion.div
            layout
            className={cn(
              'flex flex-col items-center shrink-0',
              !hasStarted
                ? 'flex-1 justify-center -mt-10'
                : orbDocked
                  ? 'justify-start pt-6 pb-8'
                  : 'justify-center pt-10 pb-10'
            )}
            transition={{
              layout: {
                type: 'spring',
                stiffness: 70,
                damping: 22,
                mass: 1.15,
              },
            }}
          >
            {/* Tagline */}
            <AnimatePresence initial={false}>
              {!orbDocked && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={cn('text-center space-y-3', !hasStarted ? 'mb-10' : 'mb-6')}
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

            <VoiceOrb
              state={aiState}
              isActive={isActive}
              onToggle={handleToggle}
              inputVolume={inputVolume}
              outputVolume={outputVolume}
            />
          </motion.div>

          {/* Transcript display */}
          <AnimatePresence>
            {hasStarted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex-1 overflow-hidden px-4"
              >
                <div 
                  ref={scrollContainerRef}
                  className="h-full overflow-y-auto"
                >
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
                    {/* Scroll anchor - always at bottom */}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Input Bar */}
        <div className="sticky bottom-0 p-4 bg-background/80 backdrop-blur-sm border-t border-border">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type message...."
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
              
              {/* Dictation mic button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDictation}
                className={cn(
                  'shrink-0 h-8 w-8 transition-colors rounded-full',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Mic className="w-4 h-4" />
              </Button>
              
              {/* Send button */}
              <Button
                onClick={handleSendText}
                disabled={!inputValue.trim()}
                size="icon"
                variant="ghost"
                className={cn(
                  'shrink-0 h-8 w-8 transition-all rounded-full',
                  inputValue.trim() 
                    ? 'text-primary hover:text-primary hover:bg-primary/10' 
                    : 'text-muted-foreground'
                )}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
