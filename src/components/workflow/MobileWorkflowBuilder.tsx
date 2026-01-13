import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, Play, Save, Loader2, Trash2, 
  ChevronDown, ChevronUp, GripVertical, Clock, 
  Search, Mail, MessageSquare, Zap, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { WorkflowNode, WorkflowNodeType, Workflow } from '@/types/workflow';
import { cn } from '@/lib/utils';

interface MobileWorkflowBuilderProps {
  workflow?: Partial<Workflow>;
  onSave: (workflow: Partial<Workflow>) => Promise<void>;
  onExecute?: () => Promise<void>;
  onBack: () => void;
  isExecuting?: boolean;
  executingNodeId?: string | null;
  completedNodeIds?: string[];
}

const NODE_TYPES: { type: WorkflowNodeType; label: string; icon: React.ReactNode; category: string }[] = [
  { type: 'trigger_schedule', label: 'Schedule', icon: <Clock className="w-4 h-4" />, category: 'Triggers' },
  { type: 'trigger_webhook', label: 'Webhook', icon: <Zap className="w-4 h-4" />, category: 'Triggers' },
  { type: 'action_research', label: 'Research', icon: <Search className="w-4 h-4" />, category: 'Actions' },
  { type: 'action_email', label: 'Send Email', icon: <Mail className="w-4 h-4" />, category: 'Actions' },
  { type: 'action_slack', label: 'Slack', icon: <MessageSquare className="w-4 h-4" />, category: 'Actions' },
  { type: 'action_text', label: 'Send Text', icon: <MessageSquare className="w-4 h-4" />, category: 'Actions' },
  { type: 'action_delay', label: 'Delay', icon: <Timer className="w-4 h-4" />, category: 'Logic' },
];

