export type AIState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface ScheduledActionStep {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  label: string;
  config?: Record<string, unknown>;
}

// Follow-up action configuration for chaining (e.g., after research, send to Slack)
export interface FollowUpAction {
  id: string;
  platform: 'text' | 'email' | 'slack' | 'discord';
  enabled: boolean;
  // Platform-specific config
  message?: string; // Can include {{result}} placeholder
  channel?: string; // For slack/discord
  emailTo?: string;
  emailSubject?: string;
}

export interface ScheduledAction {
  id: string;
  name: string;
  description?: string;
  steps: ScheduledActionStep[];
  followUpActions?: FollowUpAction[];
  isActive: boolean;
  createdAt: Date;
}
