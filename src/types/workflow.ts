export type WorkflowNodeType = 
  | 'trigger_schedule'
  | 'trigger_webhook'
  | 'trigger_voice'
  | 'trigger_manual'
  | 'action_research'
  | 'action_text'
  | 'action_email'
  | 'action_slack'
  | 'action_discord'
  | 'action_delay'
  | 'condition'
  | 'transform';

export interface WorkflowNodeConfig {
  // Trigger configs
  schedule?: string;
  cronExpression?: string;
  time?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
  dayOfWeek?: string;
  dayOfMonth?: string;
  webhookUrl?: string;

  // Research configs
  query?: string;
  outputFormat?: 'summary' | 'detailed' | 'bullets' | 'actionable' | 'problem';
  outputLength?: string;

  // Message configs
  message?: string;
  phone?: string;
  to?: string;
  subject?: string;
  channel?: string;

  // Delay config
  delayMinutes?: number;

  // Condition config
  condition?: string;
  operator?: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value?: string;

  // Transform config
  transform?: string;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  position: { x: number; y: number };
  config: WorkflowNodeConfig;
}

export interface WorkflowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastRunAt?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentNodeId?: string;
  completedNodeIds: string[];
  startedAt: string;
  completedAt?: string;
  results: Record<string, unknown>;
  error?: string;
}

// Node category groupings
export const NODE_CATEGORIES = {
  triggers: [
    { type: 'trigger_schedule' as const, label: 'Schedule', description: 'Run on a schedule' },
    { type: 'trigger_webhook' as const, label: 'Webhook', description: 'Trigger via HTTP' },
    { type: 'trigger_voice' as const, label: 'Voice Command', description: 'Trigger by voice' },
    { type: 'trigger_manual' as const, label: 'Manual', description: 'Run manually' },
  ],
  actions: [
    { type: 'action_research' as const, label: 'Research', description: 'AI-powered research' },
    { type: 'action_text' as const, label: 'Send Text', description: 'Send SMS message' },
    { type: 'action_email' as const, label: 'Send Email', description: 'Send email message' },
    { type: 'action_slack' as const, label: 'Slack', description: 'Post to Slack' },
    { type: 'action_discord' as const, label: 'Discord', description: 'Post to Discord' },
    { type: 'action_delay' as const, label: 'Delay', description: 'Wait before continuing' },
  ],
  logic: [
    { type: 'condition' as const, label: 'Condition', description: 'Branch based on condition' },
    { type: 'transform' as const, label: 'Transform', description: 'Transform data' },
  ],
} as const;

// Node styling by type
export const NODE_STYLES: Record<WorkflowNodeType, { icon: string; color: string; bgColor: string }> = {
  trigger_schedule: { icon: 'Clock', color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  trigger_webhook: { icon: 'Webhook', color: 'text-purple-500', bgColor: 'bg-purple-500/10 border-purple-500/30' },
  trigger_voice: { icon: 'Mic', color: 'text-pink-500', bgColor: 'bg-pink-500/10 border-pink-500/30' },
  trigger_manual: { icon: 'Play', color: 'text-slate-500', bgColor: 'bg-slate-500/10 border-slate-500/30' },
  action_research: { icon: 'Search', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10 border-emerald-500/30' },
  action_text: { icon: 'MessageSquare', color: 'text-green-500', bgColor: 'bg-green-500/10 border-green-500/30' },
  action_email: { icon: 'Mail', color: 'text-orange-500', bgColor: 'bg-orange-500/10 border-orange-500/30' },
  action_slack: { icon: 'Hash', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  action_discord: { icon: 'Hash', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10 border-indigo-500/30' },
  action_delay: { icon: 'Timer', color: 'text-gray-500', bgColor: 'bg-gray-500/10 border-gray-500/30' },
  condition: { icon: 'GitBranch', color: 'text-amber-500', bgColor: 'bg-amber-500/10 border-amber-500/30' },
  transform: { icon: 'Sparkles', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10 border-cyan-500/30' },
};
