import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { VoiceOrb } from '@/components/VoiceOrb';
import { Header } from '@/components/Header';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { TasksPanel } from '@/components/TasksPanel';
import { SequencesPanel } from '@/components/SequencesPanel';
import { AIState, Message, Task, Sequence } from '@/types/agent';

// Demo data for UI prototype
const demoTasks: Task[] = [
  {
    id: '1',
    title: 'Research competitor analysis',
    description: 'Analyze top 5 competitors in the market',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '2',
    title: 'Create presentation slides',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: '3',
    title: 'Send email summary',
    status: 'completed',
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
    completedAt: new Date(Date.now() - 1000 * 60 * 45),
  },
];

const demoSequences: Sequence[] = [
  {
    id: '1',
    name: 'Daily Report',
    isActive: true,
    createdAt: new Date(),
    steps: [
      { id: '1a', type: 'trigger', label: 'Every day at 9 AM' },
      { id: '1b', type: 'action', label: 'Gather metrics' },
      { id: '1c', type: 'action', label: 'Send report email' },
    ],
  },
  {
    id: '2',
    name: 'New Lead Flow',
    isActive: true,
    createdAt: new Date(),
    steps: [
      { id: '2a', type: 'trigger', label: 'New lead received' },
      { id: '2b', type: 'condition', label: 'If score > 80' },
      { id: '2c', type: 'action', label: 'Assign to sales' },
    ],
  },
];

const demoMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hey! I\'m ready to help. What would you like me to do?',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '2',
    role: 'user',
    content: 'Can you research our top competitors?',
    timestamp: new Date(Date.now() - 1000 * 60 * 4),
  },
  {
    id: '3',
    role: 'assistant',
    content: 'On it! I\'ve started a background task to research your top competitors. I\'ll analyze their market position, features, and pricing. This might take a few minutes.',
    timestamp: new Date(Date.now() - 1000 * 60 * 3),
  },
];

const Index = () => {
  const [aiState, setAiState] = useState<AIState>('idle');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isSequencesOpen, setIsSequencesOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(demoMessages);
  const [tasks] = useState<Task[]>(demoTasks);
  const [sequences] = useState<Sequence[]>(demoSequences);

  const handleVoiceToggle = useCallback(() => {
    setIsVoiceActive((prev) => {
      if (!prev) {
        // Starting voice
        setAiState('listening');
        // Simulate state changes for demo
        setTimeout(() => setAiState('thinking'), 2000);
        setTimeout(() => {
          setAiState('speaking');
          // Add demo response
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'I heard you! This is a demo response. In the real version, I\'ll process your request in real-time.',
            timestamp: new Date(),
          }]);
        }, 3000);
        setTimeout(() => setAiState('listening'), 5000);
        return true;
      } else {
        // Stopping voice
        setAiState('idle');
        return false;
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Ambient glow effect */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 60%, hsl(175 80% 50% / 0.05), transparent 50%)',
        }}
      />

      <Header 
        aiState={aiState}
        onOpenTasks={() => setIsTasksOpen(true)}
        onOpenSequences={() => setIsSequencesOpen(true)}
        taskCount={tasks.filter(t => t.status !== 'completed').length}
        sequenceCount={sequences.filter(s => s.isActive).length}
      />

      {/* Main content area */}
      <main className="flex-1 flex flex-col pt-20 pb-64 md:pb-72">
        <TranscriptPanel messages={messages} />
      </main>

      {/* Voice orb - fixed at bottom center */}
      <motion.div 
        className="fixed bottom-12 md:bottom-16 left-1/2 -translate-x-1/2 z-20"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
      >
        <VoiceOrb 
          state={aiState}
          isActive={isVoiceActive}
          onToggle={handleVoiceToggle}
        />
      </motion.div>

      {/* Gradient fade at bottom */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, hsl(220 20% 4%), transparent)',
        }}
      />

      {/* Panels */}
      <TasksPanel 
        isOpen={isTasksOpen}
        onClose={() => setIsTasksOpen(false)}
        tasks={tasks}
      />

      <SequencesPanel 
        isOpen={isSequencesOpen}
        onClose={() => setIsSequencesOpen(false)}
        sequences={sequences}
      />
    </div>
  );
};

export default Index;
