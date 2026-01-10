import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowDown, GitBranch, Play, Zap, ChevronRight, ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { ScheduledAction, ScheduledActionStep } from '@/types/agent';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/AppLayout';
import { useAutomations } from '@/hooks/useAutomations';
import { toast } from 'sonner';

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
  const [executing, setExecuting] = useState(false);
  const { automations, loading, executeAutomation, deleteAutomation } = useAutomations();

  const handleExecute = async () => {
    if (!selectedAutomation) return;
    
    setExecuting(true);
    try {
      await executeAutomation(selectedAutomation.id);
      toast.success('Automation executed successfully');
    } catch (err) {
      toast.error('Failed to execute automation');
    } finally {
      setExecuting(false);
    }
  };

  const handleDelete = async (automationId: string) => {
    try {
      await deleteAutomation(automationId);
      setSelectedAutomation(null);
      toast.success('Automation deleted');
    } catch (err) {
      toast.error('Failed to delete automation');
    }
  };

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
          <div className="flex-1">
            <h1 className="text-xl font-semibold">
              {selectedAutomation ? selectedAutomation.name : 'Automations'}
            </h1>
            {!selectedAutomation && (
              <p className="text-sm text-muted-foreground mt-1">
                Manage your automated workflows
              </p>
            )}
          </div>
          {selectedAutomation && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(selectedAutomation.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          )}
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
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : automations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    No automations yet. Talk to the agent to create one!
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try saying: "Create a sequence to text me daily at 9am with the weather"
                  </p>
                </div>
              ) : (
                automations.map((action, index) => (
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
                          {action.steps.length} steps{action.steps[0] && ` • Trigger: ${action.steps[0].label}`}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-4" />
                    </div>
                  </motion.button>
                ))
              )}
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
              {selectedAutomation.steps.length > 0 ? (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Sequence Flow</h3>
                  <div className="space-y-0">
                    {selectedAutomation.steps.map((step, index) => (
                      <ActionStepNode key={step.id} step={step} isFirst={index === 0} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <p className="text-sm text-muted-foreground">No steps defined for this automation</p>
                </div>
              )}

              {/* Test button */}
              <Button 
                className="w-full gap-2"
                onClick={handleExecute}
                disabled={executing}
              >
                {executing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {executing ? 'Executing...' : 'Execute Automation'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default ScheduledActions;
