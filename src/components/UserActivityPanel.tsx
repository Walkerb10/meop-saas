import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquare, Wrench, Activity, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTeamMembers, TeamMember } from '@/hooks/useTeamMembers';

interface ConversationEntry {
  id: string;
  content: string;
  role: string;
  created_at: string;
  conversation_id: string | null;
  user_id: string | null;
}

interface Execution {
  id: string;
  sequence_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export function UserActivityPanel() {
  const { members } = useTeamMembers();
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  const activeMembers = members.filter((m) => m.is_active);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch conversations
        let convQuery = supabase
          .from('conversation_transcripts')
          .select('id, content, role, created_at, conversation_id, user_id')
          .order('created_at', { ascending: false })
          .limit(100);

        if (selectedUserId !== 'all') {
          convQuery = convQuery.eq('user_id', selectedUserId);
        }

        const { data: convData, error: convError } = await convQuery;
        if (convError) throw convError;
        setConversations(convData || []);

        // Fetch executions
        const { data: execData, error: execError } = await supabase
          .from('executions')
          .select('id, sequence_name, status, started_at, completed_at, error_message')
          .order('started_at', { ascending: false })
          .limit(50);

        if (execError) throw execError;
        setExecutions(execData || []);
      } catch (err) {
        console.error('Failed to fetch activity:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedUserId]);

  const getMemberName = (userId: string | null) => {
    if (!userId) return 'Unknown';
    const member = members.find((m) => m.user_id === userId);
    return member?.display_name || member?.email || 'Unknown';
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === 'user') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (role === 'assistant') return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (role === 'tool_call') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-muted text-muted-foreground';
  };

  const getStatusBadgeColor = (status: string) => {
    if (status === 'completed') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (status === 'failed') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (status === 'running') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return 'bg-muted text-muted-foreground';
  };

  // Group conversations by conversation_id
  const groupedConversations = conversations.reduce<Record<string, ConversationEntry[]>>((acc, entry) => {
    const key = entry.conversation_id || 'orphan';
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  // Filter tool calls
  const toolCalls = conversations.filter((c) => c.role === 'tool_call');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by user:</span>
        </div>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {activeMembers.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.display_name || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations Panel */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-5 h-5" />
              Recent Conversations ({conversations.length})
            </CardTitle>
            <CardDescription>Voice and text conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {conversations.slice(0, 50).map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg bg-secondary/30 border border-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleBadgeColor(entry.role)}>
                          {entry.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getMemberName(entry.user_id)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-3">
                      {entry.content}
                    </p>
                  </div>
                ))}
                {conversations.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No conversations found
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Tool Calls Panel */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="w-5 h-5" />
              Tool Calls ({toolCalls.length})
            </CardTitle>
            <CardDescription>Agent tool invocations</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {toolCalls.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg bg-secondary/30 border border-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        Tool Call
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground font-mono line-clamp-4">
                      {entry.content}
                    </p>
                  </div>
                ))}
                {toolCalls.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No tool calls found
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Executions Panel */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-5 h-5" />
            Automation Executions ({executions.length})
          </CardTitle>
          <CardDescription>Recent automation runs</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {executions.map((exec) => (
                <div
                  key={exec.id}
                  className="p-3 rounded-lg bg-secondary/30 border border-border flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{exec.sequence_name}</p>
                    {exec.error_message && (
                      <p className="text-xs text-destructive mt-1 line-clamp-1">
                        {exec.error_message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusBadgeColor(exec.status)}>
                      {exec.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(exec.started_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
              {executions.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No executions found
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
