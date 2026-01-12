import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Webhook, Save, X, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [newSequence, setNewSequence] = useState({
    name: '',
    description: '',
  });

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const supabaseUrl = useMemo(() => {
    return import.meta.env.VITE_SUPABASE_URL || '';
  }, []);

  const handleAdd = () => {
    if (!newSequence.name.trim()) return;
    onAdd({
      name: newSequence.name.trim(),
      description: newSequence.description.trim() || undefined,
      steps: [],
      triggerType: 'manual',
      isActive: true,
    });
    setNewSequence({ name: '', description: '' });
    setIsAdding(false);
  };

  const handleUpdateSequence = (id: string, field: keyof Sequence, value: string) => {
    onUpdate(id, { [field]: value });
  };

  const generateWebhookUrl = (sequenceId: string) => {
    return `${supabaseUrl}/functions/v1/vapi-webhook?sequence_id=${sequenceId}`;
  };

  const copyWebhookUrl = (sequenceId: string) => {
    const url = generateWebhookUrl(sequenceId);
    navigator.clipboard.writeText(url);
    setCopiedId(sequenceId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Webhooks</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create webhook URLs for your integrations
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
            <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/30">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                  <Input
                    placeholder="e.g., Research Topic, Send Report"
                    value={newSequence.name}
                    onChange={(e) => setNewSequence((prev) => ({ ...prev, name: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                  <Input
                    placeholder="What does this webhook do?"
                    value={newSequence.description}
                    onChange={(e) => setNewSequence((prev) => ({ ...prev, description: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAdding(false);
                    setNewSequence({ name: '', description: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAdd} disabled={!newSequence.name.trim()}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Create
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {sequences.length === 0 && !isAdding ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-lg"
          >
            <Webhook className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No webhooks yet</p>
            <p className="text-xs mt-1">Create one to generate a webhook URL</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {sequences.map((sequence) => (
              <motion.div
                key={sequence.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="border border-border rounded-lg bg-card overflow-hidden"
              >
                {editingId === sequence.id ? (
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                      <Input
                        value={sequence.name}
                        onChange={(e) => handleUpdateSequence(sequence.id, 'name', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                      <Input
                        placeholder="Description"
                        value={sequence.description || ''}
                        onChange={(e) => handleUpdateSequence(sequence.id, 'description', e.target.value)}
                        className="h-9 text-sm"
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
                  <Collapsible open={expandedIds.has(sequence.id)} onOpenChange={() => toggleExpanded(sequence.id)}>
                    <div className="flex items-center justify-between p-3 gap-3">
                      <CollapsibleTrigger className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity">
                        {expandedIds.has(sequence.id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-foreground truncate">
                            {sequence.name}
                          </h4>
                          {sequence.description && !expandedIds.has(sequence.id) && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {sequence.description}
                            </p>
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-1 shrink-0">
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
                    
                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-3">
                        {sequence.description && (
                          <p className="text-xs text-muted-foreground pl-6">
                            {sequence.description}
                          </p>
                        )}
                        
                        {/* Generated Webhook URL */}
                        <div className="bg-muted/50 rounded-md p-3 space-y-2 ml-6">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Webhook URL</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs gap-1"
                              onClick={() => copyWebhookUrl(sequence.id)}
                            >
                              {copiedId === sequence.id ? (
                                <>
                                  <Check className="w-3 h-3 text-green-500" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                          <code className="text-xs bg-background px-2 py-1.5 rounded text-muted-foreground break-all block">
                            {generateWebhookUrl(sequence.id)}
                          </code>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
