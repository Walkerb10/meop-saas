import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Check, Lightbulb } from 'lucide-react';
import { format } from 'date-fns';

interface FeedbackItem {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  status: string;
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

export function UserFeedbackList() {
  const { user } = useAuth();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['user-feedback', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('feedback_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FeedbackItem[];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <p className="text-muted-foreground text-center py-8">Loading...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No feedback submitted yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Use the Feedback button in the header to share your thoughts.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3">
        {items.map((item) => {
          const statusInfo = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending;
          const StatusIcon = statusInfo.icon;
          
          return (
            <Card key={item.id} className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {topicLabels[item.topic || 'general'] || 'General'}
                      </Badge>
                      <Badge className={`text-xs ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-foreground mt-2">{item.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
