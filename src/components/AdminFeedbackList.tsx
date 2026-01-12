import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Check, Lightbulb, Trash2, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface FeedbackItem {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  status: string;
  priority: string | null;
  user_id: string | null;
  created_at: string;
}

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-500/20 text-yellow-400' },
  'in-progress': { label: 'In Progress', icon: Lightbulb, color: 'bg-blue-500/20 text-blue-400' },
  done: { label: 'Done', icon: Check, color: 'bg-green-500/20 text-green-400' },
};

const topicLabels: Record<string, string> = {
  general: 'General',
  automations: 'Automations',
  ui: 'UI/Design',
  'meop-ai': 'MEOP AI',
  voice: 'Voice Agent',
  webhooks: 'Webhooks',
  bug: 'Bug Report',
  feature: 'Feature Request',
};

export function AdminFeedbackList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['all-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FeedbackItem[];
    },
  });

  // Fetch user emails for display
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-for-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('user_id, email, display_name');
      if (error) throw error;
      return data;
    },
  });

  const getUserInfo = (userId: string | null) => {
    if (!userId) return 'Anonymous';
    const member = teamMembers.find(m => m.user_id === userId);
    return member?.display_name || member?.email || 'Unknown User';
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('feedback_items').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-feedback'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feedback_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-feedback'] });
      toast({ title: 'Feedback deleted' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            User Feedback ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No feedback received yet.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {items.map((item) => {
                  const statusInfo = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div 
                      key={item.id} 
                      className="p-4 rounded-lg bg-secondary/30 border border-border"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {topicLabels[item.topic || 'general'] || 'General'}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              From: {getUserInfo(item.user_id)}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-sm text-foreground">{item.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
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
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
