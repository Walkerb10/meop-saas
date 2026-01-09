import { motion } from 'framer-motion';
import { Clock, ArrowDown, GitBranch, Play, ListTodo, ArrowLeft } from 'lucide-react';
import { ScheduledAction, ScheduledActionStep, Task } from '@/types/agent';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { TasksPanel } from '@/components/TasksPanel';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 p-4 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <h1 className="text-lg font-semibold text-foreground">Scheduled Actions</h1>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTasksOpen(true)}
            className="gap-2"
          >
            <ListTodo className="w-4 h-4" />
            Tasks
            <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
              1
            </span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
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
