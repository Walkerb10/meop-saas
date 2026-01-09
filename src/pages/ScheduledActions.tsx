import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowDown, GitBranch, Play, ListTodo, Menu, X, LayoutDashboard, CalendarClock, Settings, PanelLeftClose, PanelLeft } from 'lucide-react';
import { ScheduledAction, ScheduledActionStep, Task } from '@/types/agent';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { TasksPanel } from '@/components/TasksPanel';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: CalendarClock, label: 'Automations', path: '/scheduled-actions' },
  { icon: Clock, label: 'Executions', path: undefined },
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

function ActionStepNode({ step }: { step: ScheduledActionStep }) {
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
    <div className={`rounded-lg border p-3 ${getTypeColor()}`}>
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="text-sm font-medium text-foreground">{step.label}</span>
      </div>
      <span className="text-xs text-muted-foreground capitalize mt-1">{step.type}</span>
    </div>
  );
}

const ScheduledActions = () => {
  const [tasksOpen, setTasksOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
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

          <h1 className="text-lg font-semibold text-foreground">Automations</h1>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTasksOpen(true)}
            className="gap-2"
          >
            <ListTodo className="w-4 h-4" />
            <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
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
                {navItems.map((item) => (
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

              {/* Settings at bottom */}
              <div className="border-t border-border pt-4 mt-4">
                <button
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left w-full"
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-sm">Settings</span>
                </button>
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
          className="border-r border-border p-3 flex flex-col gap-2 overflow-hidden flex-shrink-0"
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

          {/* Settings at bottom */}
          <div className="mt-auto border-t border-border pt-3">
            <button
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left whitespace-nowrap w-full"
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {desktopSidebarOpen && <span className="text-sm">Settings</span>}
            </button>
          </div>
        </motion.aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${isMobile ? 'pt-20' : ''} pb-8 px-4`}>
        <div className="max-w-4xl mx-auto">
          {/* Desktop header with title and tasks */}
          {!isMobile && (
            <div className="flex items-center justify-between py-6">
              <h1 className="text-2xl font-bold text-foreground">Automations</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTasksOpen(true)}
                className="gap-2"
              >
                <ListTodo className="w-4 h-4" />
                Tasks
                <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  1
                </span>
              </Button>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {demoScheduledActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">{action.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    action.isActive 
                      ? 'bg-green-400/10 text-green-400'
                      : 'bg-secondary text-muted-foreground'
                  }`}>
                    {action.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {action.description && (
                  <p className="text-sm text-muted-foreground mb-4">{action.description}</p>
                )}
                
                {/* Steps visualization */}
                <div className="space-y-0">
                  {action.steps.map((step, stepIndex) => (
                    <div key={step.id}>
                      <ActionStepNode step={step} />
                      {stepIndex < action.steps.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
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