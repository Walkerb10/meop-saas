import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { VoiceButton } from '@/components/VoiceButton';
import { VoiceSelector } from '@/components/VoiceSelector';
import { useElevenLabsConversation } from '@/hooks/useElevenLabsConversation';
import { Message } from '@/types/agent';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [agentId, setAgentId] = useState('');
  const [inputAgentId, setInputAgentId] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Sarah');
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();

  const handleMessage = useCallback((msg: { role: 'user' | 'assistant'; content: string }) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: msg.role,
      content: msg.content,
      timestamp: new Date(),
    }]);
  }, []);

  const handleError = useCallback((error: string) => {
    toast({
      variant: 'destructive',
      title: 'Connection Error',
      description: error,
    });
  }, [toast]);

  const { status, isSpeaking, startConversation, stopConversation } = useElevenLabsConversation({
    agentId,
    onMessage: handleMessage,
    onError: handleError,
  });

  const handleToggle = useCallback(() => {
    if (status === 'connected') {
      stopConversation();
    } else if (status === 'disconnected') {
      startConversation();
    }
  }, [status, startConversation, stopConversation]);

  const handleSetAgent = () => {
    if (inputAgentId.trim()) {
      setAgentId(inputAgentId.trim());
    }
  };

  // If no agent ID set, show setup screen
  if (!agentId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div 
          className="w-full max-w-md space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Voice Agent Setup</h1>
            <p className="text-muted-foreground">Enter your ElevenLabs Agent ID to start</p>
          </div>
          
          <div className="space-y-4">
            <Input
              placeholder="Enter Agent ID..."
              value={inputAgentId}
              onChange={(e) => setInputAgentId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetAgent()}
              className="text-center"
            />
            <Button 
              onClick={handleSetAgent} 
              className="w-full"
              disabled={!inputAgentId.trim()}
            >
              Connect Agent
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Create an agent at{' '}
            <a 
              href="https://elevenlabs.io/app/conversational-ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              ElevenLabs
            </a>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Ambient glow */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 70%, hsl(175 80% 50% / 0.08), transparent 50%)',
        }}
      />

      {/* Header with voice selector */}
      <header className="fixed top-0 left-0 right-0 z-10 p-4 flex justify-center">
        <VoiceSelector 
          selectedVoice={selectedVoice} 
          onVoiceChange={setSelectedVoice}
          disabled={status === 'connected'}
        />
      </header>

      {/* Transcript area */}
      <main className="flex-1 flex flex-col items-center pt-20 pb-64 px-4 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-4">
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
          isSpeaking={isSpeaking}
          onToggle={handleToggle}
        />
      </motion.div>

      {/* Bottom gradient fade */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, hsl(220 20% 4%), transparent)',
        }}
      />
    </div>
  );
};

export default Index;
