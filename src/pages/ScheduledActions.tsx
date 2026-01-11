import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowDown, GitBranch, Play, Zap, ChevronRight, ArrowLeft, Trash2, Loader2, Plus, MessageSquare, Pencil, Save, Search, Mail, Hash, Power, Info, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { ScheduledAction, ScheduledActionStep } from '@/types/agent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AppLayout } from '@/components/AppLayout';
import { AIEnhanceButton } from '@/components/AIEnhanceButton';
import { useAutomations, DEFAULT_CHANNELS } from '@/hooks/useAutomations';
import { useTimezone } from '@/hooks/useTimezone';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Discord icon component
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

// Slack icon component  
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

// Default word count for research automations
const DEFAULT_WORD_COUNT = '500';

// Available channels for messaging platforms (will expand over time)
const SLACK_CHANNELS = [
  { value: 'all_bhva', label: 'all_bhva' },
];

const DISCORD_CHANNELS = [
  { value: 'admin', label: 'admin' },
];

// Output format definitions with their actual structure
const OUTPUT_FORMATS = {
  summary: {
    label: 'Summary',
    description: 'Brief overview',
    format: `A concise summary covering:
• Key findings
• Main takeaways
• Brief conclusion`,
  },
  detailed: {
    label: 'Detailed Report',
    description: 'In-depth analysis',
    format: `Comprehensive report with sections:
1. Executive Summary
2. Background & Context
3. Key Findings (detailed)
4. Analysis & Implications
5. Recommendations
6. Sources & References`,
  },
  bullets: {
    label: 'Bullet Points',
    description: 'Quick scannable list',
    format: `• Key bullet points
• Each point is 1-2 sentences
• Most important information first
• Action items highlighted`,
  },
  actionable: {
    label: 'Actionable Insights',
    description: 'What to do next',
    format: `Focus on practical next steps:
1. Immediate Actions (do today)
2. Short-term Actions (this week)
3. Strategic Considerations
4. Risks to Watch`,
  },
  problem: {
    label: 'Problem Framework',
    description: 'Problem → Implications → Action',
    format: `Structured analysis format:
1. PROBLEM: What's the core issue/challenge?
2. CONTEXT: What is happening right now?
3. WHY YOU SHOULD CARE: Implications & how this affects you
4. WHAT YOU CAN DO: How to apply this info in your life`,
  },
};

