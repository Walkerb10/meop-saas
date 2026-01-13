import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Calendar,
  ChevronRight,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExecutions, ExecutionItem } from '@/hooks/useExecutions';
import { format, formatDistanceToNow } from 'date-fns';

function ExecutionCard({ execution, onClick }: { execution: ExecutionItem; onClick: () => void }) {
  const getStatusIcon = () => {
    switch (execution.status) {
      case 'running':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTimeLabel = () => {
    if (execution.type === 'upcoming') {
      const distance = formatDistanceToNow(execution.time, { addSuffix: true });
      return `${format(execution.time, 'h:mm a')} (${distance})`;
    }
    return formatDistanceToNow(execution.time, { addSuffix: true });
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-secondary/50 ${
        execution.status === 'running'
          ? 'border-primary/30 bg-primary/5'
          : execution.type === 'upcoming'
          ? 'border-border bg-secondary/30'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {getStatusIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate text-sm">
            {execution.name}
          </h3>
          <span className="text-xs text-muted-foreground">
            {getTimeLabel()}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </motion.button>
  );
}

export function ExecutionsPopover() {
  const navigate = useNavigate();
  const { recentExecutions, upcomingExecutions, loading } = useExecutions();

  const handleExecutionClick = (execution: ExecutionItem) => {
    if (execution.type === 'upcoming') {
      // For upcoming, go to the automation
      navigate(`/automations`);
    } else {
      // For recent, go to executions page
      navigate('/executions');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const hasContent = recentExecutions.length > 0 || upcomingExecutions.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
          <Zap className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">No executions yet</p>
        <p className="text-muted-foreground/60 text-xs mt-1">
          Run an automation to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upcoming section */}
      {upcomingExecutions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">
            <Calendar className="w-3 h-3" />
            <span>Upcoming</span>
          </div>
          <AnimatePresence mode="popLayout">
            {upcomingExecutions.map((execution) => (
              <ExecutionCard 
                key={execution.id} 
                execution={execution} 
                onClick={() => handleExecutionClick(execution)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Recent section */}
      {recentExecutions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">
            <Clock className="w-3 h-3" />
            <span>Recent</span>
          </div>
          <AnimatePresence mode="popLayout">
            {recentExecutions.map((execution) => (
              <ExecutionCard 
                key={execution.id} 
                execution={execution} 
                onClick={() => handleExecutionClick(execution)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* View all button */}
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full"
        onClick={() => navigate('/executions')}
      >
        View All Executions
      </Button>
    </div>
  );
}
