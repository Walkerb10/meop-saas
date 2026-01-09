import { motion } from 'framer-motion';
import { ListTodo, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from './StatusIndicator';
import { AIState } from '@/types/agent';

interface HeaderProps {
  aiState: AIState;
  onOpenTasks: () => void;
  onOpenSequences: () => void;
  taskCount: number;
  sequenceCount: number;
}

export function Header({ 
  aiState, 
  onOpenTasks, 
  onOpenSequences,
  taskCount,
  sequenceCount 
}: HeaderProps) {
  return (
    <motion.header 
      className="fixed top-0 left-0 right-0 z-30 p-4"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Sequences button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSequences}
          className="glass hover:bg-secondary gap-2"
        >
          <GitBranch className="w-4 h-4" />
          <span className="hidden sm:inline">Sequences</span>
          {sequenceCount > 0 && (
            <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
              {sequenceCount}
            </span>
          )}
        </Button>

        {/* Status indicator */}
        <StatusIndicator state={aiState} />

        {/* Tasks button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenTasks}
          className="glass hover:bg-secondary gap-2"
        >
          <ListTodo className="w-4 h-4" />
          <span className="hidden sm:inline">Tasks</span>
          {taskCount > 0 && (
            <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
              {taskCount}
            </span>
          )}
        </Button>
      </div>
    </motion.header>
  );
}
