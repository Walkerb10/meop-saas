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
} from 'lucide-react';
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
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const selectedVoice = localStorage.getItem('selectedVoice') || 'Sarah';

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
      {/* Mobile Header with Hamburger */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>

          {/* Tasks button in mobile header */}
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
            <PopoverContent align="end" className="w-80">
              <TasksPopoverContent />
            </PopoverContent>
          </Popover>
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

      {/* Desktop Left Sidebar - Fixed icon bar + expandable nav */}
      {!isMobile && (
        <div className="flex border-r border-border">
          {/* Fixed icon bar - always visible */}
          <div className="w-14 p-3 flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
              className="mb-4"
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
                onClick={() => {
                  if (!desktopSidebarOpen) setDesktopSidebarOpen(true);
                  if (item.path) navigate(item.path);
                }}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title={item.label}
              >
                <item.icon className="w-5 h-5" />
              </button>
            ))}
          </div>

          {/* Expandable sidebar content */}
          <AnimatePresence>
            {desktopSidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 160, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="overflow-hidden"
              >
                <div className="p-3 pt-16 flex flex-col gap-2 w-40">
                  {navItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => item.path && navigate(item.path)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left whitespace-nowrap"
                    >
                      <span className="text-sm">{item.label}</span>
                    </button>
                  ))}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Center - Voice Button */}
      <main className={`flex-1 flex flex-col items-center justify-center relative ${isMobile ? 'pt-16' : ''}`}>
        {/* Desktop Tasks button - top right area, below header */}
        {!isMobile && (
          <div className="absolute top-6 right-6">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ListTodo className="w-4 h-4" />
                  Tasks
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    1
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96">
                <TasksPopoverContent />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.08), transparent 50%)',
          }}
        />

        <div className="relative flex flex-col items-center justify-center gap-8">
          {/* Logo tagline */}
          <div className="text-center space-y-2 max-w-md px-4">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
              Speak your problem.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Agents handle it. Start to finish.
            </p>
          </div>

          <AgentVoiceButton status={status} isActive={isActive} onToggle={toggle} />
        </div>
      </main>
    </div>
  );
};

export default Index;
