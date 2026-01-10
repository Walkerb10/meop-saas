import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowDown, GitBranch, Play, Zap, ChevronRight, ArrowLeft } from 'lucide-react';
import { ScheduledAction, ScheduledActionStep } from '@/types/agent';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/AppLayout';

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
  const [selectedAutomation, setSelectedAutomation] = useState<ScheduledAction | null>(null);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {selectedAutomation && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedAutomation(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-semibold">
              {selectedAutomation ? selectedAutomation.name : 'Automations'}
            </h1>
            {!selectedAutomation && (
              <p className="text-sm text-muted-foreground mt-1">
                Manage your automated workflows
              </p>
            )}
          </div>
        </div>

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
    </AppLayout>
  );
};

export default ScheduledActions;
