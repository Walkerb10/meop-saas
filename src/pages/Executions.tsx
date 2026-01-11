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
  Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { useTimezone } from '@/hooks/useTimezone';

// Discord icon component
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

// Slack icon component  
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

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

// Check if output is from a research execution
const isResearchOutput = (output: Json | null): output is { content: string; citations?: string[] } => {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return false;
  const obj = output as Record<string, unknown>;
  return typeof obj.content === 'string';
};

// Format research content with nice styling
const ResearchOutput = ({ data }: { data: { content: string; citations?: string[] } }) => {
  return (
    <div className="space-y-4">
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {data.content}
      </div>
      {data.citations && data.citations.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Sources ({data.citations.length})</h4>
          <div className="space-y-1">
            {data.citations.map((citation, idx) => (
              <a
                key={idx}
                href={citation}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="truncate">{citation}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Detect platform from execution data
const detectPlatform = (execution: Execution): { name: string; icon: React.ComponentType<{ className?: string }> } => {
  const input = execution.input_data as Record<string, unknown> | null;
  const name = execution.sequence_name.toLowerCase();
  
  if (name.includes('research') || input?.action_type === 'research') {
    return { name: 'Research (Perplexity)', icon: Search };
  }
  if (name.includes('email') || input?.action_type === 'send_email') {
    return { name: 'Email', icon: Mail };
  }
  if (name.includes('slack') || input?.action_type === 'slack_message') {
    return { name: 'Slack', icon: SlackIcon };
  }
  if (name.includes('discord') || input?.action_type === 'discord_message') {
    return { name: 'Discord', icon: DiscordIcon };
  }
  return { name: 'Text (SMS)', icon: MessageSquare };
};

type ExecutionTypeFilter = 'all' | 'research' | 'email' | 'slack' | 'discord' | 'text';
type StatusFilter = 'all' | 'completed' | 'failed' | 'running' | 'pending_review';

const EXECUTION_TYPE_FILTERS = [
  { id: 'all' as const, label: 'All Types', icon: Clock },
  { id: 'text' as const, label: 'Text', icon: MessageSquare },
  { id: 'research' as const, label: 'Research', icon: Search },
  { id: 'email' as const, label: 'Email', icon: Mail },
  { id: 'slack' as const, label: 'Slack', icon: SlackIcon },
  { id: 'discord' as const, label: 'Discord', icon: DiscordIcon },
];

const STATUS_FILTERS = [
  { id: 'all' as const, label: 'All Statuses' },
  { id: 'completed' as const, label: 'Completed' },
  { id: 'running' as const, label: 'Running' },
  { id: 'failed' as const, label: 'Failed' },
  { id: 'pending_review' as const, label: 'Pending Review' },
];

const Executions = () => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [linkedAutomation, setLinkedAutomation] = useState<Automation | null>(null);
  const [loadingAutomation, setLoadingAutomation] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ExecutionTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { formatTime } = useTimezone();
  const navigate = useNavigate();

  // Get the type of an execution
  const getExecutionType = (execution: Execution): ExecutionTypeFilter => {
    const platform = detectPlatform(execution);
    if (platform.name.includes('Research')) return 'research';
    if (platform.name.includes('Email')) return 'email';
    if (platform.name.includes('Slack')) return 'slack';
    if (platform.name.includes('Discord')) return 'discord';
    return 'text';
  };

  // Filtered executions
  const filteredExecutions = executions.filter(execution => {
    const typeMatch = typeFilter === 'all' || getExecutionType(execution) === typeFilter;
    const statusMatch = statusFilter === 'all' || execution.status === statusFilter;
    return typeMatch && statusMatch;
  });

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
    const isResearch = platform.name.includes('Research');

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
                <div className="flex items-center gap-2">
                  <PlatformIcon className="w-5 h-5 text-primary" />
                  <h1 className="text-xl font-semibold">{selectedExecution.sequence_name}</h1>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Ran at {started.time} on {started.date}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={selectedExecution.status} size="lg" />
                <span className="text-lg font-medium capitalize">
                  {selectedExecution.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Source Automation - Prominent placement */}
            {(loadingAutomation || linkedAutomation) && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                {loadingAutomation ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Finding source automation...</span>
                  </div>
                ) : linkedAutomation && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <PlatformIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{linkedAutomation.name}</p>
                        <p className="text-xs text-muted-foreground">Source Automation</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleEditAutomation} className="gap-2">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Automation
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* OUTPUT FIRST - The main result */}
            {selectedExecution.output_data && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                  <h3 className="font-medium">
                    {isResearch ? '📊 Research Results' : 'Output'}
                  </h3>
                </div>
                <div className="p-6">
                  {isResearchOutput(selectedExecution.output_data) ? (
                    <ResearchOutput data={selectedExecution.output_data} />
                  ) : (
                    <pre className="text-sm overflow-auto max-h-96 whitespace-pre-wrap">
                      {JSON.stringify(selectedExecution.output_data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {selectedExecution.error_message && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
                <h3 className="text-sm font-medium text-destructive mb-2">Error</h3>
                <p className="text-sm text-destructive">{selectedExecution.error_message}</p>
              </div>
            )}

            {/* Execution Details - Collapsible secondary info */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-6">
              <h3 className="font-medium">Execution Details</h3>
              
              {/* Timing Section */}
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

              {/* Input Data */}
              {selectedExecution.input_data && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Input Data</h4>
                  <pre className="p-4 rounded-lg bg-secondary/30 text-xs overflow-auto max-h-48">
                    {JSON.stringify(selectedExecution.input_data, null, 2)}
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
      <div className="max-w-4xl mx-auto flex flex-col h-full">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background pt-6 px-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold">Executions</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track automation executions and their results
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchExecutions}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Type filters */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {EXECUTION_TYPE_FILTERS.map(filter => {
                const Icon = filter.icon;
                const count = filter.id === 'all' 
                  ? executions.length 
                  : executions.filter(e => getExecutionType(e) === filter.id).length;
                return (
                  <Button
                    key={filter.id}
                    variant={typeFilter === filter.id ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5 text-xs whitespace-nowrap"
                    onClick={() => setTypeFilter(filter.id)}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {filter.label}
                    <span className="text-[10px] opacity-70">({count})</span>
                  </Button>
                );
              })}
            </div>
            
            {/* Status filter dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-8 px-2 text-xs border border-border rounded-md bg-background"
            >
              {STATUS_FILTERS.map(filter => (
                <option key={filter.id} value={filter.id}>{filter.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredExecutions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
              <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No executions found</p>
              <p className="text-sm mt-1">
                {executions.length > 0 ? 'Try adjusting your filters' : 'Automation runs will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExecutions.map((execution, index) => {
                const platform = detectPlatform(execution);
                const PlatformIcon = platform.icon;
                const isResearch = platform.name.includes('Research');
                const hasOutput = !!execution.output_data;
                const outputPreview = isResearchOutput(execution.output_data) 
                  ? execution.output_data.content.slice(0, 150) + (execution.output_data.content.length > 150 ? '...' : '')
                  : null;
                
                return (
                  <motion.div
                    key={execution.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="rounded-xl border border-border bg-card hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
                    onClick={() => handleSelectExecution(execution)}
                  >
                    {/* Card Header */}
                    <div className="p-4 flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isResearch ? 'bg-blue-500/10' : 'bg-primary/10'
                      }`}>
                        <PlatformIcon className={`w-5 h-5 ${isResearch ? 'text-blue-500' : 'text-primary'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium truncate">{execution.sequence_name}</h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <StatusIcon status={execution.status} />
                            <span className="text-xs capitalize text-muted-foreground">
                              {execution.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(execution.started_at).toLocaleString()} 
                          {execution.duration_ms && ` • ${formatDuration(execution.duration_ms)}`}
                        </p>
                        {execution.requires_human_review && (
                          <span className="inline-block mt-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
                            Needs review
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Output Preview - Show for completed executions with output */}
                    {hasOutput && execution.status === 'completed' && (
                      <div className="px-4 pb-4">
                        <div className="rounded-lg bg-muted/50 p-3">
                          {outputPreview ? (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {outputPreview}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Output available - click to view
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Error Preview */}
                    {execution.error_message && (
                      <div className="px-4 pb-4">
                        <div className="rounded-lg bg-destructive/10 p-3">
                          <p className="text-sm text-destructive line-clamp-1">
                            {execution.error_message}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Executions;