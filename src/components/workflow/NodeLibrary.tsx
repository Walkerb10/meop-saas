import { 
  Clock, Webhook, Mic, Search, MessageSquare, Mail, Hash, Timer, 
  GitBranch, Sparkles, Play
} from 'lucide-react';
import { WorkflowNodeType, NODE_CATEGORIES, NODE_STYLES } from '@/types/workflow';
import { cn } from '@/lib/utils';

interface NodeLibraryProps {
  onDragStart: (type: WorkflowNodeType) => void;
}

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

export function NodeLibrary({ onDragStart }: NodeLibraryProps) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Triggers */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Triggers
        </h3>
        <div className="space-y-2">
          {NODE_CATEGORIES.triggers.map((node) => (
            <NodeItem
              key={node.type}
              type={node.type}
              label={node.label}
              description={node.description}
              icon={ICONS[node.type]}
              onDragStart={() => onDragStart(node.type)}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Actions
        </h3>
        <div className="space-y-2">
          {NODE_CATEGORIES.actions.map((node) => (
            <NodeItem
              key={node.type}
              type={node.type}
              label={node.label}
              description={node.description}
              icon={ICONS[node.type]}
              onDragStart={() => onDragStart(node.type)}
            />
          ))}
        </div>
      </div>

      {/* Logic */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Logic
        </h3>
        <div className="space-y-2">
          {NODE_CATEGORIES.logic.map((node) => (
            <NodeItem
              key={node.type}
              type={node.type}
              label={node.label}
              description={node.description}
              icon={ICONS[node.type]}
              onDragStart={() => onDragStart(node.type)}
            />
          ))}
        </div>
      </div>

      {/* Help text */}
      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Drag nodes to the canvas to build your workflow. Connect nodes by dragging from output to input.
        </p>
      </div>
    </div>
  );
}

function NodeItem({ 
  type, 
  label, 
  description, 
  icon, 
  onDragStart 
}: { 
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  onDragStart: () => void;
}) {
  const style = NODE_STYLES[type];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('nodeType', type);
        onDragStart();
      }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border cursor-grab active:cursor-grabbing',
        'transition-all duration-150 hover:shadow-md',
        'bg-card hover:bg-accent/50',
        style.bgColor
      )}
    >
      <div className={cn('p-2 rounded-lg', style.bgColor, style.color)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </div>
  );
}
