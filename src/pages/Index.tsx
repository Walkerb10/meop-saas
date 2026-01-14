import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentVoiceButton } from '@/components/AgentVoiceButton';
import { AppLayout } from '@/components/AppLayout';
import { DictationButton } from '@/components/DictationButton';
import { useVapiAgent } from '@/hooks/useVapiAgent';
import { useRAGChat } from '@/hooks/useRAGChat';
import { Message } from '@/types/agent';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

// Generate a unique conversation ID for this session
const generateConversationId = () => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [conversationId, setConversationId] = useState(() => generateConversationId());
  const [isSendingText, setIsSendingText] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // RAG chat for text input
  const { 
    messages: ragMessages, 
    isLoading: ragLoading, 
    sendMessage: sendRAGMessage,
    clearMessages: clearRAGMessages 
  } = useRAGChat();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync RAG messages to local state
  useEffect(() => {
    if (ragMessages.length > 0) {
      setMessages(ragMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })));
      if (!hasStartedChat) {
        setHasStartedChat(true);
      }
    }
  }, [ragMessages, hasStartedChat]);

  const handleTranscript = useCallback((text: string, role: 'user' | 'assistant') => {
    setMessages((prev) => {
      // If last message is from the same speaker, append to it
      if (prev.length > 0 && prev[prev.length - 1].role === role) {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        updated[updated.length - 1] = {
          ...lastMsg,
          content: lastMsg.content + ' ' + text,
          timestamp: new Date(),
        };
        return updated;
      }
      // Otherwise create a new message
      return [
        ...prev,
        {
          id: Date.now().toString(),
          role,
          content: text,
          timestamp: new Date(),
        },
      ];
    });
  }, []);

  const handleError = useCallback(
    (error: string) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error,
      });
    },
    [toast]
  );

  const { status, isActive, toggle, stop, inputVolume, outputVolume } = useVapiAgent({
    onTranscript: handleTranscript,
    onError: handleError,
    conversationId,
  });

  // Track when chat has started
  useEffect(() => {
    if (isActive && !hasStartedChat) {
      setHasStartedChat(true);
    }
  }, [isActive, hasStartedChat]);

  const handleNewChat = useCallback(() => {
    // Stop current conversation if active
    if (isActive) {
      stop();
    }
    // Clear messages and reset state with new conversation ID
    setMessages([]);
    clearRAGMessages();
    setHasStartedChat(false);
    setConversationId(generateConversationId());
  }, [isActive, stop, clearRAGMessages]);

  const handleSendText = useCallback(async () => {
    if (!textInput.trim() || isSendingText) return;
    
    setIsSendingText(true);
    const messageText = textInput.trim();
    setTextInput('');
    
    try {
      await sendRAGMessage(messageText);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message',
      });
    } finally {
      setIsSendingText(false);
    }
  }, [textInput, isSendingText, sendRAGMessage, toast]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }, [handleSendText]);

  

  // Show tagline only if we haven't started a chat yet
  const showTagline = !hasStartedChat;

  const isLoading = ragLoading || isSendingText;

  return (
    <AppLayout 
      showNewChatButton={hasStartedChat}
      onNewChat={handleNewChat}
    >
      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.08), transparent 50%)',
          }}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top section - tagline and mic */}
          <div className="flex flex-col items-center pt-8">
            {/* Tagline - only shows before first chat */}
            {showTagline && (
              <div className="text-center space-y-1 max-w-md px-4 mb-8">
                <p className="text-xl md:text-2xl font-semibold text-foreground">
                  Speak your problem.
                </p>
                <p className="text-xl md:text-2xl font-semibold text-foreground">
                  Agents handle it.
                </p>
                <p className="text-xl md:text-2xl font-semibold text-foreground">
                  Start to finish.
                </p>
              </div>
            )}

            {/* Voice button - stays connected during conversation */}
            <div className={hasStartedChat ? 'mb-6' : ''}>
              <AgentVoiceButton 
                status={status} 
                isActive={isActive} 
                onToggle={toggle}
                size={hasStartedChat ? 'small' : 'normal'}
                inputVolume={inputVolume}
                outputVolume={outputVolume}
              />
            </div>
            
            {/* Start speaking hint */}
            {hasStartedChat && messages.length === 0 && !isLoading && (
              <p className="text-muted-foreground text-sm mt-2">
                Start speaking or type a message...
              </p>
            )}
          </div>

          {/* Messages area - shows when we have messages */}
          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="max-w-2xl mx-auto space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {format(msg.timestamp, 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary text-foreground rounded-2xl px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Bottom text input */}
        <div className="p-4 bg-background/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <div 
              className={`relative flex items-center bg-secondary/50 rounded-full border transition-all duration-300 px-4 ${
                inputFocused 
                  ? 'border-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]' 
                  : 'border-border'
              }`}
            >
              <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={handleKeyPress}
                placeholder="Enter message..."
                disabled={isLoading}
                className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
              <DictationButton
                onTranscript={(text) => setTextInput(prev => prev ? prev + ' ' + text : text)}
                disabled={isLoading}
                className="shrink-0 h-8 w-8 rounded-full"
              />
              <Button 
                size="icon" 
                variant="ghost"
                onClick={handleSendText}
                disabled={!textInput.trim() || isLoading}
                className={`shrink-0 h-8 w-8 rounded-full transition-all ${
                  textInput.trim() && !isLoading
                    ? 'text-primary hover:bg-primary/10' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {isLoading ? (
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
};

export default Index;
