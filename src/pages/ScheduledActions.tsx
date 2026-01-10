import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowDown, GitBranch, Play, Zap, ChevronRight, ArrowLeft, Trash2, Loader2, Plus, MessageSquare, Pencil, Save, Search, Mail, Hash, Power } from 'lucide-react';
import { ScheduledAction, ScheduledActionStep } from '@/types/agent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AppLayout } from '@/components/AppLayout';
import { useAutomations } from '@/hooks/useAutomations';
import { useTimezone } from '@/hooks/useTimezone';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
      case 'condition':
        return 'border-yellow-400/30 bg-yellow-400/5';
      case 'action':
        return 'border-green-400/30 bg-green-400/5';
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

type AutomationType = 'text' | 'research' | 'email' | 'slack';

interface AutomationFormData {
  name: string;
  type: AutomationType;
  message: string;
  // Research specific
  researchQuery: string;
  researchOutputFormat: string;
  // Email specific
  emailTo: string;
  emailSubject: string;
  // Slack specific
  slackChannel: string;
  // Scheduling
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  dayOfWeek: string;
  dayOfMonth: string;
  webhookUrl: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AUTOMATION_TYPES = [
  { id: 'text' as const, label: 'Send Text', icon: MessageSquare, description: 'Send SMS via n8n webhook' },
  { id: 'research' as const, label: 'Research', icon: Search, description: 'AI-powered research via Perplexity' },
  { id: 'email' as const, label: 'Send Email', icon: Mail, description: 'Send email via Gmail webhook' },
  { id: 'slack' as const, label: 'Slack Message', icon: Hash, description: 'Post to Slack channel' },
];

// Helper to extract data from automation steps
function extractFromSteps(steps: ScheduledActionStep[]): Partial<AutomationFormData> {
  const actionStep = steps.find(s => s.type === 'action');
  const triggerStep = steps.find(s => s.type === 'trigger');
  const label = triggerStep?.label || '';
  
  // Extract type
  let type: AutomationType = 'text';
  const config = actionStep?.config as Record<string, unknown> | undefined;
  if (config?.action_type === 'research') type = 'research';
  else if (config?.action_type === 'send_email') type = 'email';
  else if (config?.action_type === 'slack_message') type = 'slack';
  
  // Extract message
  const message = (config?.message as string) || '';
  
  // Extract research fields
  const researchQuery = (config?.query as string) || '';
  const researchOutputFormat = (config?.output_format as string) || 'summary';
  
  // Extract email fields
  const emailTo = (config?.to as string) || '';
  const emailSubject = (config?.subject as string) || '';
  
  // Extract slack fields
  const slackChannel = (config?.channel as string) || '';
  
  // Parse trigger
  let frequency: 'daily' | 'weekly' | 'monthly' = 'daily';
  let time = '09:00';
  let dayOfWeek = 'Monday';
  let dayOfMonth = '1';
  
  const timeMatch = label.match(/at\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2];
    const period = timeMatch[3]?.toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    time = `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  
  if (label.toLowerCase().includes('every') && DAYS_OF_WEEK.some(d => label.includes(d))) {
    frequency = 'weekly';
    dayOfWeek = DAYS_OF_WEEK.find(d => label.includes(d)) || 'Monday';
  } else if (label.toLowerCase().includes('monthly')) {
    frequency = 'monthly';
    const dayMatch = label.match(/day\s+(\d+)/i);
    if (dayMatch) dayOfMonth = dayMatch[1];
  }
  
  return { type, message, researchQuery, researchOutputFormat, emailTo, emailSubject, slackChannel, frequency, time, dayOfWeek, dayOfMonth };
}

const ScheduledActions = () => {
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
    emailTo: '',
    emailSubject: '',
    slackChannel: '',
    frequency: 'daily',
    time: '09:00',
    dayOfWeek: 'Monday',
    dayOfMonth: '1',
    webhookUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  const { automations, loading, executeAutomation, deleteAutomation, createAutomation, updateAutomation } = useAutomations();
  const { formatTime, getTimezoneAbbr } = useTimezone();

  const handleExecute = async () => {
    if (!selectedAutomation) return;
    setExecuting(true);
    try {
      await executeAutomation(selectedAutomation.id);
      toast.success('Automation executed successfully');
    } catch (err) {
      toast.error('Failed to execute automation');
    } finally {
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

  const buildTriggerLabel = () => {
    const timeFormatted = formatTime(formData.time);
    const tzAbbr = getTimezoneAbbr();
    
    if (formData.frequency === 'weekly') {
      return `Every ${formData.dayOfWeek} at ${timeFormatted} ${tzAbbr}`;
    } else if (formData.frequency === 'monthly') {
      return `Monthly on day ${formData.dayOfMonth} at ${timeFormatted} ${tzAbbr}`;
    }
    return `Daily at ${timeFormatted} ${tzAbbr}`;
  };

  const buildActionLabel = () => {
    switch (formData.type) {
      case 'research':
        return `Research: "${formData.researchQuery.substring(0, 30)}${formData.researchQuery.length > 30 ? '...' : ''}"`;
      case 'email':
        return `Email to: ${formData.emailTo || '(enter email)'}`;
      case 'slack':
        return `Slack #${formData.slackChannel || '(enter channel)'}`;
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
        return `Email to ${formData.emailTo}: "${formData.emailSubject}"`;
      case 'slack':
        return `Slack #${formData.slackChannel}: "${formData.message}"`;
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
      default:
        return formData.message.trim().length > 0;
    }
  };

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
      }

      await createAutomation({
        name: formData.name,
        description: getDescription(),
        triggerType: 'schedule',
        triggerConfig,
        steps: buildSteps(),
        n8nWebhookUrl: formData.webhookUrl || undefined,
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
      emailTo: '',
      emailSubject: '',
      slackChannel: '',
      frequency: 'daily',
      time: '09:00',
      dayOfWeek: 'Monday',
      dayOfMonth: '1',
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
    const extracted = extractFromSteps(selectedAutomation.steps);
    setFormData({
      name: selectedAutomation.name,
      type: extracted.type || 'text',
      message: extracted.message || '',
      researchQuery: extracted.researchQuery || '',
      researchOutputFormat: extracted.researchOutputFormat || 'summary',
      emailTo: extracted.emailTo || '',
      emailSubject: extracted.emailSubject || '',
      slackChannel: extracted.slackChannel || '',
      frequency: extracted.frequency || 'daily',
      time: extracted.time || '09:00',
      dayOfWeek: extracted.dayOfWeek || 'Monday',
      dayOfMonth: extracted.dayOfMonth || '1',
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
            {AUTOMATION_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.type === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setFormData({ ...formData, type: type.id })}
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
                <label className="text-sm font-medium mb-1.5 block">Research Query</label>
                <Textarea
                  placeholder="What do you want to research? e.g., Latest AI developments this week"
                  value={formData.researchQuery}
                  onChange={(e) => setFormData({ ...formData, researchQuery: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Output Format</label>
                <Select 
                  value={formData.researchOutputFormat} 
                  onValueChange={(v) => setFormData({ ...formData, researchOutputFormat: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary (brief overview)</SelectItem>
                    <SelectItem value="detailed">Detailed (in-depth analysis)</SelectItem>
                    <SelectItem value="bullets">Bullet Points</SelectItem>
                    <SelectItem value="actionable">Actionable Insights</SelectItem>
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
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">#</span>
                  <Input
                    placeholder="general"
                    value={formData.slackChannel}
                    onChange={(e) => setFormData({ ...formData, slackChannel: e.target.value })}
                    className="pl-7"
                  />
                </div>
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

          {/* Scheduling */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Frequency</label>
              <Select 
                value={formData.frequency} 
                onValueChange={(v) => setFormData({ ...formData, frequency: v as 'daily' | 'weekly' | 'monthly' })}
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

          <div>
            <label className="text-sm font-medium mb-1.5 block">n8n Webhook URL (optional)</label>
            <Input
              placeholder="https://your-n8n.com/webhook/..."
              value={formData.webhookUrl}
              onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.type === 'research' 
                ? 'Research is done internally via Perplexity. Webhook optional for forwarding results.'
                : 'When executed, this webhook will be called with the action payload'}
            </p>
          </div>
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
      <div className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(selectedAutomation.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          )}
          {!selectedAutomation && !showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New
            </Button>
          )}
        </div>

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
              ) : automations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    No automations yet.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 mb-4">
                    Create one manually or talk to the agent!
                  </p>
                  <Button onClick={() => setShowCreateForm(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Automation
                  </Button>
                </div>
              ) : (
                automations.map((action, index) => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all group"
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
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className={`font-semibold truncate ${action.isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {action.name}
                          </h3>
                        </div>
                        {action.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{action.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {action.steps.length} steps{action.steps[0] && ` • ${action.steps[0].label}`}
                        </p>
                      </button>

                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          ) : (
            /* Automation Detail View */
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Status toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3">
                  <Power className={`w-5 h-5 ${selectedAutomation.isActive ? 'text-green-400' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="font-medium">
                      {selectedAutomation.isActive ? 'Automation Active' : 'Automation Disabled'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAutomation.isActive ? 'Will run on schedule' : 'Will not run until enabled'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={selectedAutomation.isActive}
                  onCheckedChange={() => handleToggleActive(selectedAutomation, { stopPropagation: () => {} } as React.MouseEvent)}
                  disabled={togglingId === selectedAutomation.id}
                />
              </div>

              {/* Description */}
              {selectedAutomation.description && (
                <p className="text-sm text-muted-foreground">{selectedAutomation.description}</p>
              )}

              {/* Sequence visualization */}
              {selectedAutomation.steps.length > 0 ? (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Sequence Flow</h3>
                  <div className="space-y-0">
                    {selectedAutomation.steps.map((step, index) => (
                      <ActionStepNode key={step.id} step={step} isFirst={index === 0} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <p className="text-sm text-muted-foreground">No steps defined for this automation</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={startEditing}
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
                <Button 
                  className="flex-1 gap-2"
                  onClick={handleExecute}
                  disabled={executing}
                >
                  {executing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {executing ? 'Executing...' : 'Execute Now'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default ScheduledActions;
