export type SequenceStepType = 'research' | 'text' | 'email' | 'slack' | 'discord' | 'delay';

export interface SequenceStepConfig {
  // Research config
  query?: string;
  outputFormat?: 'summary' | 'detailed' | 'bullets' | 'actionable' | 'problem';
  outputLength?: string;
  
  // Message config (uses {{result}} placeholder for previous step output)
  message?: string;
  
  // Text config
  phone?: string;
  
  // Email config
  to?: string;
  subject?: string;
  
  // Slack/Discord config
  channel?: string;
  
  // Delay config
  delayMinutes?: number;
}

export interface SequenceStep {
  id: string;
  type: SequenceStepType;
  label: string;
  config: SequenceStepConfig;
  order: number;
}

export interface Sequence {
  id: string;
  name: string;
  description?: string;
  steps: SequenceStep[];
  triggerType: 'manual' | 'schedule' | 'voice';
  triggerConfig?: {
    frequency?: string;
    scheduledTime?: string;
    dayOfWeek?: string;
    dayOfMonth?: string;
    customDate?: string;
    everyXDays?: string;
  };
  isActive: boolean;
  lastRunAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SequenceExecution {
  id: string;
  sequenceId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  currentStep: number;
  stepResults: Array<{
    stepId: string;
    stepType: SequenceStepType;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: string;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
  }>;
  errorMessage?: string;
  inputData?: Record<string, unknown>;
}
