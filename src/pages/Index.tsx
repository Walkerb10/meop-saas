import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { VoiceButton } from '@/components/VoiceButton';
import { VoiceSelector } from '@/components/VoiceSelector';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { Message, Task } from '@/types/agent';
import { useToast } from '@/hooks/use-toast';
import { LayoutDashboard, GitBranch, MessageSquare, User, CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: GitBranch, label: 'Sequences' },
  { icon: MessageSquare, label: 'Conversations' },
  { icon: User, label: 'User info' },
];

const Index = () => {
  const [selectedVoice, setSelectedVoice] = useState('Sarah');
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks] = useState<Task[]>([
    { id: '1', title: 'first task', status: 'pending', createdAt: new Date() },
    { id: '2', title: 'second task', status: 'pending', createdAt: new Date() },
  ]);
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

  const getStatusIcon = (taskStatus: Task['status']) => {
    switch (taskStatus) {
      case 'pending':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar - Navigation */}
      <aside className="w-48 border-r border-border p-4 flex flex-col gap-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left"
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </aside>

      {/* Center - Voice Button */}
      <main className="flex-1 flex flex-col items-center justify-center relative">
        {/* Voice selector at top */}
        <div className="absolute top-4">
          <VoiceSelector 
            selectedVoice={selectedVoice} 
            onVoiceChange={setSelectedVoice}
            disabled={isActive}
          />
        </div>

        {/* Ambient glow */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.08), transparent 50%)',
          }}
        />

        <VoiceButton 
          status={status}
          isActive={isActive}
          onToggle={toggle}
        />
      </main>

      {/* Right Sidebar - Tasks */}
      <aside className="w-64 border-l border-border p-4 flex flex-col">
        <h2 className="text-lg font-semibold text-foreground mb-4">Tasks</h2>
        <div className="flex-1 space-y-2">
          {tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              {getStatusIcon(task.status)}
              <span>{index + 1}. {task.title}</span>
            </motion.div>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default Index;
