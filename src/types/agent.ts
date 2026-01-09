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

export interface SequenceStep {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  label: string;
  config?: Record<string, unknown>;
}

export interface Sequence {
  id: string;
  name: string;
  description?: string;
  steps: SequenceStep[];
  isActive: boolean;
  createdAt: Date;
}
