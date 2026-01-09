import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { VoiceButton } from '@/components/VoiceButton';
import { VoiceSelector } from '@/components/VoiceSelector';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { Message } from '@/types/agent';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [selectedVoice, setSelectedVoice] = useState('Sarah');
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();

  const handleTranscript = useCallback((text: string, role: 'user' | 'assistant') => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role,
      content: text,
      timestamp: new Date(),
    }]);
  }, []);

  const handleError = useCallback((error: string) => {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error,
    });
  }, [toast]);

  const { status, isActive, toggle } = useVoiceChat({
    voiceId: selectedVoice,
    onTranscript: handleTranscript,
    onError: handleError,
  });

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Ambient glow */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 70%, hsl(var(--primary) / 0.08), transparent 50%)',
        }}
      />

      {/* Header with voice selector */}
      <header className="fixed top-0 left-0 right-0 z-10 p-4 flex justify-center">
        <VoiceSelector 
          selectedVoice={selectedVoice} 
          onVoiceChange={setSelectedVoice}
          disabled={isActive}
        />
      </header>

      {/* Transcript area */}
      <main className="flex-1 flex flex-col items-center pt-20 pb-64 px-4 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-4">
          {messages.length === 0 && (
            <motion.p 
              className="text-center text-muted-foreground mt-32"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Tap the button below to start talking
            </motion.p>
          )}
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]' 
                  : 'bg-card border border-border mr-auto max-w-[80%]'
              }`}
            >
              {msg.content}
            </motion.div>
          ))}
        </div>
      </main>

      {/* Central voice button */}
      <motion.div 
        className="fixed bottom-16 left-1/2 -translate-x-1/2 z-20"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        <VoiceButton 
          status={status}
          isActive={isActive}
          onToggle={toggle}
        />
      </motion.div>

      {/* Bottom gradient fade */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, hsl(var(--background)), transparent)',
        }}
      />
    </div>
  );
};

export default Index;
