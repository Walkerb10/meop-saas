import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Mic, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [isSendingText, setIsSendingText] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastRoleRef = useRef<'user' | 'assistant' | null>(null);
  
  // Track Vapi Chat API chat ID for text-only continuity
  const chatIdRef = useRef<string | null>(null);

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
    startNewConversation,
    conversationId
  } = useVapiAgent({
    onTranscript: handleTranscript,
  });

  const aiState = mapStatusToState(status);

  // Track if conversation has started and sync connecting state
  useEffect(() => {
    if (isActive) {
      setHasStarted(true);
      setIsConnecting(false);
    }
    if (status === 'idle' && isConnecting) {
      // If we were connecting but now idle, connection failed or ended
      setIsConnecting(false);
    }
  }, [isActive, status, isConnecting]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Scroll the end marker into view
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  const handleToggle = () => {
    // Start animation and loading immediately on click, don't wait for SDK
    if (!isActive) {
      // Set both states synchronously BEFORE any async work
      setIsConnecting(true);
      setHasStarted(true);
      
      // Use setTimeout to ensure state updates are flushed before toggle
      setTimeout(() => {
        // Pass previous messages to resume conversation with context
        const previousMessages = messages.flatMap(m => 
          m.lines.map(line => ({ role: m.role, content: line }))
        );
        toggle(previousMessages);
      }, 0);
    } else {
      toggle();
    }
  };

  // Send text via Vapi Chat API (text-only mode, no voice call)
  const sendTextMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setIsSendingText(true);
    
    // Show user message immediately
    handleTranscript(text, 'user');
    
    try {
      const { data, error } = await supabase.functions.invoke('vapi-chat', {
        body: {
          message: text,
          previousChatId: chatIdRef.current,
          sessionId: conversationId,
        },
      });

      if (error) {
        console.error('Text chat error:', error);
        toast.error('Failed to send message');
        return;
      }

      // Store chat ID for conversation continuity
      if (data?.id) {
        chatIdRef.current = data.id;
      }

      // Show assistant response
      if (data?.output) {
        handleTranscript(data.output, 'assistant');
      }
    } catch (err) {
      console.error('Text chat error:', err);
      toast.error('Failed to send message');
    } finally {
      setIsSendingText(false);
    }
  }, [conversationId, handleTranscript]);

  const handleSendText = () => {
    if (!inputValue.trim() || isSendingText) return;
    
    if (isActive) {
      // Voice mode active - inject into live Vapi call
      sendMessage(inputValue);
    } else {
      // Voice mode inactive - use text-only API
      setHasStarted(true);
      sendTextMessage(inputValue);
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
    chatIdRef.current = null; // Reset text chat continuity
    startNewConversation();
    if (isActive) {
      toggle();
    }
  };

  // Dictation handler - only works when voice mode is inactive
  const handleDictation = () => {
    if (isActive) return; // Don't allow dictation during active voice call
    
    setHasStarted(true);
    // Pass previous messages to resume conversation with context
    const previousMessages = messages.flatMap(m => 
      m.lines.map(line => ({ role: m.role, content: line }))
    );
    toggle(previousMessages);
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
          {/* Voice Orb - stays docked at top once conversation starts */}
          <motion.div
            layout
            className={cn(
              'flex flex-col items-center shrink-0',
              !hasStarted
                ? 'flex-1 justify-center -mt-10'
                : 'justify-start pt-6 pb-6'
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
            {/* Tagline - only show before conversation starts */}
            <AnimatePresence initial={false}>
              {!hasStarted && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="text-center space-y-3 mb-10"
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
              isConnecting={isConnecting || status === 'connecting'}
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
                    {messages.map((message) => (
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
                    ))}
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
              
              {/* Dictation mic button - disabled while voice mode active */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDictation}
                disabled={isActive}
                className={cn(
                  'shrink-0 h-8 w-8 transition-colors rounded-full',
                  isActive 
                    ? 'text-muted-foreground/50 cursor-not-allowed' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title={isActive ? 'Dictation unavailable during voice call' : 'Start voice mode'}
              >
                <Mic className="w-4 h-4" />
              </Button>
              
              {/* Send button */}
              <Button
                onClick={handleSendText}
                disabled={!inputValue.trim() || isSendingText}
                size="icon"
                variant="ghost"
                className={cn(
                  'shrink-0 h-8 w-8 transition-all rounded-full',
                  inputValue.trim() && !isSendingText
                    ? 'text-primary hover:text-primary hover:bg-primary/10' 
                    : 'text-muted-foreground'
                )}
              >
                {isSendingText ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