export function MobileWorkflowBuilder({
  workflow,
  onSave,
  onExecute,
  onBack,
  isExecuting = false,
  executingNodeId,
  completedNodeIds = [],
}: MobileWorkflowBuilderProps) {
  const [name, setName] = useState(workflow?.name || 'Untitled Workflow');
  const [description, setDescription] = useState(workflow?.description || '');
  const [isActive, setIsActive] = useState(workflow?.isActive ?? true);
  const [steps, setSteps] = useState<WorkflowNode[]>(workflow?.nodes || []);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);

  const addStep = useCallback((type: WorkflowNodeType) => {
    const label = NODE_TYPES.find(n => n.type === type)?.label || 'Step';
    const newStep: WorkflowNode = {
      id: crypto.randomUUID(),
      type,
      label,
      position: { x: 0, y: steps.length * 100 },
      config: getDefaultConfig(type),
    };
    setSteps(prev => [...prev, newStep]);
    setExpandedStepId(newStep.id);
    setShowAddStep(false);
  }, [steps.length]);

  const updateStep = useCallback((id: string, updates: Partial<WorkflowNode>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteStep = useCallback((id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
    if (expandedStepId === id) {
      setExpandedStepId(null);
    }
  }, [expandedStepId]);

  const moveStep = useCallback((id: string, direction: 'up' | 'down') => {
    setSteps(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newSteps = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [newSteps[index], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[index]];
      return newSteps;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Generate connections from sequential steps
      const connections = steps.slice(0, -1).map((step, i) => ({
        id: crypto.randomUUID(),
        sourceId: step.id,
        targetId: steps[i + 1].id,
      }));

      await onSave({
        ...workflow,
        name,
        description,
        isActive,
        nodes: steps,
        connections,
      });
    } finally {
      setIsSaving(false);
    }
  }, [workflow, name, description, isActive, steps, onSave]);

  const getStepStatus = (stepId: string) => {
    if (completedNodeIds.includes(stepId)) return 'completed';
    if (executingNodeId === stepId) return 'running';
    return 'pending';
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 font-semibold border-none bg-transparent p-0 focus-visible:ring-0"
            placeholder="Workflow name"
          />
        </div>
        <div className="flex items-center gap-2">
          {onExecute && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExecute}
              disabled={isExecuting || steps.length === 0}
            >
              {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* Active Toggle & Natural Language Input */}
      <div className="px-4 py-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="active-toggle">Active</Label>
          <Switch id="active-toggle" checked={isActive} onCheckedChange={setIsActive} />
        </div>
        <div className="space-y-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you want automated in plain language... e.g. 'Every morning at 9am, research the latest AI news and send it to my email'"
            className="resize-none h-24"
          />
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full gap-2"
            onClick={() => {
              // TODO: Call AI to parse natural language and generate steps
              if (description.trim()) {
                // For now, add a placeholder step
                const newStep: WorkflowNode = {
                  id: crypto.randomUUID(),
                  type: 'action_research',
                  label: 'AI Generated Step',
                  position: { x: 0, y: steps.length * 100 },
                  config: { query: description },
                };
                setSteps(prev => [...prev, newStep]);
                setExpandedStepId(newStep.id);
              }
            }}
            disabled={!description.trim()}
          >
            <Zap className="w-4 h-4" />
            Generate from Description
          </Button>
        </div>
      </div>

      {/* Steps List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {steps.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No steps yet</p>
              <p className="text-sm text-muted-foreground">Add your first step below</p>
            </div>
          ) : (
            <AnimatePresence>
              {steps.map((step, index) => {
                const nodeInfo = NODE_TYPES.find(n => n.type === step.type);
                const status = getStepStatus(step.id);
                const isExpanded = expandedStepId === step.id;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    layout
                  >
                    <Card className={cn(
                      'transition-all',
                      status === 'running' && 'border-primary ring-2 ring-primary/20',
                      status === 'completed' && 'border-green-500/50 bg-green-500/5'
                    )}>
                      <CardHeader className="p-3 cursor-pointer" onClick={() => setExpandedStepId(isExpanded ? null : step.id)}>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); moveStep(step.id, 'up'); }}
                              disabled={index === 0}
                            >
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); moveStep(step.id, 'down'); }}
                              disabled={index === steps.length - 1}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </div>

                          <div className={cn(
                            'p-2 rounded-lg',
                            status === 'completed' ? 'bg-green-500/20' : 'bg-primary/10'
                          )}>
                            {status === 'running' ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : (
                              nodeInfo?.icon
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{step.label}</p>
                            <p className="text-xs text-muted-foreground capitalize">{step.type.replace('_', ' ')}</p>
                          </div>

                          <Badge variant={status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {index + 1}
                          </Badge>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent className="px-3 pb-3 pt-0 space-y-3">
                          <div>
                            <Label>Label</Label>
                            <Input
                              value={step.label}
                              onChange={(e) => updateStep(step.id, { label: e.target.value })}
                              className="mt-1"
                            />
                          </div>

                          {/* Step-specific config */}
                          <StepConfig step={step} onUpdate={(config) => updateStep(step.id, { config: { ...step.config, ...config } })} />

                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={() => deleteStep(step.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove Step
                          </Button>
                        </CardContent>
                      )}
                    </Card>

                    {/* Connector line */}
                    {index < steps.length - 1 && (
                      <div className="flex justify-center py-1">
                        <div className="w-0.5 h-4 bg-border" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Add Step Button */}
      <div className="p-4 border-t border-border bg-background">
        <Sheet open={showAddStep} onOpenChange={setShowAddStep}>
          <SheetTrigger asChild>
            <Button className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Step
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh]">
            <SheetHeader>
              <SheetTitle>Add a Step</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-full mt-4">
              <div className="space-y-4 pb-8">
                {/* Show Triggers only if no steps yet, otherwise show Actions/Logic */}
                {steps.length === 0 ? (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Start with a Trigger</p>
                    <div className="grid grid-cols-2 gap-2">
                      {NODE_TYPES.filter(n => n.category === 'Triggers').map(node => (
                        <Button
                          key={node.type}
                          variant="outline"
                          className="justify-start gap-2 h-auto py-3"
                          onClick={() => addStep(node.type)}
                        >
                          {node.icon}
                          {node.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  ['Actions', 'Logic'].map(category => {
                    const categoryNodes = NODE_TYPES.filter(n => n.category === category);
                    if (categoryNodes.length === 0) return null;

                    return (
                      <div key={category}>
                        <p className="text-sm font-medium text-muted-foreground mb-2">{category}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {categoryNodes.map(node => (
                            <Button
                              key={node.type}
                              variant="outline"
                              className="justify-start gap-2 h-auto py-3"
                              onClick={() => addStep(node.type)}
                            >
                              {node.icon}
                              {node.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

// Step-specific configuration component
function StepConfig({ step, onUpdate }: { step: WorkflowNode; onUpdate: (config: Record<string, unknown>) => void }) {
  switch (step.type) {
    case 'trigger_schedule':
      return (
        <div className="space-y-3">
          <div>
            <Label>Frequency</Label>
            <Select value={step.config?.frequency as string || 'daily'} onValueChange={(v) => onUpdate({ frequency: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Time</Label>
            <Input
              type="time"
              value={step.config?.time as string || '09:00'}
              onChange={(e) => onUpdate({ time: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      );

    case 'action_research':
      return (
        <div className="space-y-3">
          <div>
            <Label>Research Query</Label>
            <Textarea
              value={step.config?.query as string || ''}
              onChange={(e) => onUpdate({ query: e.target.value })}
              placeholder="What should be researched?"
              className="mt-1"
            />
          </div>
        </div>
      );

    case 'action_email':
    case 'action_text':
      return (
        <div className="space-y-3">
          <div>
            <Label>To</Label>
            <Input
              value={step.config?.to as string || ''}
              onChange={(e) => onUpdate({ to: e.target.value })}
              placeholder={step.type === 'action_email' ? 'email@example.com' : '+1234567890'}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              value={step.config?.message as string || ''}
              onChange={(e) => onUpdate({ message: e.target.value })}
              placeholder="Use {{result}} to include previous step output"
              className="mt-1"
            />
          </div>
        </div>
      );

    case 'action_slack':
      return (
        <div className="space-y-3">
          <div>
            <Label>Channel</Label>
            <Select value={step.config?.channel as string || 'general'} onValueChange={(v) => onUpdate({ channel: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">#general</SelectItem>
                <SelectItem value="team">#team</SelectItem>
                <SelectItem value="alerts">#alerts</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              value={step.config?.message as string || ''}
              onChange={(e) => onUpdate({ message: e.target.value })}
              placeholder="Use {{result}} to include previous step output"
              className="mt-1"
            />
          </div>
        </div>
      );

    case 'action_delay':
      return (
        <div>
          <Label>Delay (minutes)</Label>
          <Input
            type="number"
            value={step.config?.delayMinutes as number || 5}
            onChange={(e) => onUpdate({ delayMinutes: parseInt(e.target.value) || 5 })}
            className="mt-1"
          />
        </div>
      );

    default:
      return null;
  }
}

function getDefaultConfig(type: WorkflowNodeType): Record<string, unknown> {
  switch (type) {
    case 'trigger_schedule':
      return { frequency: 'daily', time: '09:00' };
    case 'action_research':
      return { query: '', outputFormat: 'problem' };
    case 'action_delay':
      return { delayMinutes: 5 };
    default:
      return {};
  }
}
