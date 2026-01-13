import { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, Webhook, Mic, Search, MessageSquare, Mail, Hash, Timer, 
  GitBranch, Sparkles, Trash2, CheckCircle2, Loader2, GripVertical, Edit3, Play
} from 'lucide-react';
import { WorkflowNode, WorkflowNodeType, NODE_STYLES } from '@/types/workflow';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getNodeDescription } from '@/components/AutomationSummary';

const ICONS: Record<WorkflowNodeType, React.ReactNode> = {
  trigger_schedule: <Clock className="w-4 h-4" />,
  trigger_webhook: <Webhook className="w-4 h-4" />,
  trigger_voice: <Mic className="w-4 h-4" />,
  trigger_manual: <Play className="w-4 h-4" />,
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
  trigger_schedule: 'When',
  trigger_webhook: 'Trigger',
  trigger_voice: 'Listen',
  trigger_manual: 'Manual',
  action_research: 'Research',
  action_text: 'Text',
  action_email: 'Email',
  action_slack: 'Slack',
  action_discord: 'Discord',
  action_delay: 'Wait',
  condition: 'Check',
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
  const description = getNodeDescription(node);

  // Fixed node dimensions for consistent connection alignment
  const NODE_WIDTH = 260;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        'workflow-node absolute cursor-pointer select-none',
        'rounded-2xl border-2 shadow-xl backdrop-blur-sm',
        'transition-all duration-150',
        style.bgColor,
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-primary/20',
        isExecuting && 'ring-2 ring-primary animate-pulse shadow-primary/30',
        isCompleted && 'ring-2 ring-green-500 shadow-green-500/20'
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: NODE_WIDTH,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={onDragStart}
      onMouseUp={onEndConnection}
    >
      {/* Connection point - top (input) - centered precisely */}
      {!isTrigger && (
        <div 
          className="absolute -top-3 w-5 h-5 rounded-full bg-background border-2 border-border hover:border-primary hover:bg-primary/20 transition-all hover:scale-110 cursor-crosshair shadow-sm"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
          onMouseUp={(e) => {
            e.stopPropagation();
            onEndConnection();
          }}
        />
      )}

      {/* Node content */}
      <div className="p-4">
        {/* Header with type badge */}
        <div className="flex items-start gap-3">
          <div className="cursor-grab active:cursor-grabbing p-1 -ml-1 -mt-1 text-muted-foreground/50 hover:text-muted-foreground">
            <GripVertical className="w-4 h-4" />
          </div>
          
          <div className={cn('p-2.5 rounded-xl shrink-0', style.bgColor, style.color)}>
            {ICONS[node.type]}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={cn('text-[10px] font-bold uppercase tracking-wider', style.color)}>
                {TYPE_LABELS[node.type]}
              </span>
              {/* Status indicators */}
              {isExecuting && (
                <Loader2 className="w-3 h-3 text-primary animate-spin" />
              )}
              {isCompleted && (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              )}
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug">
              {node.label}
            </p>
          </div>
          
          {/* Actions - only when selected */}
          {isSelected && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  // Select triggers config panel focus
                }}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Human-readable description */}
        <div className="mt-3 pt-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        
        {/* Quick edit hint */}
        {isSelected && (
          <div className="mt-2 text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <Edit3 className="w-3 h-3" />
            Click to edit in the panel →
          </div>
        )}
      </div>

      {/* Connection point - bottom (output) - centered precisely */}
      <div 
        className="absolute -bottom-3 w-5 h-5 rounded-full bg-background border-2 border-border hover:border-primary hover:bg-primary/20 transition-all hover:scale-110 cursor-crosshair shadow-sm"
        style={{ left: '50%', transform: 'translateX(-50%)' }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onStartConnection();
        }}
      />
    </motion.div>
  );
});