// Interactive node component for sequence flow
// Helper to generate human-readable summary
function generateAutomationSummary(automation: ScheduledAction): { schedule: string; output: string } {
  const triggerStep = automation.steps.find(s => s.type === 'trigger');
  const actionStep = automation.steps.find(s => s.type === 'action');
  const config = actionStep?.config as Record<string, unknown> | undefined;
  const automationType = getAutomationTypeFromSteps(automation.steps);
  
  // Parse schedule from trigger label
  let schedule = 'Manual execution';
  if (triggerStep?.label) {
    const label = triggerStep.label.toLowerCase();
    if (label.includes('daily at')) {
      const timeMatch = triggerStep.label.match(/at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      schedule = `Runs daily at ${timeMatch?.[1] || 'scheduled time'}`;
    } else if (label.includes('every') && label.includes('days')) {
      const daysMatch = triggerStep.label.match(/every\s+(\d+)\s+days/i);
      const timeMatch = triggerStep.label.match(/at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      schedule = `Runs every ${daysMatch?.[1] || 'X'} days at ${timeMatch?.[1] || 'scheduled time'}`;
    } else if (label.includes('weekly') || (label.includes('every') && ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].some(d => label.includes(d)))) {
      const dayMatch = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].find(d => triggerStep.label.includes(d));
      const timeMatch = triggerStep.label.match(/at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      schedule = `Runs every ${dayMatch || 'week'} at ${timeMatch?.[1] || 'scheduled time'}`;
    } else if (label.includes('monthly')) {
      const dayMatch = triggerStep.label.match(/day\s+(\d+)/i);
      const timeMatch = triggerStep.label.match(/at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      schedule = `Runs monthly on day ${dayMatch?.[1] || '1'} at ${timeMatch?.[1] || 'scheduled time'}`;
    } else if (label.includes('one-time') || label.includes('manual')) {
      schedule = 'Manual execution only';
    }
  }
  
  // Describe output
  let output = 'Sends a message';
  switch (automationType) {
    case 'research':
      const format = (config?.output_format as string) || 'summary';
      const formatLabel = OUTPUT_FORMATS[format as keyof typeof OUTPUT_FORMATS]?.label || format;
      output = `Generates a ${formatLabel.toLowerCase()} research report`;
      break;
    case 'text':
      output = 'Sends an SMS text message';
      break;
    case 'email':
      const to = (config?.to as string) || 'recipient';
      output = `Sends an email to ${to}`;
      break;
    case 'slack':
      const slackChannel = (config?.channel as string) || 'channel';
      output = `Posts to Slack #${slackChannel}`;
      break;
    case 'discord':
      const discordChannel = (config?.discord_channel as string) || 'channel';
      output = `Posts to Discord #${discordChannel}`;
      break;
  }
  
  return { schedule, output };
}

function InteractiveNode({ 
  step, 
  isFirst, 
  isSelected, 
  onClick 
}: { 
  step: ScheduledActionStep; 
  isFirst: boolean; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const getIcon = () => {
    switch (step.type) {
      case 'trigger':
        return <Clock className="w-4 h-4" />;
      case 'condition':
        return <GitBranch className="w-4 h-4" />;
      case 'action':
        return <Play className="w-4 h-4" />;
    }
  };

  const getTypeStyles = () => {
    if (isSelected) {
      return step.type === 'trigger' 
        ? 'border-primary bg-primary/10 ring-2 ring-primary/30' 
        : 'border-green-500 bg-green-500/10 ring-2 ring-green-500/30';
    }
    return step.type === 'trigger'
      ? 'border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10'
      : 'border-green-400/30 bg-green-400/5 hover:border-green-400/50 hover:bg-green-400/10';
  };

  const getLabel = () => {
    // For research, don't show the full prompt in the node
    if (step.label.startsWith('Research:')) {
      return 'Research Task';
    }
    // Keep other labels concise
    if (step.label.length > 50) {
      return step.label.substring(0, 47) + '...';
    }
    return step.label;
  };

  return (
    <div className="flex flex-col items-center">
      {!isFirst && (
        <div className="flex flex-col items-center py-2">
          <div className="w-px h-4 bg-border" />
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <button
        onClick={onClick}
        className={`rounded-lg border p-4 w-full transition-all cursor-pointer group ${getTypeStyles()}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${
            step.type === 'trigger' ? 'bg-primary/20 text-primary' : 'bg-green-500/20 text-green-500'
          }`}>
            {getIcon()}
          </div>
          <div className="flex-1 text-left">
            <span className="text-sm font-medium text-foreground">{getLabel()}</span>
            <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
              {step.type === 'trigger' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
              {step.type === 'trigger' ? 'Trigger' : 'Action'}
            </p>
          </div>
          <div className="p-1.5 rounded-md bg-secondary/50 group-hover:bg-secondary transition-colors">
            <Pencil className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </div>
      </button>
    </div>
  );
}

// Simple non-interactive node for previews
function ActionStepNode({ step, isFirst }: { step: ScheduledActionStep; isFirst: boolean }) {
  const getIcon = () => {
    switch (step.type) {
      case 'trigger':
        return <Clock className="w-4 h-4 text-primary" />;
      case 'condition':
        return <GitBranch className="w-4 h-4 text-yellow-400" />;
      case 'action':
        return <Play className="w-4 h-4 text-green-400" />;
    }
  };

  const getTypeColor = () => {
    switch (step.type) {
      case 'trigger':
        return 'border-primary/30 bg-primary/5';
      case 'action':
        return 'border-green-400/30 bg-green-400/5';
      default:
        return 'border-yellow-400/30 bg-yellow-400/5';
    }
  };

  return (
    <div className="flex flex-col items-center">
      {!isFirst && (
        <div className="flex flex-col items-center py-2">
          <div className="w-px h-4 bg-border" />
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className={`rounded-lg border p-4 w-full ${getTypeColor()}`}>
        <div className="flex items-center gap-3">
          {getIcon()}
          <div>
            <span className="text-sm font-medium text-foreground">{step.label}</span>
            <p className="text-xs text-muted-foreground capitalize">{step.type}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

type AutomationType = 'text' | 'research' | 'email' | 'slack' | 'discord';
type FilterType = 'all' | AutomationType;
type FrequencyType = 'one_time' | 'daily' | 'weekly' | 'monthly' | 'custom' | 'every_x_days';

interface AutomationFormData {
  name: string;
  type: AutomationType;
  message: string;
  // Research specific
  researchQuery: string;
  researchOutputFormat: string;
  researchOutputLength: string;
  // Email specific
  emailTo: string;
  emailSubject: string;
  // Slack specific
  slackChannel: string;
  // Discord specific
  discordChannel: string;
  // Scheduling
  frequency: FrequencyType;
  time: string;
  dayOfWeek: string;
  dayOfMonth: string;
  // Custom scheduling
  customDate: string; // YYYY-MM-DD format
  everyXDays: string; // Number of days
  webhookUrl: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AUTOMATION_TYPES = [
  { id: 'all' as const, label: 'All', icon: Zap, description: 'All automations', color: 'bg-muted text-foreground border-border' },
  { id: 'text' as const, label: 'Text', icon: MessageSquare, description: 'Send SMS via n8n webhook', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: 'research' as const, label: 'Research', icon: Search, description: 'AI-powered research via Perplexity', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { id: 'email' as const, label: 'Email', icon: Mail, description: 'Send email via Gmail webhook', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { id: 'slack' as const, label: 'Slack', icon: SlackIcon, description: 'Post to Slack channel', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  { id: 'discord' as const, label: 'Discord', icon: DiscordIcon, description: 'Post to Discord channel', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
];

// Helper to get automation type from steps
function getAutomationTypeFromSteps(steps: ScheduledActionStep[]): AutomationType {
  const actionStep = steps.find(s => s.type === 'action');
  const config = actionStep?.config as Record<string, unknown> | undefined;
  if (config?.action_type === 'research') return 'research';
  if (config?.action_type === 'send_email') return 'email';
  if (config?.action_type === 'slack_message') return 'slack';
  if (config?.action_type === 'discord_message') return 'discord';
  return 'text';
}

// Helper to extract data from automation steps
function extractFromSteps(steps: ScheduledActionStep[], isActive: boolean): Partial<AutomationFormData> {
  const actionStep = steps.find(s => s.type === 'action');
  const triggerStep = steps.find(s => s.type === 'trigger');
  const label = triggerStep?.label || '';
  
  // Extract type
  let type: AutomationType = 'text';
  const config = actionStep?.config as Record<string, unknown> | undefined;
  if (config?.action_type === 'research') type = 'research';
  else if (config?.action_type === 'send_email') type = 'email';
  else if (config?.action_type === 'slack_message') type = 'slack';
  else if (config?.action_type === 'discord_message') type = 'discord';
  
  // Extract message
  const message = (config?.message as string) || '';
  
  // Extract research fields
  const researchQuery = (config?.query as string) || (config?.research_query as string) || '';
  const researchOutputFormat = (config?.output_format as string) || 'summary';
  const researchOutputLength = (config?.output_length as string) || '500';
  
  // Extract email fields
  const emailTo = (config?.to as string) || '';
  const emailSubject = (config?.subject as string) || '';
  
  // Extract slack fields - use default if not set
  const slackChannel = (config?.channel as string) || DEFAULT_CHANNELS.slack;
  
  // Extract discord fields - use default if not set
  const discordChannel = (config?.discord_channel as string) || DEFAULT_CHANNELS.discord;

  // Parse trigger - check if it was one_time (inactive with no schedule indicator)
  let frequency: FrequencyType = 'daily';
  let time = '09:00';
  let dayOfWeek = 'Monday';
  let dayOfMonth = '1';
  let customDate = '';
  let everyXDays = '7';
  
  const timeMatch = label.match(/at\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2];
    const period = timeMatch[3]?.toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    time = `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  
  if (label.toLowerCase().includes('one-time') || label.toLowerCase().includes('manual')) {
    frequency = 'one_time';
  } else if (label.toLowerCase().includes('every') && DAYS_OF_WEEK.some(d => label.includes(d))) {
    frequency = 'weekly';
    dayOfWeek = DAYS_OF_WEEK.find(d => label.includes(d)) || 'Monday';
  } else if (label.toLowerCase().includes('monthly')) {
    frequency = 'monthly';
    const dayMatch = label.match(/day\s+(\d+)/i);
    if (dayMatch) dayOfMonth = dayMatch[1];
  } else if (label.toLowerCase().includes('every') && label.toLowerCase().includes('days')) {
    frequency = 'every_x_days';
    const daysMatch = label.match(/every\s+(\d+)\s+days/i);
    if (daysMatch) everyXDays = daysMatch[1];
  } else if (label.toLowerCase().includes('on ') && label.match(/\d{4}-\d{2}-\d{2}|[A-Z][a-z]+ \d+/)) {
    frequency = 'custom';
    // Try to extract date
    const dateMatch = label.match(/on\s+(\d{4}-\d{2}-\d{2})/i);
    if (dateMatch) customDate = dateMatch[1];
  }
  
  return { type, message, researchQuery, researchOutputFormat, researchOutputLength, emailTo, emailSubject, slackChannel, discordChannel, frequency, time, dayOfWeek, dayOfMonth, customDate, everyXDays };
}

const ScheduledActions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAutomation, setSelectedAutomation] = useState<ScheduledAction | null>(null);
  const [executing, setExecuting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<AutomationFormData>({
    name: '',
    type: 'text',
    message: '',
    researchQuery: '',
    researchOutputFormat: 'summary',
    researchOutputLength: '500',
    emailTo: '',
    emailSubject: '',
    slackChannel: DEFAULT_CHANNELS.slack,
    discordChannel: DEFAULT_CHANNELS.discord,
    frequency: 'daily',
    time: '09:00',
    dayOfWeek: 'Monday',
    dayOfMonth: '1',
    customDate: '',
    everyXDays: '7',
    webhookUrl: '',
  });
  // enhancingQuery state removed - now handled by AIEnhanceButton component
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [pendingActivation, setPendingActivation] = useState<ScheduledAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [automationExecutions, setAutomationExecutions] = useState<Array<{
    id: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    duration_ms: number | null;
    output_data: unknown;
  }>>([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [editingNode, setEditingNode] = useState<'trigger' | 'action' | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  
  const { automations, loading, executeAutomation, deleteAutomation, createAutomation, updateAutomation } = useAutomations();
  
  // Handle edit query parameter - auto-open edit mode when navigating with ?edit=id
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && automations.length > 0 && !loading) {
      const automationToEdit = automations.find(a => a.id === editId);
      if (automationToEdit) {
        setSelectedAutomation(automationToEdit);
        // Trigger edit mode
        const extracted = extractFromSteps(automationToEdit.steps, automationToEdit.isActive);
        setFormData({
          name: automationToEdit.name,
          type: extracted.type || 'text',
          message: extracted.message || '',
          researchQuery: extracted.researchQuery || '',
          researchOutputFormat: extracted.researchOutputFormat || 'summary',
          researchOutputLength: extracted.researchOutputLength || '500',
          emailTo: extracted.emailTo || '',
          emailSubject: extracted.emailSubject || '',
          slackChannel: extracted.slackChannel || '',
          discordChannel: extracted.discordChannel || '',
          frequency: extracted.frequency || 'daily',
          time: extracted.time || '09:00',
          dayOfWeek: extracted.dayOfWeek || 'Monday',
          dayOfMonth: extracted.dayOfMonth || '1',
          customDate: extracted.customDate || '',
          everyXDays: extracted.everyXDays || '7',
          webhookUrl: '',
        });
        setIsEditing(true);
        // Clear the query param after handling
        setSearchParams({}, { replace: true });
      }
    }
  }, [automations, loading, searchParams, setSearchParams]);
  
  // Fetch executions for selected automation
  useEffect(() => {
    const fetchExecutions = async () => {
      if (!selectedAutomation) {
        setAutomationExecutions([]);
        return;
      }
      
      setLoadingExecutions(true);
      try {
        const { data, error } = await supabase
          .from('executions')
          .select('id, status, started_at, completed_at, duration_ms, output_data')
          .eq('sequence_name', selectedAutomation.name)
          .order('started_at', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        setAutomationExecutions(data || []);
      } catch (err) {
        console.error('Failed to fetch executions:', err);
      } finally {
        setLoadingExecutions(false);
      }
    };
    
    fetchExecutions();
  }, [selectedAutomation?.id, selectedAutomation?.name]);
  
  // Filtered automations based on type filter
  const filteredAutomations = typeFilter === 'all' 
    ? automations 
    : automations.filter(a => getAutomationTypeFromSteps(a.steps) === typeFilter);
  const { formatTime, getTimezoneAbbr } = useTimezone();

  const navigate = useNavigate();

  const handleExecute = async () => {
    if (!selectedAutomation) return;
    setExecuting(true);
    try {
      await executeAutomation(selectedAutomation.id);
      toast.success('Execution started');
      navigate('/executions');
    } catch (err) {
      toast.error('Failed to start execution');
      setExecuting(false);
    }
  };


  const handleDelete = async (automationId: string) => {
    try {
      await deleteAutomation(automationId);
      setSelectedAutomation(null);
      setIsEditing(false);
      toast.success('Automation deleted');
    } catch (err) {
      toast.error('Failed to delete automation');
    }
  };

  const handleToggleActive = async (automation: ScheduledAction, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If trying to enable and was one-time (inactive), show schedule dialog
    if (!automation.isActive) {
      const extracted = extractFromSteps(automation.steps, automation.isActive);
      if (extracted.frequency === 'one_time') {
        setPendingActivation(automation);
        // Pre-fill form for schedule selection
        setFormData(prev => ({
          ...prev,
          frequency: 'daily',
          time: extracted.time || '09:00',
          dayOfWeek: extracted.dayOfWeek || 'Monday',
          dayOfMonth: extracted.dayOfMonth || '1',
        }));
        setShowScheduleDialog(true);
        return;
      }
    }
    
    setTogglingId(automation.id);
    try {
      await updateAutomation(automation.id, { isActive: !automation.isActive });
      toast.success(automation.isActive ? 'Automation disabled' : 'Automation enabled');
    } catch (err) {
      toast.error('Failed to update automation');
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmActivation = async () => {
    if (!pendingActivation) return;
    
    setTogglingId(pendingActivation.id);
    try {
      // Update the automation with new schedule and activate it
      const triggerConfig: Record<string, unknown> = {
        frequency: formData.frequency,
        scheduled_time: formData.time,
      };
      
      if (formData.frequency === 'weekly') {
        triggerConfig.day_of_week = formData.dayOfWeek;
      } else if (formData.frequency === 'monthly') {
        triggerConfig.day_of_month = parseInt(formData.dayOfMonth);
      }

      // Update trigger step label
      const newTriggerLabel = buildTriggerLabel();
      const updatedSteps = pendingActivation.steps.map(step => 
        step.type === 'trigger' ? { ...step, label: newTriggerLabel } : step
      );

      await updateAutomation(pendingActivation.id, { 
        isActive: true,
        triggerConfig,
        steps: updatedSteps,
      });
      toast.success('Automation enabled with new schedule');
    } catch (err) {
      toast.error('Failed to update automation');
    } finally {
      setTogglingId(null);
      setShowScheduleDialog(false);
      setPendingActivation(null);
    }
  };

  const buildTriggerLabel = () => {
    const timeFormatted = formatTime(formData.time);
    const tzAbbr = getTimezoneAbbr();
    
    if (formData.frequency === 'one_time') {
      return 'One-time execution (manual)';
    } else if (formData.frequency === 'weekly') {
      return `Every ${formData.dayOfWeek} at ${timeFormatted} ${tzAbbr}`;
    } else if (formData.frequency === 'monthly') {
      return `Monthly on day ${formData.dayOfMonth} at ${timeFormatted} ${tzAbbr}`;
    } else if (formData.frequency === 'custom') {
      const dateStr = formData.customDate 
        ? new Date(formData.customDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '(select date)';
      return `On ${dateStr} at ${timeFormatted} ${tzAbbr}`;
    } else if (formData.frequency === 'every_x_days') {
      return `Every ${formData.everyXDays} days at ${timeFormatted} ${tzAbbr}`;
    }
    return `Daily at ${timeFormatted} ${tzAbbr}`;
  };

  // Format multiple emails for display
  const formatEmailRecipients = (emails: string): string => {
    if (!emails) return '(enter email)';
    const emailList = emails.split(/[,;]\s*/).filter(e => e.trim());
    if (emailList.length === 0) return '(enter email)';
    if (emailList.length === 1) return emailList[0].trim();
    return emailList.map(e => e.trim()).join(', ');
  };

  const buildActionLabel = () => {
    switch (formData.type) {
      case 'research':
        return `Research: "${formData.researchQuery.substring(0, 30)}${formData.researchQuery.length > 30 ? '...' : ''}"`;
      case 'email':
        return `Email to: ${formatEmailRecipients(formData.emailTo)}`;
      case 'slack':
        return `Slack #${formData.slackChannel || '(enter channel)'}`;
      case 'discord':
        return `Discord #${formData.discordChannel || '(enter channel)'}`;
      default:
        return formData.message 
          ? `Send text: "${formData.message.substring(0, 40)}${formData.message.length > 40 ? '...' : ''}"` 
          : 'Send text: (enter message)';
    }
  };

  const buildSteps = (): ScheduledActionStep[] => {
    const triggerStep: ScheduledActionStep = {
      id: crypto.randomUUID(),
      type: 'trigger',
      label: buildTriggerLabel(),
    };

    let actionConfig: Record<string, unknown> = {};
    switch (formData.type) {
      case 'research':
        actionConfig = {
          action_type: 'research',
          query: formData.researchQuery,
          output_format: formData.researchOutputFormat,
          output_length: formData.researchOutputLength,
        };
        break;
      case 'email':
        actionConfig = {
          action_type: 'send_email',
          to: formData.emailTo,
          subject: formData.emailSubject,
          message: formData.message,
        };
        break;
      case 'slack':
        actionConfig = {
          action_type: 'slack_message',
          channel: formData.slackChannel,
          message: formData.message,
        };
        break;
      case 'discord':
        actionConfig = {
          action_type: 'discord_message',
          discord_channel: formData.discordChannel,
          message: formData.message,
        };
        break;
      default:
        actionConfig = {
          action_type: 'send_text',
          message: formData.message,
        };
    }

    const actionStep: ScheduledActionStep = {
      id: crypto.randomUUID(),
      type: 'action',
      label: buildActionLabel(),
      config: actionConfig,
    };

    return [triggerStep, actionStep];
  };

  const getDescription = () => {
    switch (formData.type) {
      case 'research':
        return `Research: "${formData.researchQuery}"`;
      case 'email':
        return `Email to ${formatEmailRecipients(formData.emailTo)}: "${formData.emailSubject}"`;
      case 'slack':
        return `Slack #${formData.slackChannel}: "${formData.message}"`;
      case 'discord':
        return `Discord #${formData.discordChannel}: "${formData.message}"`;
      default:
        return `Scheduled text: "${formData.message}"`;
    }
  };

  const isFormValid = () => {
    if (!formData.name.trim()) return false;
    switch (formData.type) {
      case 'research':
        return formData.researchQuery.trim().length > 0;
      case 'email':
        return formData.emailTo.trim().length > 0 && formData.message.trim().length > 0;
      case 'slack':
        return formData.slackChannel.trim().length > 0 && formData.message.trim().length > 0;
      case 'discord':
        return formData.discordChannel.trim().length > 0 && formData.message.trim().length > 0;
      default:
        return formData.message.trim().length > 0;
    }
  };

  // handleEnhanceQuery removed - now handled by AIEnhanceButton component

  const handleCreate = async () => {
    if (!isFormValid()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const triggerConfig: Record<string, unknown> = {
        frequency: formData.frequency,
        scheduled_time: formData.time,
      };
      
      if (formData.frequency === 'weekly') {
        triggerConfig.day_of_week = formData.dayOfWeek;
      } else if (formData.frequency === 'monthly') {
        triggerConfig.day_of_month = parseInt(formData.dayOfMonth);
      } else if (formData.frequency === 'custom') {
        triggerConfig.custom_date = formData.customDate;
      } else if (formData.frequency === 'every_x_days') {
        triggerConfig.every_x_days = parseInt(formData.everyXDays);
      }

      // One-time executions start as inactive
      const isActive = formData.frequency !== 'one_time';

      await createAutomation({
        name: formData.name,
        description: getDescription(),
        triggerType: 'schedule',
        triggerConfig,
        steps: buildSteps(),
        n8nWebhookUrl: formData.webhookUrl || undefined,
        isActive,
      });

      toast.success('Automation created!');
      setShowCreateForm(false);
      resetForm();
    } catch (err) {
      toast.error('Failed to create automation');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedAutomation || !isFormValid()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const triggerConfig: Record<string, unknown> = {
        frequency: formData.frequency,
        scheduled_time: formData.time,
      };
      
      if (formData.frequency === 'weekly') {
        triggerConfig.day_of_week = formData.dayOfWeek;
      } else if (formData.frequency === 'monthly') {
        triggerConfig.day_of_month = parseInt(formData.dayOfMonth);
      }

      await updateAutomation(selectedAutomation.id, {
        name: formData.name,
        description: getDescription(),
        triggerConfig,
        steps: buildSteps(),
        n8nWebhookUrl: formData.webhookUrl || undefined,
      });

      toast.success('Automation updated!');
      setIsEditing(false);
      setSelectedAutomation(null);
    } catch (err) {
      toast.error('Failed to update automation');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'text',
      message: '',
      researchQuery: '',
      researchOutputFormat: 'summary',
      researchOutputLength: '500',
      emailTo: '',
      emailSubject: '',
      slackChannel: DEFAULT_CHANNELS.slack,
      discordChannel: DEFAULT_CHANNELS.discord,
      frequency: 'daily',
      time: '09:00',
      dayOfWeek: 'Monday',
      dayOfMonth: '1',
      customDate: '',
      everyXDays: '7',
      webhookUrl: '',
    });
  };

  const handleBack = () => {
    setSelectedAutomation(null);
    setShowCreateForm(false);
    setIsEditing(false);
    resetForm();
  };

  const startEditing = () => {
    if (!selectedAutomation) return;
    const extracted = extractFromSteps(selectedAutomation.steps, selectedAutomation.isActive);
    setFormData({
      name: selectedAutomation.name,
      type: extracted.type || 'text',
      message: extracted.message || '',
      researchQuery: extracted.researchQuery || '',
      researchOutputFormat: extracted.researchOutputFormat || 'summary',
      researchOutputLength: extracted.researchOutputLength || '500',
      emailTo: extracted.emailTo || '',
      emailSubject: extracted.emailSubject || '',
      slackChannel: extracted.slackChannel || '',
      discordChannel: extracted.discordChannel || '',
      frequency: extracted.frequency || 'daily',
      time: extracted.time || '09:00',
      dayOfWeek: extracted.dayOfWeek || 'Monday',
      dayOfMonth: extracted.dayOfMonth || '1',
      customDate: extracted.customDate || '',
      everyXDays: extracted.everyXDays || '7',
      webhookUrl: '',
    });
    setIsEditing(true);
  };

  const selectedTypeInfo = AUTOMATION_TYPES.find(t => t.id === formData.type);
  const TypeIcon = selectedTypeInfo?.icon || MessageSquare;

  // Render the automation form (used for both create and edit)
  const renderAutomationForm = (isEdit: boolean) => (
    <motion.div
      key={isEdit ? 'edit' : 'create'}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        {/* Automation Type Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">Automation Type</label>
          <div className="grid grid-cols-2 gap-2">
            {AUTOMATION_TYPES.filter(t => t.id !== 'all').map((type) => {
              const Icon = type.icon;
              const isSelected = formData.type === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setFormData({ ...formData, type: type.id as AutomationType })}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    isSelected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-secondary/30 hover:border-primary/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Name</label>
            <Input
              placeholder="e.g., Morning Reminder"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Type-specific fields */}
          {formData.type === 'text' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Message</label>
              <Textarea
                placeholder="The message to send..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
              />
            </div>
          )}

          {formData.type === 'research' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Research Prompt</label>
                  <AIEnhanceButton
                    value={formData.researchQuery}
                    onChange={(val) => setFormData({ ...formData, researchQuery: val })}
                    type="research"
                    context={{
                      output_format: OUTPUT_FORMATS[formData.researchOutputFormat as keyof typeof OUTPUT_FORMATS]?.format,
                      output_length: `approximately ${formData.researchOutputLength} words`,
                    }}
                  />
                </div>
                <Textarea
                  placeholder="What do you want to research? e.g., Latest AI developments this week"
                  value={formData.researchQuery}
                  onChange={(e) => setFormData({ ...formData, researchQuery: e.target.value })}
                  rows={3}
                />
              </div>
              
              {/* Output Length - Word Count */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Target Word Count</label>
                <Input
                  type="number"
                  min="100"
                  max="10000"
                  placeholder="500"
                  value={formData.researchOutputLength}
                  onChange={(e) => setFormData({ ...formData, researchOutputLength: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Approximate output length (e.g., 200 for brief, 500 for standard, 1000+ for detailed)</p>
              </div>

              {/* Output Format Selector */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-sm font-medium">Output Format</label>
                  {OUTPUT_FORMATS[formData.researchOutputFormat as keyof typeof OUTPUT_FORMATS] && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground">
                          <Info className="w-3.5 h-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-3" align="start">
                        <div className="space-y-2">
                          <p className="font-medium text-sm">{OUTPUT_FORMATS[formData.researchOutputFormat as keyof typeof OUTPUT_FORMATS]?.label}</p>
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-secondary/50 rounded p-2">
                            {OUTPUT_FORMATS[formData.researchOutputFormat as keyof typeof OUTPUT_FORMATS]?.format}
                          </pre>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <Select 
                  value={formData.researchOutputFormat} 
                  onValueChange={(v) => setFormData({ ...formData, researchOutputFormat: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OUTPUT_FORMATS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {val.label} ({val.description})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {formData.type === 'email' && (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block">To (Email)</label>
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={formData.emailTo}
                  onChange={(e) => setFormData({ ...formData, emailTo: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Subject</label>
                <Input
                  placeholder="Email subject..."
                  value={formData.emailSubject}
                  onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Message</label>
                <Textarea
                  placeholder="Email body..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                />
              </div>
            </>
          )}

          {formData.type === 'slack' && (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Channel</label>
                <Select 
                  value={formData.slackChannel || SLACK_CHANNELS[0].value} 
                  onValueChange={(v) => setFormData({ ...formData, slackChannel: v })}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {SLACK_CHANNELS.map((channel) => (
                      <SelectItem key={channel.value} value={channel.value}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Message</label>
                <Textarea
                  placeholder="Slack message..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                />
              </div>
            </>
          )}

          {formData.type === 'discord' && (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Channel</label>
                <Select 
                  value={formData.discordChannel || DISCORD_CHANNELS[0].value} 
                  onValueChange={(v) => setFormData({ ...formData, discordChannel: v })}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {DISCORD_CHANNELS.map((channel) => (
                      <SelectItem key={channel.value} value={channel.value}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Message</label>
                <Textarea
                  placeholder="Discord message..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Scheduling */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Frequency</label>
              <Select 
                value={formData.frequency} 
                onValueChange={(v) => setFormData({ ...formData, frequency: v as FrequencyType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time (manual)</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="every_x_days">Every X Days</SelectItem>
                  <SelectItem value="custom">Specific Date</SelectItem>
                </SelectContent>
              </Select>
              {formData.frequency === 'one_time' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Automation will be created as inactive. Enable it to set a schedule.
                </p>
              )}
            </div>

            {formData.frequency !== 'one_time' && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Time ({getTimezoneAbbr()})
                </label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            )}
          </div>

          {formData.frequency === 'weekly' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Day of Week</label>
              <Select 
                value={formData.dayOfWeek} 
                onValueChange={(v) => setFormData({ ...formData, dayOfWeek: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(day => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.frequency === 'monthly' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Day of Month</label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.dayOfMonth}
                onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
              />
            </div>
          )}

          {formData.frequency === 'every_x_days' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Every how many days?</label>
              <Input
                type="number"
                min="1"
                max="365"
                value={formData.everyXDays}
                onChange={(e) => setFormData({ ...formData, everyXDays: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Run every {formData.everyXDays || '...'} day(s)
              </p>
            </div>
          )}

          {formData.frequency === 'custom' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Select Date</label>
              <Input
                type="date"
                value={formData.customDate}
                onChange={(e) => setFormData({ ...formData, customDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Run once on this specific date
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Preview</h3>
        <div className="space-y-0">
          <ActionStepNode 
            step={{ id: '1', type: 'trigger', label: buildTriggerLabel() }} 
            isFirst={true} 
          />
          <ActionStepNode 
            step={{ id: '2', type: 'action', label: buildActionLabel() }} 
            isFirst={false} 
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button 
          variant="outline"
          className="flex-1"
          onClick={handleBack}
        >
          Cancel
        </Button>
        <Button 
          className="flex-1 gap-2"
          onClick={isEdit ? handleSaveEdit : handleCreate}
          disabled={saving || !isFormValid()}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isEdit ? (
            <Save className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Automation'}
        </Button>
      </div>
    </motion.div>
  );

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto flex flex-col h-full">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background pt-6 px-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            {(selectedAutomation || showCreateForm) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-semibold">
                {showCreateForm ? 'Create Automation' : isEditing ? 'Edit Automation' : selectedAutomation ? selectedAutomation.name : 'Automations'}
              </h1>
              {!selectedAutomation && !showCreateForm && (
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your automated workflows
                </p>
              )}
            </div>
            {selectedAutomation && !isEditing && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startEditing}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="w-5 h-5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete automation?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{selectedAutomation.name}" and cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(selectedAutomation.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            {!selectedAutomation && !showCreateForm && (
              <Button onClick={() => setShowCreateForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                New
              </Button>
            )}
          </div>
          
          {/* Type Filters - only show in list view */}
          {!selectedAutomation && !showCreateForm && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
              {AUTOMATION_TYPES.map((type) => {
                const Icon = type.icon;
                const isActive = typeFilter === type.id;
                const count = type.id === 'all' 
                  ? automations.length 
                  : automations.filter(a => getAutomationTypeFromSteps(a.steps) === type.id).length;
                
                return (
                  <button
                    key={type.id}
                    onClick={() => setTypeFilter(type.id as FilterType)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${
                      isActive 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground hover:border-primary/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {type.label}
                    <span className={`ml-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {showCreateForm ? (
              renderAutomationForm(false)
            ) : isEditing && selectedAutomation ? (
              renderAutomationForm(true)
            ) : !selectedAutomation ? (
            /* Automations List View */
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAutomations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    {automations.length === 0 ? 'No automations yet.' : 'No matching automations.'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 mb-4">
                    {automations.length === 0 ? 'Create one manually or talk to the agent!' : 'Try a different filter.'}
                  </p>
                  {automations.length === 0 && (
                    <Button onClick={() => setShowCreateForm(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Create Automation
                    </Button>
                  )}
                </div>
              ) : (
                filteredAutomations.map((action, index) => {
                  const automationType = getAutomationTypeFromSteps(action.steps);
                  const typeConfig = AUTOMATION_TYPES.find(t => t.id === automationType) || AUTOMATION_TYPES[1];
                  const TypeIcon = typeConfig.icon;
                  
                  return (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`rounded-xl border p-4 transition-all group ${
                        action.isActive 
                          ? 'border-border bg-card hover:border-primary/30' 
                          : 'border-border/50 bg-card/50 opacity-60 hover:opacity-80'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Toggle Switch */}
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={action.isActive}
                            onCheckedChange={() => handleToggleActive(action, { stopPropagation: () => {} } as React.MouseEvent)}
                            disabled={togglingId === action.id}
                          />
                        </div>

                        {/* Content - clickable */}
                        <button
                          onClick={() => setSelectedAutomation(action)}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {/* Type Badge */}
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${typeConfig.color}`}>
                              <TypeIcon className="w-3 h-3" />
                              {typeConfig.label}
                            </span>
                            <h3 className={`font-semibold truncate ${action.isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {action.name}
                            </h3>
                          </div>
                          {action.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{action.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {action.steps[0] && action.steps[0].label}
                          </p>
                        </button>

                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          ) : (
            /* Automation Detail View - Node-based editing */
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Summary Section */}
              {(() => {
                const summary = generateAutomationSummary(selectedAutomation);
                const automationType = getAutomationTypeFromSteps(selectedAutomation.steps);
                const typeConfig = AUTOMATION_TYPES.find(t => t.id === automationType) || AUTOMATION_TYPES[0];
                const TypeIcon = typeConfig.icon;
                return (
                  <div className="rounded-xl border border-border bg-gradient-to-br from-card to-secondary/30 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${typeConfig.color}`}>
                          <TypeIcon className="w-3.5 h-3.5" />
                          {typeConfig.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          selectedAutomation.isActive 
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                            : 'bg-secondary text-muted-foreground border border-border'
                        }`}>
                          <Power className="w-3 h-3" />
                          {selectedAutomation.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <Switch
                        checked={selectedAutomation.isActive}
                        onCheckedChange={() => handleToggleActive(selectedAutomation, { stopPropagation: () => {} } as React.MouseEvent)}
                        disabled={togglingId === selectedAutomation.id}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-foreground">{summary.schedule}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="text-foreground">{summary.output}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Interactive Sequence Flow */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Workflow</h3>
                  {editingNode && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => setEditingNode(null)}
                    >
                      Done Editing
                    </Button>
                  )}
                </div>
                
                <div className="space-y-0">
                  {selectedAutomation.steps.map((step, index) => (
                    <div key={step.id}>
                      <InteractiveNode
                        step={step}
                        isFirst={index === 0}
                        isSelected={editingNode === step.type}
                        onClick={() => {
                          if (editingNode === step.type) {
                            setEditingNode(null);
                          } else {
                            // Load form data and open editor for this node
                            const extracted = extractFromSteps(selectedAutomation.steps, selectedAutomation.isActive);
                            setFormData({
                              name: selectedAutomation.name,
                              type: extracted.type || 'text',
                              message: extracted.message || '',
                              researchQuery: extracted.researchQuery || '',
                              researchOutputFormat: extracted.researchOutputFormat || 'summary',
                              researchOutputLength: extracted.researchOutputLength || '500',
                              emailTo: extracted.emailTo || '',
                              emailSubject: extracted.emailSubject || '',
                              slackChannel: extracted.slackChannel || '',
                              discordChannel: extracted.discordChannel || '',
                              frequency: extracted.frequency || 'daily',
                              time: extracted.time || '09:00',
                              dayOfWeek: extracted.dayOfWeek || 'Monday',
                              dayOfMonth: extracted.dayOfMonth || '1',
                              customDate: extracted.customDate || '',
                              everyXDays: extracted.everyXDays || '7',
                              webhookUrl: '',
                            });
                            setEditingNode(step.type as 'trigger' | 'action');
                          }
                        }}
                      />
                      
                      {/* Inline Trigger Editor */}
                      {editingNode === 'trigger' && step.type === 'trigger' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3"
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium mb-1 block">Frequency</label>
                              <Select 
                                value={formData.frequency} 
                                onValueChange={(v) => setFormData({ ...formData, frequency: v as FrequencyType })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="one_time">One-time</SelectItem>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="every_x_days">Every X Days</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {formData.frequency !== 'one_time' && (
                              <div>
                                <label className="text-xs font-medium mb-1 block">Time ({getTimezoneAbbr()})</label>
                                <Input
                                  type="time"
                                  value={formData.time}
                                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                  className="h-9"
                                />
                              </div>
                            )}
                          </div>
                          {formData.frequency === 'weekly' && (
                            <div>
                              <label className="text-xs font-medium mb-1 block">Day</label>
                              <Select value={formData.dayOfWeek} onValueChange={(v) => setFormData({ ...formData, dayOfWeek: v })}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {DAYS_OF_WEEK.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <Button 
                            size="sm" 
                            className="w-full gap-2"
                            onClick={handleSaveEdit}
                            disabled={saving}
                          >
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Save Trigger
                          </Button>
                        </motion.div>
                      )}
                      
                      {/* Inline Action Editor */}
                      {editingNode === 'action' && step.type === 'action' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 p-4 rounded-lg bg-green-500/5 border border-green-500/20 space-y-3"
                        >
                          {formData.type === 'research' && (
                            <>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-xs font-medium">Research Prompt</label>
                                  <AIEnhanceButton
                                    value={formData.researchQuery}
                                    onChange={(val) => setFormData({ ...formData, researchQuery: val })}
                                    type="research"
                                    context={{
                                      output_format: OUTPUT_FORMATS[formData.researchOutputFormat as keyof typeof OUTPUT_FORMATS]?.format,
                                      output_length: `approximately ${formData.researchOutputLength} words`,
                                    }}
                                  />
                                </div>
                                <Textarea
                                  value={formData.researchQuery}
                                  onChange={(e) => setFormData({ ...formData, researchQuery: e.target.value })}
                                  rows={3}
                                  className="text-sm"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-medium mb-1 block">Word Count</label>
                                  <Input
                                    type="number"
                                    value={formData.researchOutputLength}
                                    onChange={(e) => setFormData({ ...formData, researchOutputLength: e.target.value })}
                                    className="h-9"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium mb-1 block">Format</label>
                                  <Select value={formData.researchOutputFormat} onValueChange={(v) => setFormData({ ...formData, researchOutputFormat: v })}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(OUTPUT_FORMATS).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </>
                          )}
                          {formData.type === 'text' && (
                            <div>
                              <label className="text-xs font-medium mb-1 block">Message</label>
                              <Textarea
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                rows={2}
                              />
                            </div>
                          )}
                          {formData.type === 'slack' && (
                            <>
                              <div>
                                <label className="text-xs font-medium mb-1 block">Channel</label>
                                <Select value={formData.slackChannel} onValueChange={(v) => setFormData({ ...formData, slackChannel: v })}>
                                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {SLACK_CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-xs font-medium mb-1 block">Message</label>
                                <Textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={2} />
                              </div>
                            </>
                          )}
                          {formData.type === 'discord' && (
                            <>
                              <div>
                                <label className="text-xs font-medium mb-1 block">Channel</label>
                                <Select value={formData.discordChannel} onValueChange={(v) => setFormData({ ...formData, discordChannel: v })}>
                                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {DISCORD_CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-xs font-medium mb-1 block">Message</label>
                                <Textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={2} />
                              </div>
                            </>
                          )}
                          {formData.type === 'email' && (
                            <>
                              <div>
                                <label className="text-xs font-medium mb-1 block">To</label>
                                <Input value={formData.emailTo} onChange={(e) => setFormData({ ...formData, emailTo: e.target.value })} className="h-9" />
                              </div>
                              <div>
                                <label className="text-xs font-medium mb-1 block">Subject</label>
                                <Input value={formData.emailSubject} onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })} className="h-9" />
                              </div>
                              <div>
                                <label className="text-xs font-medium mb-1 block">Message</label>
                                <Textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={2} />
                              </div>
                            </>
                          )}
                          <Button 
                            size="sm" 
                            className="w-full gap-2"
                            onClick={handleSaveEdit}
                            disabled={saving}
                          >
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Save Action
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Executions - Show output directly */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h3 className="text-sm font-medium">Recent Runs</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs gap-1"
                    onClick={() => navigate('/executions')}
                  >
                    View All <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
                
                {loadingExecutions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : automationExecutions.length > 0 ? (
                  <div className="divide-y divide-border">
                    {automationExecutions.map((exec) => {
                      const started = new Date(exec.started_at);
                      const isSelected = selectedExecutionId === exec.id;
                      const outputData = exec.output_data as Record<string, unknown> | null;
                      const hasResearchOutput = outputData && typeof outputData === 'object' && 'content' in outputData;
                      const outputContent = hasResearchOutput ? (outputData as { content: string }).content : null;
                      
                      return (
                        <div key={exec.id}>
                          <button
                            className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${isSelected ? 'bg-muted/30' : ''}`}
                            onClick={() => setSelectedExecutionId(isSelected ? null : exec.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {exec.status === 'completed' ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : exec.status === 'failed' ? (
                                  <XCircle className="w-4 h-4 text-destructive" />
                                ) : exec.status === 'running' ? (
                                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                ) : (
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                )}
                                <div>
                                  <p className="text-sm font-medium">
                                    {formatTime(exec.started_at)} · {started.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {exec.status === 'completed' ? 'Success' : exec.status}
                                    {exec.duration_ms && ` · ${Math.floor(exec.duration_ms / 1000)}s`}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                            </div>
                          </button>
                          
                          {/* Expanded Output */}
                          {isSelected && exec.status === 'completed' && outputData && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="px-4 pb-4"
                            >
                              <div className="rounded-lg bg-muted/50 p-4">
                                {outputContent ? (
                                  <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                      {outputContent}
                                    </div>
                                    {(outputData as { citations?: string[] }).citations && (
                                      <div className="mt-4 pt-3 border-t border-border">
                                        <p className="text-xs text-muted-foreground mb-2">Sources</p>
                                        <div className="flex flex-wrap gap-2">
                                          {(outputData as { citations: string[] }).citations.slice(0, 5).map((url, i) => (
                                            <a
                                              key={i}
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-primary hover:underline flex items-center gap-1"
                                            >
                                              <ExternalLink className="w-3 h-3" />
                                              Source {i + 1}
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <pre className="text-xs overflow-auto max-h-48">
                                    {JSON.stringify(outputData, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No runs yet. Click "Execute Now" to test.
                  </div>
                )}
              </div>

              {/* Execute Button */}
              <Button 
                className="w-full gap-2"
                onClick={handleExecute}
                disabled={executing}
              >
                <Zap className="w-4 h-4" />
                {executing ? 'Starting…' : 'Execute Now'}
              </Button>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Schedule Dialog for activating one-time automations */}
        <Dialog open={showScheduleDialog} onOpenChange={(open) => {
          setShowScheduleDialog(open);
          if (!open) setPendingActivation(null);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Schedule</DialogTitle>
              <DialogDescription>
                Choose when this automation should run.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Frequency</label>
                <Select 
                  value={formData.frequency === 'one_time' ? 'daily' : formData.frequency}
                  onValueChange={(v) => setFormData({ ...formData, frequency: v as FrequencyType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Time ({getTimezoneAbbr()})
                </label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>

              {formData.frequency === 'weekly' && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Day of Week</label>
                  <Select 
                    value={formData.dayOfWeek}
                    onValueChange={(v) => setFormData({ ...formData, dayOfWeek: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.frequency === 'monthly' && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Day of Month</label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dayOfMonth}
                    onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowScheduleDialog(false);
                setPendingActivation(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleConfirmActivation} disabled={togglingId !== null}>
                {togglingId ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Enable Automation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default ScheduledActions;
