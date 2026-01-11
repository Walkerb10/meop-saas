import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Webhook, Volume2, Bell, Shield, Copy, Check, LogOut, Plus, Trash2, FileText, RefreshCw, ChevronDown, ChevronRight, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SequencesManager } from '@/components/SequencesManager';
import { AppLayout } from '@/components/AppLayout';
import { useSequences } from '@/hooks/useSequences';
import { useN8nTools } from '@/hooks/useN8nTools';
import { useAuth } from '@/hooks/useAuth';
import { useTimezone } from '@/hooks/useTimezone';
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

// N8nTool interface is now imported from useN8nTools

const VOICES = [
  { id: 'Roger', name: 'Roger', description: 'Deep & confident' },
  { id: 'Sarah', name: 'Sarah', description: 'Warm & friendly' },
  { id: 'Laura', name: 'Laura', description: 'Professional & clear' },
  { id: 'Charlie', name: 'Charlie', description: 'Casual & relaxed' },
  { id: 'George', name: 'George', description: 'British & refined' },
  { id: 'Callum', name: 'Callum', description: 'Scottish accent' },
  { id: 'Liam', name: 'Liam', description: 'Young & energetic' },
  { id: 'Alice', name: 'Alice', description: 'Soft & gentle' },
  { id: 'Matilda', name: 'Matilda', description: 'Warm & expressive' },
  { id: 'Jessica', name: 'Jessica', description: 'Bright & engaging' },
  { id: 'Eric', name: 'Eric', description: 'Calm & reassuring' },
  { id: 'Brian', name: 'Brian', description: 'Authoritative' },
];

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
  const { timezone, setTimezone, timezones, formatDateTime } = useTimezone();
  const navigate = useNavigate();
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('selectedVoice') || 'Sarah';
  });
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  
  // Webhook logs state
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [logFilter, setLogFilter] = useState<string>('all');

  // Extract tool name from raw payload
  const getToolName = (payload: Json): string | null => {
    if (!payload || typeof payload !== 'object') return null;
    const p = payload as Record<string, unknown>;
    
    // Check for known tool signatures
    if (p.tool_name && typeof p.tool_name === 'string') return p.tool_name;
    if (p.message_content && p.frequency) return 'schedule_text';
    if (p.type === 'user_transcript' || p.type === 'user_transcription') return null; // chat
    if (p.type === 'agent_response') return null; // chat
    if (p.webhook_url || p.n8n_webhook) return 'n8n_trigger';
    if (p.research_query || p.query) return 'research';
    if (p.phone_number && p.message) return 'send_text';
    
    return null;
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
    if (logFilter === 'chat') {
      return webhookLogs.filter(log => !getToolName(log.raw_payload));
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

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('selectedVoice', voice);
  };

  const copyWebhookUrl = (path: string) => {
    const url = `${supabaseUrl}/functions/v1/${path}`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(path);
    setTimeout(() => setCopiedWebhook(null), 2000);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your integrations and preferences
          </p>
        </div>

        <Tabs defaultValue="webhooks" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="w-4 h-4" />
              <span className="hidden sm:inline">Webhooks</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2" onClick={fetchWebhookLogs}>
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
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

          <TabsContent value="webhooks">
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
                    { type: 'Slack', url: 'https://walkerb.app.n8n.cloud/webhook/slack-messages', channel: 'all_bhva', color: 'text-purple-500' },
                    { type: 'Discord', url: 'https://walkerb.app.n8n.cloud/webhook/discord-messages', channel: 'admin', color: 'text-indigo-500' },
                    { type: 'Email', url: 'https://walkerb.app.n8n.cloud/webhook/send-email', color: 'text-green-500' },
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
          </TabsContent>

          <TabsContent value="logs">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Webhook Logs</h2>
                  <p className="text-sm text-muted-foreground">
                    Inspect raw payloads received from ElevenLabs and other tools.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={logFilter} onValueChange={setLogFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter logs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Logs</SelectItem>
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
          </TabsContent>

          <TabsContent value="voice">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-semibold mb-2">Voice Settings</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Choose the voice for your AI assistant.
                </p>
              </div>
              <div className="max-w-sm">
                <label className="text-sm font-medium mb-2 block">Select Voice</label>
                <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <div className="flex flex-col">
                          <span>{voice.name}</span>
                          <span className="text-xs text-muted-foreground">{voice.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Timezone Settings */}
              <div className="border-t border-border pt-6">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Timezone
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  All times in the app will be displayed in this timezone.
                </p>
                <div className="max-w-sm">
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
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
    </AppLayout>
  );
};

export default Settings;
