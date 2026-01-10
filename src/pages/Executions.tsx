import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface Execution {
  id: string;
  sequence_name: string;
  workflow_id: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  input_data: Json | null;
  output_data: Json | null;
  error_message: string | null;
  requires_human_review: boolean | null;
  notification_sent: boolean | null;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-destructive" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    case 'pending_review':
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
};

const formatDuration = (ms: number | null): string => {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

const Executions = () => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExecutions = async () => {
    const { data, error } = await supabase
      .from('executions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setExecutions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExecutions();

    const channel = supabase
      .channel('executions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'executions' },
        () => fetchExecutions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Executions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track workflow executions and their results
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchExecutions}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
              <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No executions yet</p>
              <p className="text-sm mt-1">Workflow runs will appear here</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Workflow</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-sm font-medium hidden sm:table-cell">Started</th>
                    <th className="text-left p-3 text-sm font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((execution, index) => (
                    <motion.tr
                      key={execution.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium">{execution.sequence_name}</p>
                          {execution.requires_human_review && (
                            <span className="text-xs text-yellow-500">Needs review</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={execution.status} />
                          <span className="text-sm capitalize">{execution.status.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">
                        {new Date(execution.started_at).toLocaleTimeString()}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {execution.status === 'running' ? (
                          <span className="text-primary">In progress...</span>
                        ) : (
                          formatDuration(execution.duration_ms)
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Executions;