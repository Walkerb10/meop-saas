import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Plus, Trash2, GripVertical, Search, MessageSquare, Mail, 
  Hash, Clock, Play, Save, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SequenceStep, SequenceStepType, SequenceStepConfig } from '@/types/sequence';

interface SequenceBuilderProps {
  steps: SequenceStep[];
  onChange: (steps: SequenceStep[]) => void;
  onExecute?: () => void;
  isExecuting?: boolean;
}

const STEP_ICONS: Record<SequenceStepType, React.ReactNode> = {
  research: <Search className="w-4 h-4" />,
  text: <MessageSquare className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  slack: <Hash className="w-4 h-4" />,
  discord: <Hash className="w-4 h-4" />,
  delay: <Clock className="w-4 h-4" />,
};

const STEP_COLORS: Record<SequenceStepType, string> = {
  research: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  text: 'bg-green-500/10 text-green-500 border-green-500/30',
  email: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  slack: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  discord: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
  delay: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
};

const STEP_LABELS: Record<SequenceStepType, string> = {
  research: 'Research',
  text: 'Send Text',
  email: 'Send Email',
  slack: 'Slack Message',
  discord: 'Discord Message',
  delay: 'Delay',
};

const OUTPUT_FORMATS = [
  { value: 'summary', label: 'Summary (2-3 paragraphs)' },
  { value: 'detailed', label: 'Detailed Report' },
  { value: 'bullets', label: 'Bullet Points' },
  { value: 'actionable', label: 'Actionable Steps' },
  { value: 'problem', label: 'Problem Framework' },
];

