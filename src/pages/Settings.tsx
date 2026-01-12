import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Webhook, Volume2, Bell, Shield, Copy, Check, LogOut, Plus, Trash2, FileText, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SequencesManager } from '@/components/SequencesManager';
import { AppLayout } from '@/components/AppLayout';
import { VoiceSettings } from '@/components/VoiceSettings';
import { useSequences } from '@/hooks/useSequences';
import { useN8nTools } from '@/hooks/useN8nTools';
import { useAuth } from '@/hooks/useAuth';
import { useTimezone } from '@/hooks/useTimezone';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const VAPI_WEBHOOKS = [
  {
    name: 'Automation Webhook',
    description: 'Receives tool calls from Vapi to create automations',
    path: 'vapi-webhook',
  },
];

interface WebhookLog {
  id: string;
  role: string;
  content: string;
  raw_payload: Json;
  created_at: string;
}

const Settings = () => {
  const { sequences, addSequence, updateSequence, deleteSequence } = useSequences();
  const { tools: n8nTools, addTool: addN8nToolToDb, deleteTool: deleteN8nToolFromDb, loading: n8nLoading } = useN8nTools();
  const { signOut, user } = useAuth();
  const { formatDateTime } = useTimezone();
  const { canAccess, loading: featureLoading } = useFeatureAccess();
  const navigate = useNavigate();
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  
  const canViewWebhooks = canAccess('webhooks') || canAccess('admin_dashboard');
  
  // Webhook logs state
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [logFilter, setLogFilter] = useState<string>('all');

  // Extract tool name from raw payload
  const getToolName = (payload: Json): string | null => {
    if (!payload || typeof payload !== 'object') return null;
    const p = payload as Record<string, unknown>;
    
    // Check for our saved tool call marker (most reliable)
    if (p._tool_call === true && p._automation_type) {
      return `schedule_${p._automation_type}`;
    }
    
    // Check for explicit automation_type first (most reliable for Vapi)
    if (p.automation_type && typeof p.automation_type === 'string') {
      return `schedule_${p.automation_type}`;
    }
    
    // Check for message_content + frequency = scheduling tool call
    if (p.message_content && p.frequency && p.scheduled_time) {
      // Detect type from other fields
      if (p.slack_channel || String(p.channel || '').toLowerCase() === 'slack') return 'schedule_slack';
      if (p.discord_channel) return 'schedule_discord';
      if (p.email_content || p.recipient_emails) return 'schedule_email';
      return 'schedule_text';
    }
    
    // Check for research_topic = research scheduling
    if (p.research_topic && p.frequency) return 'schedule_research';
    
    // Check for known tool signatures
    if (p.tool_name && typeof p.tool_name === 'string') return p.tool_name;
    if (p.research_topic) return 'research';
    if (p.research_query || p.query) return 'research';
    if (p.webhook_url || p.n8n_webhook) return 'n8n_trigger';
    if (p.phone_number && p.message) return 'send_text';
    
    // Chat transcripts - return null (not tool calls)
    if (p.type === 'user_transcript' || p.type === 'user_transcription') return null;
    if (p.type === 'agent_response') return null;
    if (p.source === 'vapi' && (p.role || p.transcript || p.text)) return null;
    
    return null;
  };

  // Check if a log is a Vapi tool call (has automation fields)
  const isVapiToolCall = (payload: Json, role?: string): boolean => {
    if (role === 'tool_call') return true;
    if (!payload || typeof payload !== 'object') return false;
    const p = payload as Record<string, unknown>;
    // Check for our saved tool call marker or scheduling fields
    return !!(
      p._tool_call === true ||
      (p.message_content && p.frequency && p.scheduled_time) ||
      (p.research_topic && p.frequency) ||
      p.automation_type ||
      p.tool_name
    );
  };

  // Get all unique tool names for filter
  const availableTools = useMemo(() => {
    const tools = new Set<string>();
    webhookLogs.forEach(log => {
      const toolName = getToolName(log.raw_payload);
      if (toolName) tools.add(toolName);
    });
    return Array.from(tools).sort();
  }, [webhookLogs]);

  // Filter logs based on selection
  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return webhookLogs;
    if (logFilter === 'tools') {
      return webhookLogs.filter(log => isVapiToolCall(log.raw_payload, log.role));
    }
    if (logFilter === 'chat') {
      return webhookLogs.filter(log => !getToolName(log.raw_payload) && log.role !== 'tool_call');
    }
    return webhookLogs.filter(log => getToolName(log.raw_payload) === logFilter);
  }, [webhookLogs, logFilter]);
  
  // n8n Tools form state
  const [newTool, setNewTool] = useState({ title: '', webhookUrl: '', description: '' });
  const [showAddN8nForm, setShowAddN8nForm] = useState(false);

  const fetchWebhookLogs = async () => {
    setLogsLoading(true);
    const { data, error } = await supabase
      .from('conversation_transcripts')
      .select('id, role, content, raw_payload, created_at')
      .not('raw_payload', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      setWebhookLogs(data);
    }
    setLogsLoading(false);
  };

  const toggleLogExpanded = (id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addN8nTool = async () => {
    if (!newTool.title.trim() || !newTool.webhookUrl.trim()) return;
    const success = await addN8nToolToDb({
      title: newTool.title.trim(),
      webhookUrl: newTool.webhookUrl.trim(),
      description: newTool.description.trim(),
    });
    if (success) {
      setNewTool({ title: '', webhookUrl: '', description: '' });
      setShowAddN8nForm(false);
    }
  };

  const deleteN8nTool = async (id: string) => {
    await deleteN8nToolFromDb(id);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const supabaseUrl = useMemo(() => {
    return import.meta.env.VITE_SUPABASE_URL || '';
  }, []);

  const copyWebhookUrl = (path: string) => {
    const url = `${supabaseUrl}/functions/v1/${path}`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(path);
    setTimeout(() => setCopiedWebhook(null), 2000);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto flex flex-col h-full">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background pt-6 px-6 pb-4 border-b border-border">
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your integrations and preferences
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Tabs defaultValue={canViewWebhooks ? "webhooks" : "voice"} className="w-full">
          <TabsList className={`grid w-full mb-6 ${canViewWebhooks ? 'grid-cols-5' : 'grid-cols-4'}`}>
            {canViewWebhooks && (
              <TabsTrigger value="webhooks" className="gap-2">
                <Webhook className="w-4 h-4" />
                <span className="hidden sm:inline">Webhooks</span>
              </TabsTrigger>
            )}
            {canViewWebhooks && (
              <TabsTrigger value="logs" className="gap-2" onClick={fetchWebhookLogs}>
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Logs</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="voice" className="gap-2">
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">Voice</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          {canViewWebhooks && <TabsContent value="webhooks">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Vapi Webhooks Section */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Vapi Webhooks</h2>
                  <p className="text-sm text-muted-foreground">
                    Use these endpoints to integrate with Vapi agent tools and callbacks.
                  </p>
                </div>
                <div className="grid gap-3">
                  {VAPI_WEBHOOKS.map((webhook) => (
                    <div
                      key={webhook.path}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm">{webhook.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{webhook.description}</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground break-all">
                          {supabaseUrl}/functions/v1/{webhook.path}
                        </code>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-3 shrink-0"
                        onClick={() => copyWebhookUrl(webhook.path)}
                      >
                        {copiedWebhook === webhook.path ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Custom Webhooks Section */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Custom Webhooks</h2>
                  <p className="text-sm text-muted-foreground">
                    Create webhook URLs for your integrations.
                  </p>
                </div>
                <SequencesManager
                  sequences={sequences}
                  onAdd={addSequence}
                  onUpdate={updateSequence}
                  onDelete={deleteSequence}
                />
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Automation Webhooks Section */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Automation Webhooks</h2>
                  <p className="text-sm text-muted-foreground">
                    Default n8n webhook endpoints for each automation type.
                  </p>
                </div>
                <div className="grid gap-3">
                  {[
                    { type: 'Text', url: 'https://walkerb.app.n8n.cloud/webhook/ca69f6f3-2405-45bc-9ad0-9ce78744fbe2', color: 'text-blue-500' },
                    { type: 'Slack', url: 'https://walkerb.app.n8n.cloud/webhook/067d7cbd-f49b-4641-aaab-6cb65617cb68', channel: 'all_bhva', color: 'text-purple-500' },
                    { type: 'Discord', url: 'https://walkerb.app.n8n.cloud/webhook/de3262c9-cf10-4ba9-bf0f-87ba31a1144c', channel: 'admin', color: 'text-indigo-500' },
                    { type: 'Email', url: 'https://walkerb.app.n8n.cloud/webhook/0bad5a52-1f17-4c90-9ca2-6d4aee1661f7', color: 'text-green-500' },
                  ].map((webhook) => (
                    <div
                      key={webhook.type}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium text-sm ${webhook.color}`}>{webhook.type}</h3>
                          {webhook.channel && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">#{webhook.channel}</span>
                          )}
                        </div>
                        <code className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground break-all mt-2 inline-block">
                          {webhook.url}
                        </code>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-3 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(webhook.url);
                          setCopiedWebhook(webhook.type);
                          setTimeout(() => setCopiedWebhook(null), 2000);
                        }}
                      >
                        {copiedWebhook === webhook.type ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* n8n Tools Section */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">n8n Webhook Tools</h2>
                  <p className="text-sm text-muted-foreground">
                    Add n8n webhook URLs as tools for the agent to use.
                  </p>
                </div>

                {/* Existing n8n tools */}
                {n8nTools.length > 0 && (
                  <div className="grid gap-3">
                    {n8nTools.map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-start justify-between p-4 rounded-lg border border-border bg-card"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm">{tool.title}</h3>
                          {tool.description && (
                            <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                          )}
                          <code className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground break-all mt-2 inline-block">
                            {tool.webhookUrl}
                          </code>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-3 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteN8nTool(tool.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new tool button/form */}
                {!showAddN8nForm ? (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddN8nForm(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add n8n Tool
                  </Button>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 rounded-lg border border-dashed border-border bg-muted/30 space-y-3"
                  >
                    <Input
                      placeholder="Tool title (e.g., Research Agent)"
                      value={newTool.title}
                      onChange={(e) => setNewTool({ ...newTool, title: e.target.value })}
                    />
                    <Input
                      placeholder="n8n Webhook URL"
                      value={newTool.webhookUrl}
                      onChange={(e) => setNewTool({ ...newTool, webhookUrl: e.target.value })}
                    />
                    <Textarea
                      placeholder="Description (optional) - What does this tool do?"
                      value={newTool.description}
                      onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={addN8nTool} 
                        disabled={!newTool.title.trim() || !newTool.webhookUrl.trim()}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Tool
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setShowAddN8nForm(false);
                          setNewTool({ title: '', webhookUrl: '', description: '' });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </TabsContent>}

          {canViewWebhooks && <TabsContent value="logs">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Webhook Logs</h2>
                  <p className="text-sm text-muted-foreground">
                    Inspect raw payloads received from Vapi tool calls and transcripts.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={logFilter} onValueChange={setLogFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter logs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Logs</SelectItem>
                      <SelectItem value="tools">Tool Calls Only</SelectItem>
                      <SelectItem value="chat">Chat Only</SelectItem>
                      {availableTools.map(tool => (
                        <SelectItem key={tool} value={tool}>
                          {tool.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={fetchWebhookLogs} disabled={logsLoading}>
                    <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {webhookLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                  <FileText className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>No webhook logs yet</p>
                  <p className="text-sm mt-1">Click the Logs tab to load recent payloads</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                  <FileText className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>No logs match this filter</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log) => {
                    const isExpanded = expandedLogs.has(log.id);
                    const toolName = getToolName(log.raw_payload);
                    const isToolCall = !!toolName;
                    
                    return (
                      <div
                        key={log.id}
                        className={`rounded-lg border bg-card overflow-hidden ${isToolCall ? 'border-primary/50' : 'border-border'}`}
                      >
                        <button
                          onClick={() => toggleLogExpanded(log.id)}
                          className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  isToolCall 
                                    ? 'bg-primary/10 text-primary font-medium' 
                                    : log.role === 'user' 
                                    ? 'bg-blue-500/10 text-blue-500'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {isToolCall ? toolName.replace(/_/g, ' ').toUpperCase() : log.role}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(log.created_at)}
                                </span>
                              </div>
                              <p className="text-sm truncate mt-1">{log.content.substring(0, 80)}...</p>
                            </div>
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="border-t border-border p-3 bg-muted/30">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Raw Payload:</p>
                            <pre className="text-xs bg-background p-3 rounded-md overflow-x-auto max-h-64 overflow-y-auto">
                              {JSON.stringify(log.raw_payload, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </TabsContent>}

          <TabsContent value="voice">
            <VoiceSettings />
          </TabsContent>

          <TabsContent value="notifications">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-semibold mb-2">Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  Notification settings coming soon.
                </p>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="security">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-semibold mb-2">Security</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your account security settings.
                </p>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-medium mb-2">Account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Signed in as <span className="font-medium text-foreground">{user?.email}</span>
                </p>
                <Button variant="destructive" onClick={handleLogout} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            </motion.div>
          </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
