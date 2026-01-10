import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Loader2, Calendar, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTasks, TaskItem } from '@/hooks/useTasks';
import { format, formatDistanceToNow } from 'date-fns';

interface TasksPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function TaskCard({ task }: { task: TaskItem }) {
  const getStatusIcon = () => {
    switch (task.status) {
      case 'processing':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = () => {
    switch (task.status) {
      case 'processing':
        return 'Processing';
      case 'scheduled':
        return 'Scheduled';
      default:
        return task.status;
    }
  };

  const getTimeLabel = () => {
    if (task.status === 'processing' && task.startedAt) {
      return `Started ${format(task.startedAt, 'h:mm a')}`;
    }
    if (task.status === 'scheduled' && task.scheduledTime) {
      const distance = formatDistanceToNow(task.scheduledTime, { addSuffix: true });
      return `${format(task.scheduledTime, 'h:mm a')} (${distance})`;
    }
    return '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`rounded-lg border p-3 ${
        task.status === 'processing'
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-secondary/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {getStatusIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate text-sm">
            {task.name}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              task.status === 'processing'
                ? 'bg-primary/10 text-primary'
                : 'bg-secondary text-muted-foreground'
            }`}>
              {getStatusLabel()}
            </span>
            <span className="text-xs text-muted-foreground">
              {getTimeLabel()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function TasksPanel({ isOpen, onClose }: TasksPanelProps) {
  const { tasks, loading } = useTasks();

  const processingTasks = tasks.filter(t => t.status === 'processing');
  const scheduledTasks = tasks.filter(t => t.status === 'scheduled');

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
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
                {processingTasks.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {processingTasks.length} active
                  </span>
                )}
              </div>
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
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    No active or upcoming tasks
                  </p>
                  <p className="text-muted-foreground/60 text-xs mt-1">
                    Tasks from the next 24 hours appear here
                  </p>
                </div>
              ) : (
                <>
                  {/* Processing section */}
                  {processingTasks.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Running Now</span>
                      </div>
                      <AnimatePresence mode="popLayout">
                        {processingTasks.map((task) => (
                          <TaskCard key={task.id} task={task} />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Scheduled section */}
                  {scheduledTasks.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        <Calendar className="w-3 h-3" />
                        <span>Next 24 Hours</span>
                      </div>
                      <AnimatePresence mode="popLayout">
                        {scheduledTasks.map((task) => (
                          <TaskCard key={task.id} task={task} />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
