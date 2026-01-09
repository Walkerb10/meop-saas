import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Clock, Loader2, AlertCircle, Plus } from 'lucide-react';
import { Task } from '@/types/agent';
import { Button } from '@/components/ui/button';

interface TasksPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
}

export function TasksPanel({ isOpen, onClose, tasks }: TasksPanelProps) {
  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
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

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'Running';
      case 'completed':
        return 'Done';
      case 'failed':
        return 'Failed';
    }
  };

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
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-96 glass-strong z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Tasks list */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <Plus className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    No tasks yet. Tell me what to do!
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {tasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="task-card"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getStatusIcon(task.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate">
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              task.status === 'completed' 
                                ? 'bg-green-400/10 text-green-400'
                                : task.status === 'in_progress'
                                ? 'bg-primary/10 text-primary'
                                : task.status === 'failed'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-secondary text-muted-foreground'
                            }`}>
                              {getStatusLabel(task.status)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {task.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
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
