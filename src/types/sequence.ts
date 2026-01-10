export interface SequenceStep {
  id: string;
  type: 'action' | 'condition' | 'delay';
  label: string;
  config?: Record<string, unknown>;
}

export interface Sequence {
  id: string;
  name: string;
  description?: string;
  n8nWebhookUrl?: string;
  steps: SequenceStep[];
  createdAt: Date;
  updatedAt: Date;
}
