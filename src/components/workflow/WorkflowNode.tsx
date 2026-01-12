import { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, Webhook, Mic, Search, MessageSquare, Mail, Hash, Timer, 
  GitBranch, Sparkles, Trash2, CheckCircle2, Loader2, GripVertical
} from 'lucide-react';
import { WorkflowNode, WorkflowNodeType, NODE_STYLES } from '@/types/workflow';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ICONS: Record<WorkflowNodeType, React.ReactNode> = {
  trigger_schedule: <Clock className="w-4 h-4" />,
  trigger_webhook: <Webhook className="w-4 h-4" />,
  trigger_voice: <Mic className="w-4 h-4" />,
  action_research: <Search className="w-4 h-4" />,
  action_text: <MessageSquare className="w-4 h-4" />,
  action_email: <Mail className="w-4 h-4" />,
  action_slack: <Hash className="w-4 h-4" />,
  action_discord: <Hash className="w-4 h-4" />,
  action_delay: <Timer className="w-4 h-4" />,
  condition: <GitBranch className="w-4 h-4" />,
  transform: <Sparkles className="w-4 h-4" />,
};

const TYPE_LABELS: Record<WorkflowNodeType, string> = {
  trigger_schedule: 'Schedule',
  trigger_webhook: 'Webhook',
  trigger_voice: 'Voice',
  action_research: 'Research',
  action_text: 'Text',
  action_email: 'Email',
  action_slack: 'Slack',
  action_discord: 'Discord',
  action_delay: 'Delay',
  condition: 'Condition',
  transform: 'Transform',
};

interface WorkflowNodeProps {
  node: WorkflowNode;
  isSelected: boolean;
  isExecuting: boolean;
  isCompleted: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onStartConnection: () => void;
  onEndConnection: () => void;
  onDelete: () => void;
}

export const WorkflowNodeComponent = memo(function WorkflowNodeComponent({
  node,
  isSelected,
  isExecuting,
  isCompleted,
  onSelect,
  onDragStart,
  onStartConnection,
  onEndConnection,
  onDelete,
}: WorkflowNodeProps) {
  const style = NODE_STYLES[node.type];
  const isTrigger = node.type.startsWith('trigger_');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        'workflow-node absolute cursor-pointer select-none',
        'rounded-xl border-2 shadow-lg',
        'min-w-[240px] transition-all duration-150',
        style.bgColor,
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        isExecuting && 'ring-2 ring-primary animate-pulse',
        isCompleted && 'ring-2 ring-green-500'
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={onDragStart}
      onMouseUp={onEndConnection}
    >
      {/* Connection point - top (input) */}
      {!isTrigger && (
        <div 
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-background border-2 border-border hover:border-primary hover:bg-primary/20 transition-colors cursor-crosshair"
          onMouseUp={(e) => {
            e.stopPropagation();
            onEndConnection();
          }}
        />
      )}

      {/* Node content */}
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground">
            <GripVertical className="w-4 h-4" />
          </div>
          <div className={cn('p-1.5 rounded-lg', style.bgColor, style.color)}>
            {ICONS[node.type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {node.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {TYPE_LABELS[node.type]}
            </p>
          </div>
          
          {/* Status indicators */}
          {isExecuting && (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          )}
          {isCompleted && (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          )}
          
          {/* Delete button - only when selected */}
          {isSelected && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Config preview */}
        {node.config && Object.keys(node.config).length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground space-y-1">
              {node.config.query && (
                <p className="truncate">Query: {node.config.query}</p>
              )}
              {node.config.message && (
                <p className="truncate">Message: {node.config.message.substring(0, 30)}...</p>
              )}
              {node.config.schedule && (
                <p>Schedule: {node.config.schedule}</p>
              )}
              {node.config.time && (
                <p>Time: {node.config.time}</p>
              )}
              {node.config.delayMinutes && (
                <p>Delay: {node.config.delayMinutes} min</p>
              )}
              {node.config.channel && (
                <p>Channel: #{node.config.channel}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Connection point - bottom (output) */}
      <div 
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-background border-2 border-border hover:border-primary hover:bg-primary/20 transition-colors cursor-crosshair"
        onMouseDown={(e) => {
          e.stopPropagation();
          onStartConnection();
        }}
      />
    </motion.div>
  );
});
