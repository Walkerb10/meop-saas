import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, ArrowDown, GitBranch, Play, Zap } from 'lucide-react';
import { ScheduledAction, ScheduledActionStep } from '@/types/agent';
import { Button } from '@/components/ui/button';

interface ScheduledActionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  actions: ScheduledAction[];
}

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

export function ScheduledActionsPanel({ isOpen, onClose, actions }: ScheduledActionsPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 md:hidden"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-full md:w-96 bg-background border-r border-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Scheduled Actions</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Actions list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {actions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    No scheduled actions yet. Create automations by defining triggers and actions.
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {actions.map((action, index) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="rounded-xl border border-border bg-secondary/30 p-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-foreground">{action.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          action.isActive 
                            ? 'bg-green-400/10 text-green-400'
                            : 'bg-secondary text-muted-foreground'
                        }`}>
                          {action.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      {action.description && (
                        <p className="text-xs text-muted-foreground mb-3">{action.description}</p>
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
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
