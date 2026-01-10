import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowDown, GitBranch, Play, Menu, X, LayoutDashboard, CalendarClock, Settings, PanelLeftClose, PanelLeft, Zap, ChevronRight, ArrowLeft, User, MessageSquare } from 'lucide-react';
import { ScheduledAction, ScheduledActionStep, Task } from '@/types/agent';
import { Button } from '@/components/ui/button';
import { TasksPanel } from '@/components/TasksPanel';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

const mainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: CalendarClock, label: 'Automations', path: '/scheduled-actions' },
  { icon: Clock, label: 'Executions', path: '/executions' },
  { icon: MessageSquare, label: 'Conversations', path: '/conversations' },
];

const bottomNavItems = [
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
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

const demoTask: Task = {
  id: '1',
  title: 'Create Slack KPI Meeting Reminder',
  description: 'Create a scheduled action to notify the team in Slack every Thursday at 4 PM for KPI meeting',
  status: 'pending',
  createdAt: new Date(),
};

function ActionStepNode({ step, isFirst }: { step: ScheduledActionStep; isFirst: boolean }) {
  const getIcon = () => {
    switch (step.type) {
      case 'trigger':
        return <Clock className="w-4 h-4 text-primary" />;
      case 'condition':
        return <GitBranch className="w-4 h-4 text-yellow-400" />;
      case 'action':
        return <Play className="w-4 h-4 text-green-400" />;
    }
  };

  const getTypeColor = () => {
    switch (step.type) {
      case 'trigger':
        return 'border-primary/30 bg-primary/5';
      case 'condition':
        return 'border-yellow-400/30 bg-yellow-400/5';
      case 'action':
        return 'border-green-400/30 bg-green-400/5';
    }
  };

  return (
    <div className="flex flex-col items-center">
      {!isFirst && (
        <div className="flex flex-col items-center py-2">
          <div className="w-px h-4 bg-border" />
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className={`rounded-lg border p-4 w-full ${getTypeColor()}`}>
        <div className="flex items-center gap-3">
          {getIcon()}
          <div>
            <span className="text-sm font-medium text-foreground">{step.label}</span>
            <p className="text-xs text-muted-foreground capitalize">{step.type}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const ScheduledActions = () => {
  const [tasksOpen, setTasksOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [selectedAutomation, setSelectedAutomation] = useState<ScheduledAction | null>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Header with Hamburger */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>

          <h1 className="text-lg font-semibold text-foreground">
            {selectedAutomation ? selectedAutomation.name : 'Automations'}
          </h1>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTasksOpen(true)}
            className="gap-1"
          >
            <span className="text-sm">Tasks</span>
            <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
              1
            </span>
          </Button>
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
                {mainNavItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setSidebarOpen(false);
                      if (item.path) navigate(item.path);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                      item.path === '/scheduled-actions'
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </nav>

              {/* Settings and Profile at bottom */}
              <div className="border-t border-border pt-4 mt-4 space-y-2">
                {bottomNavItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setSidebarOpen(false);
                      if (item.path) navigate(item.path);
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left w-full"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
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
          className="border-r border-border p-3 flex flex-col gap-2 overflow-hidden flex-shrink-0 h-screen"
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

          {mainNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() => item.path && navigate(item.path)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left whitespace-nowrap ${
                item.path === '/scheduled-actions'
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {desktopSidebarOpen && <span className="text-sm">{item.label}</span>}
            </button>
          ))}

          {/* Settings and Profile at bottom */}
          <div className="mt-auto border-t border-border pt-3 space-y-2">
            {bottomNavItems.map((item) => (
              <button
                key={item.label}
                onClick={() => item.path && navigate(item.path)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left whitespace-nowrap w-full"
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {desktopSidebarOpen && <span className="text-sm">{item.label}</span>}
              </button>
            ))}
          </div>
        </motion.aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${isMobile ? 'pt-20' : ''} pb-8 px-4 overflow-y-auto`}>
        <div className="max-w-3xl mx-auto">
          {/* Desktop header with title and tasks */}
          {!isMobile && (
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center gap-3">
                {selectedAutomation && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedAutomation(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                )}
                <h1 className="text-2xl font-bold text-foreground">
                  {selectedAutomation ? selectedAutomation.name : 'Automations'}
                </h1>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTasksOpen(true)}
                className="gap-2"
              >
              Tasks
              <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                1
              </span>
              </Button>
            </div>
          )}

          {/* Mobile back button */}
          {isMobile && selectedAutomation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedAutomation(null)}
              className="mb-4 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Automations
            </Button>
          )}

          <AnimatePresence mode="wait">
            {!selectedAutomation ? (
              /* Automations List View */
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {demoScheduledActions.map((action, index) => (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedAutomation(action)}
                    className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-card/80 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{action.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                            action.isActive 
                              ? 'bg-green-400/10 text-green-400'
                              : 'bg-secondary text-muted-foreground'
                          }`}>
                            {action.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {action.description && (
                          <p className="text-sm text-muted-foreground">{action.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {action.steps.length} steps • Trigger: {action.steps[0]?.label}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-4" />
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              /* Sequence Detail View */
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Status and description */}
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedAutomation.isActive 
                      ? 'bg-green-400/10 text-green-400'
                      : 'bg-secondary text-muted-foreground'
                  }`}>
                    {selectedAutomation.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {selectedAutomation.description && (
                    <p className="text-sm text-muted-foreground">{selectedAutomation.description}</p>
                  )}
                </div>

                {/* Sequence visualization */}
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Sequence Flow</h3>
                  <div className="space-y-0">
                    {selectedAutomation.steps.map((step, index) => (
                      <ActionStepNode key={step.id} step={step} isFirst={index === 0} />
                    ))}
                  </div>
                </div>

                {/* Test button */}
                <Button 
                  className="w-full gap-2"
                  onClick={() => {
                    console.log('Testing automation:', selectedAutomation.name);
                  }}
                >
                  <Zap className="w-4 h-4" />
                  Test Automation
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Tasks Panel */}
      <TasksPanel 
        isOpen={tasksOpen} 
        onClose={() => setTasksOpen(false)} 
        tasks={[demoTask]} 
      />
    </div>
  );
};

export default ScheduledActions;
