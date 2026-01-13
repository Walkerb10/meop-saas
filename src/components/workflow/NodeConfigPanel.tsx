import { WorkflowNode, WorkflowNodeConfig, WorkflowNodeType } from '@/types/workflow';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Sparkles, Clock, Search, MessageSquare, Mail, Hash, Timer } from 'lucide-react';
import { getNodeDescription } from '@/components/AutomationSummary';
import { cn } from '@/lib/utils';

interface NodeConfigPanelProps {
  node: WorkflowNode | null;
  onUpdate: (updates: Partial<WorkflowNode>) => void;
  onClose: () => void;
}

const OUTPUT_FORMATS = [
  { value: 'summary', label: 'Quick Summary', desc: 'Concise overview' },
  { value: 'detailed', label: 'Detailed Report', desc: 'In-depth analysis' },
  { value: 'bullets', label: 'Bullet Points', desc: 'Easy to scan' },
  { value: 'actionable', label: 'Action Steps', desc: 'What to do next' },
  { value: 'problem', label: 'Problem Framework', desc: 'Structured approach' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Every Day', icon: '📅' },
  { value: 'weekly', label: 'Every Week', icon: '📆' },
  { value: 'monthly', label: 'Every Month', icon: '🗓️' },
  { value: 'custom', label: 'Custom', icon: '⚙️' },
];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const TYPE_ICONS: Record<WorkflowNodeType, React.ElementType> = {
  trigger_schedule: Clock,
  trigger_webhook: Sparkles,
  trigger_voice: Sparkles,
  action_research: Search,
  action_text: MessageSquare,
  action_email: Mail,
  action_slack: Hash,
  action_discord: Hash,
  action_delay: Timer,
  condition: Sparkles,
  transform: Sparkles,
};

export function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  if (!node) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">Select a Step</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[180px] mx-auto">
            Click on any node in the canvas to configure its settings
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

  const Icon = TYPE_ICONS[node.type];
  const description = getNodeDescription(node);

  return (
    <div className="h-full flex flex-col">
      {/* Header with summary */}
      <div className="p-4 border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <Input
                value={node.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                className="h-auto p-0 text-base font-semibold border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Step name"
              />
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Config form with friendly labels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Type-specific config */}
        {renderTypeConfig(node, updateConfig)}
        
        {/* Helpful tip at bottom */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            💡 Changes save automatically when you click Save
          </p>
        </div>
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
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">When should this run?</Label>
            <div className="grid grid-cols-2 gap-2">
              {FREQUENCIES.map(f => (
                <button
                  key={f.value}
                  onClick={() => updateConfig('frequency', f.value)}
                  className={cn(
                    'p-3 rounded-xl border-2 text-left transition-all',
                    node.config.frequency === f.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <span className="text-lg">{f.icon}</span>
                  <p className="text-sm font-medium mt-1">{f.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">What time?</Label>
            <Input
              type="time"
              value={node.config.time || '09:00'}
              onChange={(e) => updateConfig('time', e.target.value)}
              className="text-lg h-12"
            />
          </div>

          {node.config.frequency === 'weekly' && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Which day?</Label>
              <Select
                value={node.config.dayOfWeek || 'Monday'}
                onValueChange={(v) => updateConfig('dayOfWeek', v)}
              >
                <SelectTrigger className="h-12">
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
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Day of month</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={node.config.dayOfMonth || '1'}
                onChange={(e) => updateConfig('dayOfMonth', e.target.value)}
                className="h-12"
              />
            </div>
          )}
        </>
      );

    case 'trigger_webhook':
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Webhook URL</Label>
          <Input
            value={node.config.webhookUrl || ''}
            onChange={(e) => updateConfig('webhookUrl', e.target.value)}
            placeholder="https://..."
            readOnly
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            🔗 This URL will be generated when you save
          </p>
        </div>
      );

    case 'trigger_voice':
      return (
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <p className="text-sm text-foreground font-medium">🎤 Voice Activated</p>
          <p className="text-xs text-muted-foreground mt-1">
            This workflow runs when you give the voice command
          </p>
        </div>
      );

    case 'action_research':
      return (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">What to research?</Label>
            <Textarea
              value={node.config.query || ''}
              onChange={(e) => updateConfig('query', e.target.value)}
              placeholder="e.g., Latest AI news and breakthroughs"
              className="min-h-[100px] text-base"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Output style</Label>
            <div className="grid gap-2">
              {OUTPUT_FORMATS.map(f => (
                <button
                  key={f.value}
                  onClick={() => updateConfig('outputFormat', f.value)}
                  className={cn(
                    'p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between',
                    node.config.outputFormat === f.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                  {node.config.outputFormat === f.value && (
                    <span className="text-primary">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Target length (words)</Label>
            <Input
              type="number"
              value={node.config.outputLength || '500'}
              onChange={(e) => updateConfig('outputLength', e.target.value)}
              className="h-12"
            />
          </div>
        </>
      );

    case 'action_text':
      return (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Send to phone number</Label>
            <Input
              value={node.config.phone || ''}
              onChange={(e) => updateConfig('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="h-12 text-lg"
            />
          </div>
          <MessageField node={node} updateConfig={updateConfig} />
        </>
      );

    case 'action_email':
      return (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Send to email</Label>
            <Input
              value={node.config.to || ''}
              onChange={(e) => updateConfig('to', e.target.value)}
              placeholder="email@example.com"
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject line</Label>
            <Input
              value={node.config.subject || ''}
              onChange={(e) => updateConfig('subject', e.target.value)}
              placeholder="Your research results"
              className="h-12"
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
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Channel name</Label>
            <Input
              value={node.config.channel || ''}
              onChange={(e) => updateConfig('channel', e.target.value)}
              placeholder={node.type === 'action_slack' ? 'general' : 'general'}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              {node.type === 'action_slack' ? '💬 Without the # symbol' : '💬 Your Discord channel'}
            </p>
          </div>
          <MessageField node={node} updateConfig={updateConfig} />
        </>
      );

    case 'action_delay':
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Wait for how long?</Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              value={node.config.delayMinutes || 5}
              onChange={(e) => updateConfig('delayMinutes', parseInt(e.target.value) || 5)}
              className="h-12 text-lg w-24"
            />
            <span className="text-muted-foreground">minutes</span>
          </div>
        </div>
      );

    case 'condition':
      return (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Only continue if...</Label>
            <Input
              value={node.config.condition || ''}
              onChange={(e) => updateConfig('condition', e.target.value)}
              placeholder="{{result}} contains 'important'"
              className="h-12"
            />
          </div>
          <div className="p-3 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              💡 Use <code className="bg-background px-1.5 py-0.5 rounded font-mono">{'{{result}}'}</code> to check the output from previous steps
            </p>
          </div>
        </>
      );

    case 'transform':
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">How to transform?</Label>
          <Textarea
            value={node.config.transform || ''}
            onChange={(e) => updateConfig('transform', e.target.value)}
            placeholder="Describe how to change the data..."
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
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Message content</Label>
        <Button
          variant="secondary"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => updateConfig('message', (node.config.message || '') + '{{result}}')}
        >
          + Add Result
        </Button>
      </div>
      <Textarea
        value={node.config.message || ''}
        onChange={(e) => updateConfig('message', e.target.value)}
        placeholder="Write your message here..."
        className="min-h-[100px]"
      />
      <div className="p-3 rounded-xl bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground">
          💡 Use <code className="bg-background px-1.5 py-0.5 rounded font-mono">{'{{result}}'}</code> to include the output from research steps
        </p>
      </div>
    </div>
  );
}
