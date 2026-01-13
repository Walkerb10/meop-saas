import { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, Search, MessageSquare, Mail, Hash, Timer, ArrowDown,
  CheckCircle2, Sparkles, Mic, Webhook
} from 'lucide-react';
import { WorkflowNode, WorkflowNodeType } from '@/types/workflow';
import { cn } from '@/lib/utils';

const STEP_ICONS: Record<WorkflowNodeType, React.ElementType> = {
  trigger_schedule: Clock,
  trigger_webhook: Webhook,
  trigger_voice: Mic,
  action_research: Search,
  action_text: MessageSquare,
  action_email: Mail,
  action_slack: Hash,
  action_discord: Hash,
  action_delay: Timer,
  condition: Sparkles,
  transform: Sparkles,
};

const STEP_COLORS: Record<WorkflowNodeType, string> = {
  trigger_schedule: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  trigger_webhook: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  trigger_voice: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
  action_research: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  action_text: 'bg-green-500/10 text-green-500 border-green-500/30',
  action_email: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  action_slack: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  action_discord: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
  action_delay: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
  condition: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  transform: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
};

// Generate a human-readable description for a node
export function getNodeDescription(node: WorkflowNode): string {
  const config = node.config || {};
  
  switch (node.type) {
    case 'trigger_schedule': {
      const freq = String(config.frequency || 'daily');
      const time = String(config.time || '9:00 AM');
      if (freq === 'hourly') return 'Every hour';
      if (freq === 'weekly') return `Every ${config.dayOfWeek || 'Monday'} at ${time}`;
      return `Every day at ${time}`;
    }
    case 'trigger_webhook':
      return 'When webhook is triggered';
    case 'trigger_voice':
      return 'When voice command received';
    case 'action_research':
      return config.query ? `Research "${config.query.substring(0, 50)}${config.query.length > 50 ? '...' : ''}"` : 'Perform research';
    case 'action_text':
      return config.to ? `Send text to ${config.to}` : 'Send text message';
    case 'action_email':
      return config.to ? `Email ${config.to}` : 'Send email';
    case 'action_slack':
      return config.channel ? `Post to Slack #${config.channel}` : 'Post to Slack';
    case 'action_discord':
      return config.channel ? `Post to Discord #${config.channel}` : 'Post to Discord';
    case 'action_delay':
      return config.delayMinutes ? `Wait ${config.delayMinutes} minutes` : 'Wait';
    case 'condition':
      return 'Check condition';
    case 'transform':
      return 'Transform data';
    default:
      return node.label;
  }
}

// Generate summary text for entire workflow
export function generateWorkflowSummary(nodes: WorkflowNode[]): string {
  if (nodes.length === 0) return 'No steps yet';

  // Sort by Y position to get flow order
  const sorted = [...nodes].sort((a, b) => a.position.y - b.position.y);

  const parts: string[] = [];

  for (const node of sorted) {
    parts.push(getNodeDescription(node));
  }

  return parts.join(' → ');
}

interface AutomationSummaryProps {
  nodes: WorkflowNode[];
  compact?: boolean;
  className?: string;
}

export const AutomationSummary = memo(function AutomationSummary({
  nodes,
  compact = false,
  className,
}: AutomationSummaryProps) {
  // Sort by Y position to get flow order
  const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
  
  if (sortedNodes.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground italic', className)}>
        No steps configured
      </p>
    );
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
        {sortedNodes.map((node, index) => {
          const Icon = STEP_ICONS[node.type];
          return (
            <div key={node.id} className="flex items-center gap-1">
              <div className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border',
                STEP_COLORS[node.type]
              )}>
                <Icon className="w-3 h-3" />
                <span className="font-medium">{node.label}</span>
              </div>
              {index < sortedNodes.length - 1 && (
                <ArrowDown className="w-3 h-3 text-muted-foreground rotate-[-90deg]" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {sortedNodes.map((node, index) => {
        const Icon = STEP_ICONS[node.type];
        const description = getNodeDescription(node);
        
        return (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start gap-3"
          >
            {/* Step number with connector */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border-2',
                STEP_COLORS[node.type]
              )}>
                <span className="text-xs font-bold">{index + 1}</span>
              </div>
              {index < sortedNodes.length - 1 && (
                <div className="w-0.5 h-6 bg-border mt-1" />
              )}
            </div>
            
            {/* Step content */}
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2">
                <Icon className={cn('w-4 h-4', STEP_COLORS[node.type].split(' ')[1])} />
                <span className="font-medium text-sm text-foreground">{node.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});

// Quick preview for list cards
interface StepPreviewProps {
  nodes: WorkflowNode[];
  maxSteps?: number;
}

export const StepPreview = memo(function StepPreview({ nodes, maxSteps = 3 }: StepPreviewProps) {
  const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
  const displayNodes = sortedNodes.slice(0, maxSteps);
  const remaining = sortedNodes.length - maxSteps;

  if (sortedNodes.length === 0) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-6 h-6 rounded-full bg-secondary text-muted-foreground flex items-center justify-center">
          <Search className="w-3 h-3" />
        </div>
        <div className="w-6 h-6 rounded-full bg-secondary text-muted-foreground flex items-center justify-center">
          <MessageSquare className="w-3 h-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {displayNodes.map((node, index) => {
        const Icon = STEP_ICONS[node.type];
        return (
          <div key={node.id} className="flex items-center">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center',
              STEP_COLORS[node.type]
            )}>
              <Icon className="w-3 h-3" />
            </div>
            {index < displayNodes.length - 1 && (
              <div className="w-2 h-0.5 bg-border" />
            )}
          </div>
        );
      })}
      {remaining > 0 && (
        <span className="text-xs text-muted-foreground ml-1">+{remaining}</span>
      )}
    </div>
  );
});
