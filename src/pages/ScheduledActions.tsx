import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowDown, GitBranch, Play, Zap, ChevronRight, ArrowLeft, Trash2, Loader2, Plus, MessageSquare, Pencil, X, Save } from 'lucide-react';
import { ScheduledAction, ScheduledActionStep } from '@/types/agent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface AutomationFormData {
  name: string;
  message: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  dayOfWeek: string;
  dayOfMonth: string;
  webhookUrl: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Helper to extract message from automation steps
function extractMessageFromSteps(steps: ScheduledActionStep[]): string {
  const actionStep = steps.find(s => s.type === 'action');
  if (actionStep?.config && typeof actionStep.config === 'object' && 'message' in actionStep.config) {
    return (actionStep.config as { message: string }).message || '';
  }
  return '';
}

// Helper to extract trigger config from steps
function extractTriggerFromSteps(steps: ScheduledActionStep[]): { frequency: string; time: string; dayOfWeek: string; dayOfMonth: string } {
  const triggerStep = steps.find(s => s.type === 'trigger');
  const label = triggerStep?.label || '';
  
  // Parse the trigger label to extract frequency, time, day
  let frequency = 'daily';
  let time = '09:00';
  let dayOfWeek = 'Monday';
  let dayOfMonth = '1';
  
  // Try to extract time from label like "Every Monday at 5:00 PM"
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
  
  return { frequency, time, dayOfWeek, dayOfMonth };
}

const ScheduledActions = () => {
  const [selectedAutomation, setSelectedAutomation] = useState<ScheduledAction | null>(null);
  const [executing, setExecuting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<AutomationFormData>({
    name: '',
    message: '',
    frequency: 'daily',
    time: '09:00',
    dayOfWeek: 'Monday',
    dayOfMonth: '1',
    webhookUrl: '',
  });
  const [saving, setSaving] = useState(false);
  
  const { automations, loading, executeAutomation, deleteAutomation, createAutomation, updateAutomation } = useAutomations();
  const { formatTime, getTimezoneAbbr } = useTimezone();

  // When selecting an automation, populate form data for editing
  useEffect(() => {
    if (selectedAutomation && isEditing) {
      const triggerData = extractTriggerFromSteps(selectedAutomation.steps);
      setFormData({
        name: selectedAutomation.name,
        message: extractMessageFromSteps(selectedAutomation.steps),
        frequency: triggerData.frequency as 'daily' | 'weekly' | 'monthly',
        time: triggerData.time,
        dayOfWeek: triggerData.dayOfWeek,
        dayOfMonth: triggerData.dayOfMonth,
        webhookUrl: '', // We'd need to fetch this from DB if needed
      });
    }
  }, [selectedAutomation, isEditing]);

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

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.message.trim()) {
      toast.error('Please fill in name and message');
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

      const steps: ScheduledActionStep[] = [
        {
          id: crypto.randomUUID(),
          type: 'trigger',
          label: buildTriggerLabel(),
        },
        {
          id: crypto.randomUUID(),
          type: 'action',
          label: `Send text: "${formData.message.substring(0, 40)}${formData.message.length > 40 ? '...' : ''}"`,
          config: {
            action_type: 'send_text',
            message: formData.message,
          },
        },
      ];

      await createAutomation({
        name: formData.name,
        description: `Scheduled text: "${formData.message}"`,
        triggerType: 'schedule',
        triggerConfig,
        steps,
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
    if (!selectedAutomation || !formData.name.trim() || !formData.message.trim()) {
      toast.error('Please fill in name and message');
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

      const steps: ScheduledActionStep[] = [
        {
          id: crypto.randomUUID(),
          type: 'trigger',
          label: buildTriggerLabel(),
        },
        {
          id: crypto.randomUUID(),
          type: 'action',
          label: `Send text: "${formData.message.substring(0, 40)}${formData.message.length > 40 ? '...' : ''}"`,
          config: {
            action_type: 'send_text',
            message: formData.message,
          },
        },
      ];

      await updateAutomation(selectedAutomation.id, {
        name: formData.name,
        description: `Scheduled text: "${formData.message}"`,
        triggerConfig,
        steps,
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
      message: '',
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
    const triggerData = extractTriggerFromSteps(selectedAutomation.steps);
    setFormData({
      name: selectedAutomation.name,
      message: extractMessageFromSteps(selectedAutomation.steps),
      frequency: triggerData.frequency as 'daily' | 'weekly' | 'monthly',
      time: triggerData.time,
      dayOfWeek: triggerData.dayOfWeek,
      dayOfMonth: triggerData.dayOfMonth,
      webhookUrl: '',
    });
    setIsEditing(true);
  };

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
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Text Sequence</h3>
            <p className="text-xs text-muted-foreground">Send scheduled text messages</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Name</label>
            <Input
              placeholder="e.g., Morning Reminder"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Message</label>
            <Textarea
              placeholder="The message to send..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
            />
          </div>

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
              When executed, this webhook will be called to actually send the text
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
            step={{ 
              id: '2', 
              type: 'action', 
              label: formData.message 
                ? `Send text: "${formData.message.substring(0, 40)}${formData.message.length > 40 ? '...' : ''}"` 
                : 'Send text: (enter message above)'
            }} 
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
          disabled={saving || !formData.name.trim() || !formData.message.trim()}
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
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedAutomation(action)}
                    className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-card/80 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{action.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                            action.isActive 
                              ? 'bg-green-400/10 text-green-400'
                              : 'bg-secondary text-muted-foreground'
                          }`}>
                            {action.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {action.description && (
                          <p className="text-sm text-muted-foreground">{action.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {action.steps.length} steps{action.steps[0] && ` • ${action.steps[0].label}`}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-4" />
                    </div>
                  </motion.button>
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
              {/* Status and description */}
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedAutomation.isActive 
                    ? 'bg-green-400/10 text-green-400'
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {selectedAutomation.isActive ? 'Active' : 'Inactive'}
                </span>
                {selectedAutomation.description && (
                  <p className="text-sm text-muted-foreground">{selectedAutomation.description}</p>
                )}
              </div>

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