export function SequenceBuilder({ steps, onChange, onExecute, isExecuting }: SequenceBuilderProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const addStep = useCallback((type: SequenceStepType) => {
    const newStep: SequenceStep = {
      id: crypto.randomUUID(),
      type,
      label: STEP_LABELS[type],
      config: type === 'research' 
        ? { outputFormat: 'problem', outputLength: '500' }
        : type === 'delay'
        ? { delayMinutes: 5 }
        : { message: '{{result}}' },
      order: steps.length,
    };
    onChange([...steps, newStep]);
    setExpandedStep(newStep.id);
  }, [steps, onChange]);

  const updateStep = useCallback((id: string, updates: Partial<SequenceStep>) => {
    onChange(steps.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [steps, onChange]);

  const updateStepConfig = useCallback((id: string, configUpdates: Partial<SequenceStepConfig>) => {
    onChange(steps.map(s => 
      s.id === id 
        ? { ...s, config: { ...s.config, ...configUpdates } }
        : s
    ));
  }, [steps, onChange]);

  const removeStep = useCallback((id: string) => {
    onChange(steps.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })));
  }, [steps, onChange]);

  const handleReorder = useCallback((newSteps: SequenceStep[]) => {
    onChange(newSteps.map((s, i) => ({ ...s, order: i })));
  }, [onChange]);

  const hasResearchStep = steps.some(s => s.type === 'research');

  return (
    <div className="space-y-4">
      {/* Steps list */}
      <Reorder.Group axis="y" values={steps} onReorder={handleReorder} className="space-y-3">
        <AnimatePresence>
          {steps.map((step, index) => (
            <Reorder.Item key={step.id} value={step}>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className={`border-l-4 ${STEP_COLORS[step.type]}`}>
                  <Collapsible 
                    open={expandedStep === step.id} 
                    onOpenChange={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                  >
                    <CardHeader className="p-3">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                        <Badge variant="outline" className="gap-1.5 font-mono text-xs">
                          {index + 1}
                        </Badge>
                        <div className={`p-1.5 rounded ${STEP_COLORS[step.type]}`}>
                          {STEP_ICONS[step.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Input
                            value={step.label}
                            onChange={(e) => updateStep(step.id, { label: e.target.value })}
                            className="h-7 text-sm font-medium border-none bg-transparent p-0 focus-visible:ring-0"
                            placeholder="Step label"
                          />
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            {expandedStep === step.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeStep(step.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4 px-4 ml-8">
                        <StepConfigEditor 
                          step={step} 
                          onUpdate={(config) => updateStepConfig(step.id, config)}
                          hasResearchBefore={index > 0 && steps.slice(0, index).some(s => s.type === 'research')}
                        />
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </motion.div>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* Connection lines between steps */}
      {steps.length > 0 && (
        <div className="flex justify-center">
          <div className="w-0.5 h-6 bg-border" />
        </div>
      )}

      {/* Add step buttons */}
      <div className="flex flex-wrap gap-2 justify-center p-4 border border-dashed border-border rounded-lg bg-secondary/20">
        <span className="w-full text-center text-xs text-muted-foreground mb-2">Add Step</span>
        
        {!hasResearchStep && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => addStep('research')}
            className="gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            Research
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => addStep('text')}
          className="gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Text
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => addStep('email')}
          className="gap-1.5"
        >
          <Mail className="w-3.5 h-3.5" />
          Email
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => addStep('slack')}
          className="gap-1.5"
        >
          <Hash className="w-3.5 h-3.5" />
          Slack
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => addStep('discord')}
          className="gap-1.5"
        >
          <Hash className="w-3.5 h-3.5" />
          Discord
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => addStep('delay')}
          className="gap-1.5"
        >
          <Clock className="w-3.5 h-3.5" />
          Delay
        </Button>
      </div>

      {/* Execute button */}
      {steps.length > 0 && onExecute && (
        <div className="flex justify-end pt-2">
          <Button onClick={onExecute} disabled={isExecuting} className="gap-2">
            <Play className="w-4 h-4" />
            {isExecuting ? 'Running...' : 'Run Sequence'}
          </Button>
        </div>
      )}
    </div>
  );
}

function StepConfigEditor({ 
  step, 
  onUpdate,
  hasResearchBefore 
}: { 
  step: SequenceStep; 
  onUpdate: (config: Partial<SequenceStepConfig>) => void;
  hasResearchBefore: boolean;
}) {
  switch (step.type) {
    case 'research':
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Research Query
            </label>
            <Textarea
              value={step.config.query || ''}
              onChange={(e) => onUpdate({ query: e.target.value })}
              placeholder="What would you like to research?"
              className="min-h-[80px] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Output Format
              </label>
              <Select
                value={step.config.outputFormat || 'problem'}
                onValueChange={(v) => onUpdate({ outputFormat: v as SequenceStepConfig['outputFormat'] })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_FORMATS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Target Words
              </label>
              <Input
                value={step.config.outputLength || '500'}
                onChange={(e) => onUpdate({ outputLength: e.target.value })}
                type="number"
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
      );

    case 'text':
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Phone Number
            </label>
            <Input
              value={step.config.phone || ''}
              onChange={(e) => onUpdate({ phone: e.target.value })}
              placeholder="+1234567890"
              className="h-9 text-sm"
            />
          </div>
          <MessageTemplateEditor 
            value={step.config.message || ''} 
            onChange={(v) => onUpdate({ message: v })}
            hasResearchBefore={hasResearchBefore}
          />
        </div>
      );

    case 'email':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                To (email)
              </label>
              <Input
                value={step.config.to || ''}
                onChange={(e) => onUpdate({ to: e.target.value })}
                placeholder="email@example.com"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Subject
              </label>
              <Input
                value={step.config.subject || ''}
                onChange={(e) => onUpdate({ subject: e.target.value })}
                placeholder="Email subject"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <MessageTemplateEditor 
            value={step.config.message || ''} 
            onChange={(v) => onUpdate({ message: v })}
            hasResearchBefore={hasResearchBefore}
          />
        </div>
      );

    case 'slack':
    case 'discord':
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Channel
            </label>
            <Input
              value={step.config.channel || ''}
              onChange={(e) => onUpdate({ channel: e.target.value })}
              placeholder={step.type === 'slack' ? '#general' : 'general'}
              className="h-9 text-sm"
            />
          </div>
          <MessageTemplateEditor 
            value={step.config.message || ''} 
            onChange={(v) => onUpdate({ message: v })}
            hasResearchBefore={hasResearchBefore}
          />
        </div>
      );

    case 'delay':
      return (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Delay (minutes)
          </label>
          <Input
            value={step.config.delayMinutes || 5}
            onChange={(e) => onUpdate({ delayMinutes: parseInt(e.target.value) || 5 })}
            type="number"
            min={1}
            className="h-9 text-sm w-32"
          />
        </div>
      );

    default:
      return null;
  }
}

function MessageTemplateEditor({ 
  value, 
  onChange,
  hasResearchBefore 
}: { 
  value: string; 
  onChange: (v: string) => void;
  hasResearchBefore: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Message
        </label>
        {hasResearchBefore && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={() => onChange(value + '{{result}}')}
          >
            <Plus className="w-3 h-3" />
            Insert Result
          </Button>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hasResearchBefore ? "Use {{result}} to include research output" : "Enter your message"}
        className="min-h-[80px] text-sm"
      />
      {hasResearchBefore && (
        <p className="text-xs text-muted-foreground mt-1.5">
          <code className="bg-muted px-1 py-0.5 rounded">{'{{result}}'}</code> will be replaced with the research output
        </p>
      )}
    </div>
  );
}
