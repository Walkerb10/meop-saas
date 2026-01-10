import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AgentVoiceButton } from '@/components/AgentVoiceButton';
import { useElevenLabsAgent } from '@/hooks/useElevenLabsAgent';
import { Message, Task, ScheduledAction } from '@/types/agent';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  LayoutDashboard,
  User,
  Clock,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  CalendarClock,
  Settings,
  ListTodo,
  FileSpreadsheet,
  FileText,
  Send,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: CalendarClock, label: 'Automations', path: '/scheduled-actions' },
  { icon: Clock, label: 'Executions', path: '/executions' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

// Demo-only data (kept here to match the current demo approach)
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

const demoTask: Task = {
  id: '1',
  title: 'Lead won → send onboarding sequence',
  status: 'in_progress',
  createdAt: new Date(),
};

const demoTaskMeta = {
  whatsGettingDone:
    'Creating a scheduled action that triggers when a CRM lead is marked “Won”, then sends onboarding.',
  demoSteps: [
    'Trigger: CRM lead status changes to Won',
    'Action: Send onboarding form (Google Sheet)',
    'Action: Send intro video + checklist (Notion doc)',
  ],
  technicalNotes: [
    'Google Sheet: Onboarding Form (shared link)',
    'Notion: “Customer Onboarding – Intro Video” document',
  ],
} as const;

function TasksPopoverContent() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Tasks</h3>
        <span className="text-xs text-muted-foreground">1 active</span>
      </div>

      <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0 animate-pulse" />
          <div className="min-w-0">
            <p className="text-sm text-foreground font-medium">{demoTask.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{demoTaskMeta.whatsGettingDone}</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Demo steps</p>
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
            {demoTaskMeta.demoSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Technical notes</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="w-4 h-4" />
              <span>{demoTaskMeta.technicalNotes[0]}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>{demoTaskMeta.technicalNotes[1]}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [textInput, setTextInput] = useState('');
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleTranscript = useCallback((text: string, role: 'user' | 'assistant') => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role,
        content: text,
        timestamp: new Date(),
      },
    ]);
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

  const { status, isActive, toggle } = useElevenLabsAgent({
    onTranscript: handleTranscript,
    onError: handleError,
  });

  return (
    <div className="min-h-screen flex">
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
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <nav className="flex flex-col gap-2 flex-1">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setSidebarOpen(false);
                      if (item.path) navigate(item.path);
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

      {/* Desktop Left Sidebar - full height */}
      {!isMobile && (
        <motion.aside
          initial={false}
          animate={{ width: desktopSidebarOpen ? 200 : 56 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="border-r border-border p-3 flex flex-col gap-2 overflow-hidden h-screen"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
            className="mb-4 self-start"
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
              onClick={() => item.path && navigate(item.path)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left whitespace-nowrap"
              title={!desktopSidebarOpen ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {desktopSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-sm overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ))}
        </motion.aside>
      )}

      {/* Right side content with top bar */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="h-14 px-4 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border">
          {/* Left side - hamburger on mobile */}
          {isMobile ? (
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </Button>
          ) : (
            <div />
          )}

          {/* Right side - Tasks button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <ListTodo className="w-4 h-4" />
                Tasks
                <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  1
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 md:w-96">
              <TasksPopoverContent />
            </PopoverContent>
          </Popover>
        </header>

        {/* Center - Voice Button */}
        <main className="flex-1 flex flex-col relative">
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.08), transparent 50%)',
            }}
          />

          {/* Main content area */}
          <div className="flex-1 flex items-center justify-center">
            <motion.div 
              className="relative flex flex-col items-center justify-center gap-8"
              animate={{ 
                y: isActive ? -80 : 0 
              }}
              transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            >
              {/* Logo tagline - hidden when active */}
              <AnimatePresence>
                {!isActive && (
                  <motion.div 
                    className="text-center space-y-1 max-w-md px-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-xl md:text-2xl font-semibold text-foreground">
                      Speak your problem.
                    </p>
                    <p className="text-xl md:text-2xl font-semibold text-foreground">
                      Agents handle it.
                    </p>
                    <p className="text-xl md:text-2xl font-semibold text-foreground">
                      Start to finish.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AgentVoiceButton status={status} isActive={isActive} onToggle={toggle} />
            </motion.div>
          </div>

          {/* Bottom text input */}
          <div className="p-4 border-t border-border bg-background/80 backdrop-blur-sm">
            <div className="max-w-2xl mx-auto flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-secondary/50"
              />
              <Button size="icon" variant="default" className="shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
