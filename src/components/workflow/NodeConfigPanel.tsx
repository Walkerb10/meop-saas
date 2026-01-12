import { WorkflowNode, WorkflowNodeConfig, WorkflowNodeType } from '@/types/workflow';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save } from 'lucide-react';

interface NodeConfigPanelProps {
  node: WorkflowNode | null;
  onUpdate: (updates: Partial<WorkflowNode>) => void;
  onClose: () => void;
}

const OUTPUT_FORMATS = [
  { value: 'summary', label: 'Summary' },
  { value: 'detailed', label: 'Detailed Report' },
  { value: 'bullets', label: 'Bullet Points' },
  { value: 'actionable', label: 'Actionable Steps' },
  { value: 'problem', label: 'Problem Framework' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  if (!node) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">No Node Selected</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click a node to configure it
          </p>
        </div>
      </div>
    );
  }

  const updateConfig = (key: keyof WorkflowNodeConfig, value: unknown) => {
    onUpdate({
      config: { ...node.config, [key]: value }
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground">{node.label}</h3>
          <p className="text-xs text-muted-foreground capitalize">
            {node.type.replace('_', ' ')}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Config form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Node label */}
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={node.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Node label"
          />
        </div>

        {/* Type-specific config */}
        {renderTypeConfig(node, updateConfig)}
      </div>
    </div>
  );
}

function renderTypeConfig(
  node: WorkflowNode, 
  updateConfig: (key: keyof WorkflowNodeConfig, value: unknown) => void
) {
  switch (node.type) {
    case 'trigger_schedule':
      return (
        <>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select
              value={node.config.frequency || 'daily'}
              onValueChange={(v) => updateConfig('frequency', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Time</Label>
            <Input
              type="time"
              value={node.config.time || '09:00'}
              onChange={(e) => updateConfig('time', e.target.value)}
            />
          </div>

          {node.config.frequency === 'weekly' && (
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={node.config.dayOfWeek || 'Monday'}
                onValueChange={(v) => updateConfig('dayOfWeek', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {node.config.frequency === 'monthly' && (
            <div className="space-y-2">
              <Label>Day of Month</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={node.config.dayOfMonth || '1'}
                onChange={(e) => updateConfig('dayOfMonth', e.target.value)}
              />
            </div>
          )}
        </>
      );

    case 'trigger_webhook':
      return (
        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <Input
            value={node.config.webhookUrl || ''}
            onChange={(e) => updateConfig('webhookUrl', e.target.value)}
            placeholder="https://..."
            readOnly
          />
          <p className="text-xs text-muted-foreground">
            This URL will be generated when you save the workflow
          </p>
        </div>
      );

    case 'trigger_voice':
      return (
        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
          <p className="text-sm text-muted-foreground">
            This workflow will trigger when you say the associated voice command.
          </p>
        </div>
      );

    case 'action_research':
      return (
        <>
          <div className="space-y-2">
            <Label>Research Query</Label>
            <Textarea
              value={node.config.query || ''}
              onChange={(e) => updateConfig('query', e.target.value)}
              placeholder="What would you like to research?"
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select
                value={node.config.outputFormat || 'problem'}
                onValueChange={(v) => updateConfig('outputFormat', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_FORMATS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Words</Label>
              <Input
                type="number"
                value={node.config.outputLength || '500'}
                onChange={(e) => updateConfig('outputLength', e.target.value)}
              />
            </div>
          </div>
        </>
      );

    case 'action_text':
      return (
        <>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={node.config.phone || ''}
              onChange={(e) => updateConfig('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <MessageField node={node} updateConfig={updateConfig} />
        </>
      );

    case 'action_email':
      return (
        <>
          <div className="space-y-2">
            <Label>To (Email)</Label>
            <Input
              value={node.config.to || ''}
              onChange={(e) => updateConfig('to', e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={node.config.subject || ''}
              onChange={(e) => updateConfig('subject', e.target.value)}
              placeholder="Email subject"
            />
          </div>
          <MessageField node={node} updateConfig={updateConfig} />
        </>
      );

    case 'action_slack':
    case 'action_discord':
      return (
        <>
          <div className="space-y-2">
            <Label>Channel</Label>
            <Input
              value={node.config.channel || ''}
              onChange={(e) => updateConfig('channel', e.target.value)}
              placeholder={node.type === 'action_slack' ? '#general' : 'general'}
            />
          </div>
          <MessageField node={node} updateConfig={updateConfig} />
        </>
      );

    case 'action_delay':
      return (
        <div className="space-y-2">
          <Label>Delay (minutes)</Label>
          <Input
            type="number"
            min={1}
            value={node.config.delayMinutes || 5}
            onChange={(e) => updateConfig('delayMinutes', parseInt(e.target.value) || 5)}
          />
        </div>
      );

    case 'condition':
      return (
        <>
          <div className="space-y-2">
            <Label>Condition</Label>
            <Input
              value={node.config.condition || ''}
              onChange={(e) => updateConfig('condition', e.target.value)}
              placeholder="{{result}} contains 'important'"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Use {'{{result}}'} to reference the output from previous steps
          </p>
        </>
      );

    case 'transform':
      return (
        <div className="space-y-2">
          <Label>Transform Expression</Label>
          <Textarea
            value={node.config.transform || ''}
            onChange={(e) => updateConfig('transform', e.target.value)}
            placeholder="Transform the data..."
            className="min-h-[100px]"
          />
        </div>
      );

    default:
      return null;
  }
}

function MessageField({ 
  node, 
  updateConfig 
}: { 
  node: WorkflowNode;
  updateConfig: (key: keyof WorkflowNodeConfig, value: unknown) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Message</Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => updateConfig('message', (node.config.message || '') + '{{result}}')}
        >
          + Insert Result
        </Button>
      </div>
      <Textarea
        value={node.config.message || ''}
        onChange={(e) => updateConfig('message', e.target.value)}
        placeholder="Use {{result}} to include output from previous steps"
        className="min-h-[100px]"
      />
      <p className="text-xs text-muted-foreground">
        <code className="bg-muted px-1 py-0.5 rounded">{'{{result}}'}</code> will be replaced with the research output
      </p>
    </div>
  );
}
