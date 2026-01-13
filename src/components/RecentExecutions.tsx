import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Execution {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  sequence_name: string;
}

interface RecentExecutionsProps {
  automationId: string;
  maxItems?: number;
}

export function RecentExecutions({ automationId, maxItems = 3 }: RecentExecutionsProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExecutions = async () => {
      try {
        const { data, error } = await supabase
          .from('executions')
          .select('id, status, started_at, completed_at, sequence_name')
          .eq('workflow_id', automationId)
          .order('started_at', { ascending: false })
          .limit(maxItems);

        if (error) throw error;
        setExecutions(data || []);
      } catch (err) {
        console.error('Failed to fetch executions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExecutions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`executions-${automationId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'executions',
        filter: `workflow_id=eq.${automationId}`
      }, () => {
        fetchExecutions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [automationId, maxItems]);

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-[10px]">Loading...</span>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <span className="text-[10px] text-muted-foreground">No runs yet</span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {executions.map((exec) => (
        <div
          key={exec.id}
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px]',
            exec.status === 'completed' && 'bg-green-500/10 text-green-600 dark:text-green-400',
            exec.status === 'failed' && 'bg-destructive/10 text-destructive',
            exec.status === 'processing' && 'bg-primary/10 text-primary',
            exec.status === 'pending' && 'bg-muted text-muted-foreground'
          )}
          title={`${exec.status} - ${formatDistanceToNow(new Date(exec.started_at), { addSuffix: true })}`}
        >
          {exec.status === 'completed' && <CheckCircle className="w-2.5 h-2.5" />}
          {exec.status === 'failed' && <XCircle className="w-2.5 h-2.5" />}
          {exec.status === 'processing' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
          {exec.status === 'pending' && <Clock className="w-2.5 h-2.5" />}
          <span className="hidden sm:inline">
            {formatDistanceToNow(new Date(exec.started_at), { addSuffix: false })}
          </span>
        </div>
      ))}
    </div>
  );
}
