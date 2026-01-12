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
import { Plus, Trash2, Check, Clock, Lightbulb, Sparkles, Copy, Loader2, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FeedbackItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  created_at: string;
}

interface AIRecommendation {
  recommendation: string;
  prompt: string;
  complexity: 'low' | 'medium' | 'high';
  estimatedFiles: string[];
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

const complexityConfig = {
  low: { label: 'Low', color: 'bg-green-500/20 text-green-400' },
  medium: { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400' },
  high: { label: 'High', color: 'bg-red-500/20 text-red-400' },
};

export default function Feedback() {
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Record<string, AIRecommendation>>({});
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

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const generateAIRecommendation = async (item: FeedbackItem) => {
    setLoadingAI(item.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-fix-prompt', {
        body: {
          title: item.title,
          description: item.description,
          priority: item.priority,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setRecommendations(prev => ({
        ...prev,
        [item.id]: data as AIRecommendation,
      }));

      // Auto-expand the item to show the recommendation
      setExpandedItems(prev => new Set(prev).add(item.id));

      toast({ title: 'AI recommendation generated!' });
    } catch (error) {
      console.error('Failed to generate recommendation:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to generate recommendation',
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setLoadingAI(null);
    }
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast({ title: 'Prompt copied to clipboard!' });
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border p-4 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Feature Requests</h1>
            <p className="text-muted-foreground text-sm">
              Track ideas and features. Get AI-powered prompts to fix issues automatically.
            </p>
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
              placeholder="Describe the feature or issue in detail..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No features yet. Add one above!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Get AI-generated prompts to help implement your ideas.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const statusInfo = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = statusInfo.icon;
              const priorityClass = priorityConfig[item.priority as keyof typeof priorityConfig] || priorityConfig.medium;
              const isExpanded = expandedItems.has(item.id);
              const recommendation = recommendations[item.id];
              const isLoadingThis = loadingAI === item.id;

              return (
                <Card key={item.id} className="bg-card border-border overflow-hidden">
                  <CardContent className="p-0">
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(item.id)}>
                      {/* Main row */}
                      <div className="flex items-start justify-between gap-3 p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-medium">{item.title}</h3>
                            <Badge variant="outline" className={priorityClass}>
                              {item.priority || 'medium'}
                            </Badge>
                            {recommendation && (
                              <Badge variant="outline" className={complexityConfig[recommendation.complexity].color}>
                                {complexityConfig[recommendation.complexity].label} complexity
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Generate AI button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              generateAIRecommendation(item);
                            }}
                            disabled={isLoadingThis}
                            className="gap-1.5 text-xs"
                          >
                            {isLoadingThis ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Wand2 className="h-3.5 w-3.5" />
                            )}
                            {recommendation ? 'Regenerate' : 'AI Fix'}
                          </Button>

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

                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>

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

                      {/* Expanded content */}
                      <CollapsibleContent>
                        <div className="border-t border-border p-4 bg-secondary/30 space-y-4">
                          {item.description && (
                            <div>
                              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                Full Description
                              </h4>
                              <p className="text-sm">{item.description}</p>
                            </div>
                          )}

                          {recommendation ? (
                            <>
                              {/* AI Recommendation */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Sparkles className="h-4 w-4 text-primary" />
                                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    AI Recommendation
                                  </h4>
                                </div>
                                <p className="text-sm">{recommendation.recommendation}</p>
                              </div>

                              {/* Estimated Files */}
                              {recommendation.estimatedFiles.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                    Likely Files to Modify
                                  </h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {recommendation.estimatedFiles.map((file, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs font-mono">
                                        {file}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Ready-to-use Prompt */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Ready-to-Use Prompt
                                  </h4>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyPrompt(recommendation.prompt)}
                                    className="h-7 gap-1.5 text-xs"
                                  >
                                    <Copy className="h-3 w-3" />
                                    Copy
                                  </Button>
                                </div>
                                <div className="bg-background rounded-lg p-3 border border-border">
                                  <p className="text-sm font-mono whitespace-pre-wrap">{recommendation.prompt}</p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-muted-foreground mb-3">
                                Click "AI Fix" to generate an implementation prompt
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateAIRecommendation(item)}
                                disabled={isLoadingThis}
                                className="gap-2"
                              >
                                {isLoadingThis ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Wand2 className="h-4 w-4" />
                                )}
                                Generate AI Recommendation
                              </Button>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
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
