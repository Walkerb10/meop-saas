import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Play, Pause, Trash2, Edit2, Clock, CheckCircle2, 
  XCircle, Loader2, ChevronRight, Zap
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSequences, useSequenceExecutions } from '@/hooks/useSequences';
import { SequenceBuilder } from '@/components/SequenceBuilder';
import { Sequence, SequenceStep } from '@/types/sequence';
import { format, formatDistanceToNow } from 'date-fns';

const STEP_TYPE_ICONS: Record<string, string> = {
  research: '🔍',
  text: '📱',
  email: '📧',
  slack: '💬',
  discord: '🎮',
  delay: '⏳',
};

export default function Sequences() {
  const { sequences, loading, addSequence, updateSequence, deleteSequence, executeSequence } = useSequences();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);

  // New sequence form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSteps, setNewSteps] = useState<SequenceStep[]>([]);

  const handleCreate = async () => {
    if (!newName.trim() || newSteps.length === 0) {
      toast({ variant: 'destructive', title: 'Please add a name and at least one step' });
      return;
    }

    try {
      await addSequence({
        name: newName.trim(),
        description: newDescription.trim(),
        steps: newSteps,
        triggerType: 'manual',
        isActive: true,
      });
      toast({ title: 'Sequence created!' });
      setIsCreating(false);
      setNewName('');
      setNewDescription('');
      setNewSteps([]);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to create sequence' });
    }
  };

  const handleExecute = async (id: string) => {
    setExecutingIds(prev => new Set(prev).add(id));
    try {
      await executeSequence(id);
      toast({ title: 'Sequence started!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to start sequence' });
    } finally {
      setExecutingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleToggleActive = async (sequence: Sequence) => {
    try {
      await updateSequence(sequence.id, { isActive: !sequence.isActive });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to update sequence' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSequence(id);
      toast({ title: 'Sequence deleted' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to delete sequence' });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sequences</h1>
            <p className="text-muted-foreground">
              Chain actions together: Research → Deliver to any platform
            </p>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Sequence
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Sequence</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Name</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Daily Market Report to Slack"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="What does this sequence do?"
                    className="min-h-[60px]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Steps</label>
                  <SequenceBuilder steps={newSteps} onChange={setNewSteps} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={!newName.trim() || newSteps.length === 0}>
                    Create Sequence
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sequences list */}
        {sequences.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No sequences yet</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-md">
                Create your first sequence to chain actions together. 
                For example: Research a topic and send the results to Slack, Text, and Email.
              </p>
              <Button onClick={() => setIsCreating(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Sequence
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {sequences.map((sequence) => (
                <motion.div
                  key={sequence.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card className={!sequence.isActive ? 'opacity-60' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg truncate">{sequence.name}</CardTitle>
                            <Badge variant={sequence.isActive ? 'default' : 'secondary'}>
                              {sequence.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {sequence.description && (
                            <CardDescription className="line-clamp-2">
                              {sequence.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Switch
                            checked={sequence.isActive}
                            onCheckedChange={() => handleToggleActive(sequence)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Steps preview */}
                      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                        {sequence.steps.map((step, index) => (
                          <div key={step.id} className="flex items-center">
                            <Badge variant="outline" className="gap-1.5 whitespace-nowrap">
                              <span>{STEP_TYPE_ICONS[step.type] || '📋'}</span>
                              {step.label}
                            </Badge>
                            {index < sequence.steps.length - 1 && (
                              <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {sequence.lastRunAt ? (
                            <>Last run: {formatDistanceToNow(sequence.lastRunAt, { addSuffix: true })}</>
                          ) : (
                            'Never run'
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSequence(sequence)}
                            className="gap-1.5"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(sequence.id)}
                            className="gap-1.5 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleExecute(sequence.id)}
                            disabled={executingIds.has(sequence.id) || !sequence.isActive}
                            className="gap-1.5"
                          >
                            {executingIds.has(sequence.id) ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                            Run Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Edit dialog */}
        <Dialog open={!!editingSequence} onOpenChange={(open) => !open && setEditingSequence(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Sequence</DialogTitle>
            </DialogHeader>
            {editingSequence && (
              <EditSequenceForm
                sequence={editingSequence}
                onSave={async (updates) => {
                  await updateSequence(editingSequence.id, updates);
                  setEditingSequence(null);
                  toast({ title: 'Sequence updated!' });
                }}
                onCancel={() => setEditingSequence(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function EditSequenceForm({ 
  sequence, 
  onSave, 
  onCancel 
}: { 
  sequence: Sequence; 
  onSave: (updates: Partial<Sequence>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(sequence.name);
  const [description, setDescription] = useState(sequence.description || '');
  const [steps, setSteps] = useState(sequence.steps);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ name, description, steps });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[60px]"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Steps</label>
        <SequenceBuilder steps={steps} onChange={setSteps} />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || !name.trim() || steps.length === 0}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
