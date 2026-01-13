import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Bot, Settings, Volume2 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VoiceInterface } from '@/components/VoiceInterface';
import { useRAGChat } from '@/hooks/useRAGChat';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { sendMessage } = useRAGChat();
  const { user } = useAuth();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      await sendMessage(content.trim());
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I've processed your request.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">MEOP Assistant</h1>
                <p className="text-xs text-muted-foreground">Always ready to help</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isVoiceMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                className="gap-2"
              >
                <Volume2 className="w-4 h-4" />
                <span className="hidden sm:inline">Voice</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isVoiceMode ? (
            /* Voice Mode - Main Interface */
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <h2 className="text-2xl font-semibold mb-2">Hey{user?.email ? `, ${user.email.split('@')[0]}` : ''}!</h2>
                <p className="text-muted-foreground">Tap to start talking</p>
              </motion.div>

              <VoiceInterface
                size="large"
                onSendMessage={async (message) => {
                  await handleSendMessage(message);
                  return messages[messages.length - 1]?.content || "Processing...";
                }}
              />

              {/* Recent Messages Preview */}
              {messages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 w-full max-w-md"
                >
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => setIsVoiceMode(false)}
                  >
                    View conversation ({messages.length} messages)
                  </Button>
                </motion.div>
              )}
            </div>
          ) : (
            /* Chat Mode - Text Interface */
            <>
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="max-w-3xl mx-auto space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                      <p className="text-muted-foreground text-sm">
                        Type a message or switch to voice mode
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence>
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
                              'max-w-[80%] rounded-2xl px-4 py-2.5',
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                  
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t border-border p-4 bg-background">
                <div className="max-w-3xl mx-auto flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={() => handleSendMessage(inputValue)}
                    disabled={!inputValue.trim() || isLoading}
                    size="icon"
                    className={cn(
                      'transition-all',
                      inputValue.trim() ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
