import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, ChevronRight, Webhook, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sequence } from '@/types/sequence';

interface SequencesManagerProps {
  sequences: Sequence[];
  onAdd: (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<Sequence>) => void;
  onDelete: (id: string) => void;
}

export function SequencesManager({ sequences, onAdd, onUpdate, onDelete }: SequencesManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSequence, setNewSequence] = useState({
    name: '',
    description: '',
    n8nWebhookUrl: '',
  });

  const handleAdd = () => {
    if (!newSequence.name.trim()) return;
    onAdd({
      name: newSequence.name.trim(),
      description: newSequence.description.trim() || undefined,
      n8nWebhookUrl: newSequence.n8nWebhookUrl.trim() || undefined,
      steps: [],
    });
    setNewSequence({ name: '', description: '', n8nWebhookUrl: '' });
    setIsAdding(false);
  };

  const handleUpdateSequence = (id: string, field: keyof Sequence, value: string) => {
    onUpdate(id, { [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Sequences</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create tools for ElevenLabs to trigger n8n workflows
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border border-border rounded-lg p-3 space-y-3 bg-secondary/30">
              <div className="space-y-2">
                <Input
                  placeholder="Sequence name (e.g., Research Topic)"
                  value={newSequence.name}
                  onChange={(e) => setNewSequence((prev) => ({ ...prev, name: e.target.value }))}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Description (optional)"
                  value={newSequence.description}
                  onChange={(e) => setNewSequence((prev) => ({ ...prev, description: e.target.value }))}
                  className="h-8 text-sm"
                />
                <div className="flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    placeholder="n8n Webhook URL"
                    value={newSequence.n8nWebhookUrl}
                    onChange={(e) => setNewSequence((prev) => ({ ...prev, n8nWebhookUrl: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAdding(false);
                    setNewSequence({ name: '', description: '', n8nWebhookUrl: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAdd} disabled={!newSequence.name.trim()}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {sequences.length === 0 && !isAdding ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6 text-sm text-muted-foreground"
          >
            No sequences yet. Add one to create an ElevenLabs tool.
          </motion.div>
        ) : (
          <div className="space-y-2">
            {sequences.map((sequence) => (
              <motion.div
                key={sequence.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="border border-border rounded-lg p-3 bg-background hover:bg-secondary/20 transition-colors"
              >
                {editingId === sequence.id ? (
                  <div className="space-y-2">
                    <Input
                      value={sequence.name}
                      onChange={(e) => handleUpdateSequence(sequence.id, 'name', e.target.value)}
                      className="h-8 text-sm font-medium"
                    />
                    <Input
                      placeholder="Description"
                      value={sequence.description || ''}
                      onChange={(e) => handleUpdateSequence(sequence.id, 'description', e.target.value)}
                      className="h-8 text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Webhook className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <Input
                        placeholder="n8n Webhook URL"
                        value={sequence.n8nWebhookUrl || ''}
                        onChange={(e) => handleUpdateSequence(sequence.id, 'n8nWebhookUrl', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="w-3.5 h-3.5 mr-1" />
                        Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {sequence.name}
                        </span>
                      </div>
                      {sequence.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 ml-6 truncate">
                          {sequence.description}
                        </p>
                      )}
                      {sequence.n8nWebhookUrl && (
                        <div className="flex items-center gap-1.5 mt-1 ml-6">
                          <Webhook className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate font-mono">
                            {sequence.n8nWebhookUrl}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingId(sequence.id)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onDelete(sequence.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
