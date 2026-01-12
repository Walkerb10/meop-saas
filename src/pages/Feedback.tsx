import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Check, Clock, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeedbackItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  created_at: string;
}

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-500/20 text-yellow-400' },
  'in-progress': { label: 'In Progress', icon: Lightbulb, color: 'bg-blue-500/20 text-blue-400' },
  done: { label: 'Done', icon: Check, color: 'bg-green-500/20 text-green-400' },
};

const priorityConfig = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-orange-500/20 text-orange-400',
  high: 'bg-red-500/20 text-red-400',
};

export default function Feedback() {
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['feedback-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FeedbackItem[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('feedback_items').insert({
        title: newTitle,
        description: newDescription || null,
        priority: newPriority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-items'] });
      setNewTitle('');
      setNewDescription('');
      setNewPriority('medium');
      toast({ title: 'Feature added!' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('feedback_items').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback-items'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feedback_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-items'] });
      toast({ title: 'Item deleted' });
    },
  });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addMutation.mutate();
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border p-4 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Feature Requests</h1>
            <p className="text-muted-foreground text-sm">Track ideas and features you want to build</p>
          </div>

          {/* Add New Feature Form */}
          <div className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-card">
            <div className="flex gap-2">
              <Input
                placeholder="What feature do you want?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="flex-1"
              />
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={!newTitle.trim() || addMutation.isPending}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <Textarea
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No features yet. Add one above!</p>
          ) : (
            items.map((item) => {
              const statusInfo = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = statusInfo.icon;
              const priorityClass = priorityConfig[item.priority as keyof typeof priorityConfig] || priorityConfig.medium;

              return (
                <Card key={item.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{item.title}</h3>
                          <Badge variant="outline" className={priorityClass}>
                            {item.priority || 'medium'}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={item.status}
                          onValueChange={(status) => updateStatusMutation.mutate({ id: item.id, status })}
                        >
                          <SelectTrigger className={`w-32 h-8 text-xs ${statusInfo.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMutation.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
