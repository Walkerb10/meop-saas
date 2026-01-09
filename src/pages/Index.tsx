import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceButton } from '@/components/VoiceButton';
import { VoiceSelector } from '@/components/VoiceSelector';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { Message, Task, ScheduledAction } from '@/types/agent';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  LayoutDashboard, 
  GitBranch, 
  MessageSquare, 
  User, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  AlertCircle,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { CalendarClock } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: CalendarClock, label: 'Scheduled Actions', path: '/scheduled-actions' },
  { icon: MessageSquare, label: 'Conversations', path: undefined },
  { icon: User, label: 'User info', path: undefined },
];

const demoScheduledActions: ScheduledAction[] = [
  {
    id: '1',
    name: 'Short Form Content Maker',
    description: 'Daily AI news content generation',
    isActive: true,
    createdAt: new Date(),
    steps: [
      { id: '1-1', type: 'trigger', label: '8:00 AM Daily' },
      { id: '1-2', type: 'action', label: 'Fetch AI News' },
      { id: '1-3', type: 'action', label: 'Generate Short Form Content' },
      { id: '1-4', type: 'action', label: 'Post to Social Channels' },
    ],
  },
  {
    id: '2',
    name: 'Lead Pipeline Updated',
    description: 'CRM lead won automation',
    isActive: true,
    createdAt: new Date(),
    steps: [
      { id: '2-1', type: 'trigger', label: 'CRM Lead Status → Won' },
      { id: '2-2', type: 'condition', label: 'Check Lead Type' },
      { id: '2-3', type: 'action', label: 'Send Onboarding Form' },
      { id: '2-4', type: 'action', label: 'Notify Account Manager' },
    ],
  },
];

const Index = () => {
  const [selectedVoice, setSelectedVoice] = useState('Sarah');
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks] = useState<Task[]>([
    { id: '1', title: 'first task', status: 'pending', createdAt: new Date() },
    { id: '2', title: 'second task', status: 'pending', createdAt: new Date() },
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const isMobile = useIsMobile();
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
      {/* Mobile Header with Hamburger */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
          <VoiceSelector 
            selectedVoice={selectedVoice} 
            onVoiceChange={setSelectedVoice}
            disabled={isActive}
          />
          <div className="w-10" /> {/* Spacer for centering */}
        </header>
      )}

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-border z-50 p-4 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Menu</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setSidebarOpen(false);
                      if (item.path) window.location.href = item.path;
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Left Sidebar - Navigation */}
      {!isMobile && (
        <motion.aside
          initial={false}
          animate={{ width: desktopSidebarOpen ? 192 : 56 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="border-r border-border p-3 flex flex-col gap-2 overflow-hidden"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
            className="mb-4 self-end"
          >
            {desktopSidebarOpen ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <PanelLeft className="w-5 h-5" />
            )}
          </Button>
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => item.path && (window.location.href = item.path)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left whitespace-nowrap"
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {desktopSidebarOpen && <span className="text-sm">{item.label}</span>}
            </button>
          ))}
        </motion.aside>
      )}

      {/* Center - Voice Button */}
      <main className={`flex-1 flex flex-col items-center justify-center relative ${isMobile ? 'pt-16' : ''}`}>
        {/* Voice selector at top (desktop only) */}
        {!isMobile && (
          <div className="absolute top-4">
            <VoiceSelector 
              selectedVoice={selectedVoice} 
              onVoiceChange={setSelectedVoice}
              disabled={isActive}
            />
          </div>
        )}

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

      {/* Right Sidebar - Tasks (desktop only) */}
      {!isMobile && (
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
      )}
    </div>
  );
};

export default Index;
