import { useState, useCallback, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { DictationButton } from '@/components/DictationButton';
import { useUnifiedConversation } from '@/hooks/useUnifiedConversation';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceOrb } from '@/components/VoiceOrb';

const Index = () => {
  const [textInput, setTextInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleError = useCallback((error: string) => {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error,
    });
  }, [toast]);

  const {
    sessionId,
    messages,
    status,
    voiceModeEnabled,
    isVoiceCallActive,
    inputVolume,
    outputVolume,
    isLoading,
    sendTextMessage,
    toggleVoiceMode,
    startNewConversation,
    setVoiceModeEnabled,
  } = useUnifiedConversation({ onError: handleError });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasStartedChat = messages.length > 0 || isVoiceCallActive;
  const showTagline = !hasStartedChat;

  // Map status to VoiceOrb state
  const getOrbState = () => {
    if (status === 'connecting') return 'idle';
    if (status === 'listening') return 'listening';
    if (status === 'speaking') return 'speaking';
    if (status === 'thinking') return 'thinking';
    return 'idle';
  };

  const handleSendText = useCallback(async () => {
    if (!textInput.trim() || isLoading) return;
    const messageText = textInput.trim();
    setTextInput('');
    await sendTextMessage(messageText);
  }, [textInput, isLoading, sendTextMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }, [handleSendText]);

  const handleNewChat = useCallback(() => {
    startNewConversation();
  }, [startNewConversation]);

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
          {/* Top section - tagline and voice control */}
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

            {/* Voice Orb - tap to talk control */}
            <div className={hasStartedChat ? 'mb-4' : ''}>
              <VoiceOrb
                state={getOrbState()}
                isActive={isVoiceCallActive}
                onToggle={toggleVoiceMode}
                inputVolume={inputVolume}
                outputVolume={outputVolume}
              />
            </div>

            {/* Voice mode toggle */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                {voiceModeEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
                Voice replies
              </span>
              <Switch
                checked={voiceModeEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setVoiceModeEnabled(true);
                  } else {
                    // Turn off voice mode and stop any active call
                    if (isVoiceCallActive) {
                      toggleVoiceMode();
                    }
                    setVoiceModeEnabled(false);
                  }
                }}
              />
            </div>
            
            {/* Status text */}
            {hasStartedChat && messages.length === 0 && !isLoading && (
              <p className="text-muted-foreground text-sm">
                {isVoiceCallActive ? 'Listening...' : 'Start speaking or type a message...'}
              </p>
            )}
          </div>

          {/* Messages area */}
          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="max-w-2xl mx-auto space-y-4">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
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
                        <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          <p className="text-xs">
                            {format(msg.timestamp, 'h:mm a')}
                          </p>
                          {msg.source === 'voice' && (
                            <Mic className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* Loading indicator */}
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-secondary text-foreground rounded-2xl px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </motion.div>
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Bottom text input - always visible */}
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
                placeholder={isVoiceCallActive ? "Type to interrupt..." : "Enter message..."}
                disabled={isLoading && !isVoiceCallActive}
                className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
              <DictationButton
                onTranscript={(text) => setTextInput(prev => prev ? prev + ' ' + text : text)}
                disabled={isLoading && !isVoiceCallActive}
                className="shrink-0 h-8 w-8 rounded-full"
              />
              <Button 
                size="icon" 
                variant="ghost"
                onClick={handleSendText}
                disabled={!textInput.trim() || (isLoading && !isVoiceCallActive)}
                className={`shrink-0 h-8 w-8 rounded-full transition-all ${
                  textInput.trim() && !(isLoading && !isVoiceCallActive)
                    ? 'text-primary hover:bg-primary/10' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {isLoading && !isVoiceCallActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {/* Session indicator */}
            {sessionId && (
              <p className="text-center text-xs text-muted-foreground/50 mt-2">
                Session: {sessionId.substring(0, 8)}...
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
