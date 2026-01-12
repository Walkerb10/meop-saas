import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Agent, AGENT_TEMPLATES } from '@/hooks/useAgents';

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (agent: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'stats'>) => Promise<Agent>;
}

type TemplateKey = keyof typeof AGENT_TEMPLATES;

export function CreateAgentDialog({ open, onOpenChange, onCreate }: CreateAgentDialogProps) {
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSelectTemplate = (template: TemplateKey) => {
    setSelectedTemplate(template);
    setName(AGENT_TEMPLATES[template].name);
    setDescription(AGENT_TEMPLATES[template].description);
    setStep('details');
  };

  const handleCreate = async () => {
    if (!selectedTemplate || !name.trim()) return;

    setCreating(true);
    try {
      const template = AGENT_TEMPLATES[selectedTemplate];
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        template: selectedTemplate,
        status: 'active',
        config: template.defaultConfig,
        created_by: 'current_user',
      });
      // Reset and close
      setStep('template');
      setSelectedTemplate(null);
      setName('');
      setDescription('');
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  };

  const handleBack = () => {
    setStep('template');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'template' ? 'Choose a Template' : 'Configure Agent'}
          </DialogTitle>
        </DialogHeader>

        {step === 'template' ? (
          <div className="grid grid-cols-2 gap-3 py-4">
            {(Object.keys(AGENT_TEMPLATES) as TemplateKey[]).map((key) => {
              const template = AGENT_TEMPLATES[key];
              return (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectTemplate(key)}
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all text-left"
                >
                  <div className="text-3xl mb-2">{template.icon}</div>
                  <h3 className="font-medium text-sm">{template.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <div className="text-2xl">
                {selectedTemplate && AGENT_TEMPLATES[selectedTemplate].icon}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {selectedTemplate && AGENT_TEMPLATES[selectedTemplate].name} Template
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedTemplate && AGENT_TEMPLATES[selectedTemplate].description}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Agent Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Custom Agent"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What will this agent do?"
                className="min-h-[80px]"
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleCreate} disabled={creating || !name.trim()}>
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Create Agent
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
