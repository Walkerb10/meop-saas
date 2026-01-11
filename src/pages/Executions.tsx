import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  MessageSquare,
  Search,
  Mail,
  Hash,
  Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { useTimezone } from '@/hooks/useTimezone';

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

interface Automation {
  id: string;
  name: string;
  steps: Json;
}

const StatusIcon = ({ status, size = 'sm' }: { status: string; size?: 'sm' | 'lg' }) => {
  const sizeClass = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
  switch (status) {
    case 'completed':
      return <CheckCircle2 className={`${sizeClass} text-green-500`} />;
    case 'failed':
      return <XCircle className={`${sizeClass} text-destructive`} />;
    case 'running':
      return <Loader2 className={`${sizeClass} text-primary animate-spin`} />;
    case 'pending_review':
      return <AlertCircle className={`${sizeClass} text-yellow-500`} />;
    default:
      return <Clock className={`${sizeClass} text-muted-foreground`} />;
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

// Detect platform from execution data
const detectPlatform = (execution: Execution): { name: string; icon: typeof MessageSquare } => {
  const input = execution.input_data as Record<string, unknown> | null;
  const name = execution.sequence_name.toLowerCase();
  
  if (name.includes('research') || input?.action_type === 'research') {
    return { name: 'Research (Perplexity)', icon: Search };
  }
  if (name.includes('email') || input?.action_type === 'send_email') {
    return { name: 'Email', icon: Mail };
  }
  if (name.includes('slack') || input?.action_type === 'slack_message') {
    return { name: 'Slack', icon: Hash };
  }
  if (name.includes('discord') || input?.action_type === 'discord_message') {
    return { name: 'Discord', icon: Hash };
  }
  return { name: 'Text (SMS)', icon: MessageSquare };
};

const Executions = () => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [linkedAutomation, setLinkedAutomation] = useState<Automation | null>(null);
  const [loadingAutomation, setLoadingAutomation] = useState(false);
  const { formatTime } = useTimezone();
  const navigate = useNavigate();

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

  // Find linked automation by name match
  const fetchLinkedAutomation = async (sequenceName: string) => {
    setLoadingAutomation(true);
    setLinkedAutomation(null);
    
    // Try exact match first, then partial
    const { data } = await supabase
      .from('automations')
      .select('id, name, steps')
      .or(`name.eq.${sequenceName},name.ilike.%${sequenceName.split(':')[0].trim()}%`)
      .limit(1);
    
    if (data && data.length > 0) {
      setLinkedAutomation(data[0] as Automation);
    }
    setLoadingAutomation(false);
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

  useEffect(() => {
    if (selectedExecution) {
      fetchLinkedAutomation(selectedExecution.sequence_name);
    }
  }, [selectedExecution]);

  const handleSelectExecution = (execution: Execution) => {
    setSelectedExecution(execution);
  };

  const handleBack = () => {
    setSelectedExecution(null);
    setLinkedAutomation(null);
  };

  const handleEditAutomation = () => {
    if (linkedAutomation) {
      navigate(`/scheduled-actions?edit=${linkedAutomation.id}`);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: formatTime(date.toTimeString().slice(0, 5)),
    };
  };

  // Detail View
  if (selectedExecution) {
    const platform = detectPlatform(selectedExecution);
    const PlatformIcon = platform.icon;
    const started = formatDateTime(selectedExecution.started_at);
    const completed = selectedExecution.completed_at ? formatDateTime(selectedExecution.completed_at) : null;

    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-semibold">{selectedExecution.sequence_name}</h1>
                <p className="text-sm text-muted-foreground">Execution Details</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={selectedExecution.status} size="lg" />
                <span className="text-lg font-medium capitalize">
                  {selectedExecution.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Main Info Card */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-6">
              {/* Timing Section */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Timing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-secondary/30 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Started</p>
                    <p className="text-sm font-medium">{started.time}</p>
                    <p className="text-xs text-muted-foreground">{started.date}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Completed</p>
                    {completed ? (
                      <>
                        <p className="text-sm font-medium">{completed.time}</p>
                        <p className="text-xs text-muted-foreground">{completed.date}</p>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-primary">In progress...</p>
                    )}
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Duration</p>
                    <p className="text-sm font-medium">
                      {selectedExecution.status === 'running' 
                        ? 'Running...' 
                        : formatDuration(selectedExecution.duration_ms)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Platform & Destination */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Destination</h3>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/30">
                  <PlatformIcon className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{platform.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedExecution.workflow_id 
                        ? `Workflow: ${selectedExecution.workflow_id}` 
                        : 'Internal execution'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Source Automation */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Source Automation</h3>
                {loadingAutomation ? (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-secondary/30">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Finding automation...</span>
                  </div>
                ) : linkedAutomation ? (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium">{linkedAutomation.name}</p>
                      <p className="text-xs text-muted-foreground">Click to edit this automation</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleEditAutomation} className="gap-2">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-secondary/30 text-sm text-muted-foreground">
                    No linked automation found (may have been deleted or renamed)
                  </div>
                )}
              </div>

              {/* Error Message */}
              {selectedExecution.error_message && (
                <div>
                  <h3 className="text-sm font-medium text-destructive mb-3">Error</h3>
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{selectedExecution.error_message}</p>
                  </div>
                </div>
              )}

              {/* Input Data */}
              {selectedExecution.input_data && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Input Data</h3>
                  <pre className="p-4 rounded-lg bg-secondary/30 text-xs overflow-auto max-h-48">
                    {JSON.stringify(selectedExecution.input_data, null, 2)}
                  </pre>
                </div>
              )}

              {/* Output Data */}
              {selectedExecution.output_data && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Output Data</h3>
                  <pre className="p-4 rounded-lg bg-secondary/30 text-xs overflow-auto max-h-48">
                    {JSON.stringify(selectedExecution.output_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  // List View
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
                      onClick={() => handleSelectExecution(execution)}
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