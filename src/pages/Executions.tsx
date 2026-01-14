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
  Pencil,
  ChevronDown,
  Filter,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { useTimezone } from '@/hooks/useTimezone';
import { formatDistanceToNow } from 'date-fns';
import { ResearchOutputDisplay } from '@/components/ResearchOutputDisplay';

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

const isResearchOutput = (output: Json | null): output is { content: string; citations?: string[] } => {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return false;
  const obj = output as Record<string, unknown>;
  return typeof obj.content === 'string';
};

// Legacy ResearchOutput component - kept for backward compatibility
const ResearchOutput = ({ data, rawData }: { data: { content: string; citations?: string[] }; rawData?: Json }) => {
  return (
    <ResearchOutputDisplay 
      data={data} 
      rawData={rawData as Record<string, unknown>} 
    />
  );
};

const detectPlatform = (execution: Execution): { name: string; icon: React.ComponentType<{ className?: string }> } => {
  const input = execution.input_data as Record<string, unknown> | null;
  const name = execution.sequence_name.toLowerCase();
  
  if (name.includes('research') || input?.action_type === 'research') {
    return { name: 'Research', icon: Search };
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
  return { name: 'Text', icon: MessageSquare };
};

type ExecutionTypeFilter = 'all' | 'research' | 'email' | 'slack' | 'discord' | 'text';
type StatusFilter = 'all' | 'completed' | 'failed' | 'running' | 'pending_review';

const Executions = () => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [linkedAutomation, setLinkedAutomation] = useState<Automation | null>(null);
  const [loadingAutomation, setLoadingAutomation] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ExecutionTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { formatTime } = useTimezone();
  const navigate = useNavigate();

  const getExecutionType = (execution: Execution): ExecutionTypeFilter => {
    const platform = detectPlatform(execution);
    if (platform.name.includes('Research')) return 'research';
    if (platform.name.includes('Email')) return 'email';
    if (platform.name.includes('Slack')) return 'slack';
    if (platform.name.includes('Discord')) return 'discord';
    return 'text';
  };

  const filteredExecutions = executions.filter(execution => {
    const typeMatch = typeFilter === 'all' || getExecutionType(execution) === typeFilter;
    const statusMatch = statusFilter === 'all' || execution.status === statusFilter;
    const searchMatch = !searchQuery || 
      execution.sequence_name.toLowerCase().includes(searchQuery.toLowerCase());
    return typeMatch && statusMatch && searchMatch;
  });

  const fetchExecutions = async () => {
    const { data, error } = await supabase
      .from('executions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setExecutions(data);
    }
    setLoading(false);
  };

  const fetchLinkedAutomation = async (sequenceName: string) => {
    setLoadingAutomation(true);
    setLinkedAutomation(null);
    
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

    // Real-time subscription
    const channel = supabase
      .channel('executions-realtime')
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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: formatTime(date.toTimeString().slice(0, 5)),
    };
  };

  // Stats summary
  const stats = {
    total: executions.length,
    completed: executions.filter(e => e.status === 'completed').length,
    running: executions.filter(e => e.status === 'running').length,
    failed: executions.filter(e => e.status === 'failed').length,
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
              <Button variant="ghost" size="icon" onClick={() => setSelectedExecution(null)}>
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

            {/* Source Automation */}
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
                    <Button variant="outline" size="sm" onClick={() => navigate(`/scheduled-actions?edit=${linkedAutomation.id}`)} className="gap-2">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Automation
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Output */}
            {selectedExecution.output_data && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                  <h3 className="font-medium">
                    {isResearch ? '📊 Research Results' : 'Output'}
                  </h3>
                </div>
                <div className="p-6">
                  {isResearchOutput(selectedExecution.output_data) ? (
                    <ResearchOutput 
                      data={selectedExecution.output_data} 
                      rawData={selectedExecution.output_data}
                    />
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

            {/* Execution Details */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-6">
              <h3 className="font-medium">Execution Details</h3>
              
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
                Real-time monitoring of all automation runs
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchExecutions} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          {!loading && (
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{stats.total} total</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">{stats.completed} completed</span>
              </div>
              {stats.running > 0 && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm">{stats.running} running</span>
                </div>
              )}
              {stats.failed > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm">{stats.failed} failed</span>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search executions..."
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ExecutionTypeFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="discord">Discord</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredExecutions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'No matching executions'
                  : 'No executions yet'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Run an automation or sequence to see executions here
              </p>
            </div>
          ) : (
            <AnimatePresence>
              <div className="space-y-3">
                {filteredExecutions.map((execution, index) => {
                  const platform = detectPlatform(execution);
                  const PlatformIcon = platform.icon;
                  const started = formatDateTime(execution.started_at);

                  return (
                    <motion.div
                      key={execution.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Card 
                        className="cursor-pointer hover:border-primary/30 transition-colors"
                        onClick={() => setSelectedExecution(execution)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                              <PlatformIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{execution.sequence_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(execution.started_at), { addSuffix: true })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {execution.duration_ms && (
                                <span className="text-xs text-muted-foreground">
                                  {formatDuration(execution.duration_ms)}
                                </span>
                              )}
                              <Badge variant={
                                execution.status === 'completed' ? 'default' :
                                execution.status === 'failed' ? 'destructive' :
                                execution.status === 'running' ? 'default' : 'secondary'
                              } className={
                                execution.status === 'completed' ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                                execution.status === 'running' ? 'bg-primary/20 text-primary border-primary/30' : ''
                              }>
                                <StatusIcon status={execution.status} />
                                <span className="ml-1 capitalize">{execution.status.replace('_', ' ')}</span>
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Executions;