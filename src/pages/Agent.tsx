import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Bot, Grid, List, Filter, 
  Loader2, Settings, Play, Zap
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAgents, Agent, AGENT_TEMPLATES } from '@/hooks/useAgents';
import { AgentCard } from '@/components/AgentCard';
import { AgentConfigPanel } from '@/components/AgentConfigPanel';
import { CreateAgentDialog } from '@/components/CreateAgentDialog';
import { VoiceInterface } from '@/components/VoiceInterface';
import { useRAGChat } from '@/hooks/useRAGChat';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'active' | 'inactive';

export default function AgentPage() {
  const { agents, loading, createAgent, updateAgent, deleteAgent, toggleAgentStatus } = useAgents();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { sendMessage } = useRAGChat();

  // Filter agents
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [agents, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    totalConversations: agents.reduce((sum, a) => sum + a.stats.totalConversations, 0),
    totalExecutions: agents.reduce((sum, a) => sum + a.stats.totalExecutions, 0),
  }), [agents]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // Show config panel when editing
  if (editingAgent) {
    return (
      <AppLayout>
        <AgentConfigPanel
          agent={editingAgent}
          onSave={async (updates) => {
            await updateAgent(editingAgent.id, updates);
          }}
          onClose={() => setEditingAgent(null)}
        />
      </AppLayout>
    );
  }

  // Show agent detail with voice interface
  if (selectedAgent) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setSelectedAgent(null)}>
                ← Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                  {AGENT_TEMPLATES[selectedAgent.template]?.icon || '🤖'}
                </div>
                <div>
                  <h1 className="text-xl font-bold">{selectedAgent.name}</h1>
                  <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setEditingAgent(selectedAgent)}>
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>

          {/* Voice Interface */}
          <div className="flex flex-col items-center py-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center mb-8"
            >
              <h2 className="text-2xl font-semibold mb-2">Talk to {selectedAgent.name}</h2>
              <p className="text-muted-foreground">Tap the microphone to start speaking</p>
            </motion.div>

            <VoiceInterface
              size="large"
              onSendMessage={async (message) => {
                await sendMessage(message);
                return "I've processed your request.";
              }}
            />
          </div>

          {/* Agent Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border text-center">
              <Zap className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{selectedAgent.stats.totalExecutions}</p>
              <p className="text-xs text-muted-foreground">Total Runs</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border text-center">
              <Bot className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{selectedAgent.stats.totalConversations}</p>
              <p className="text-xs text-muted-foreground">Conversations</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border text-center">
              <Play className="w-5 h-5 text-green-500 mx-auto mb-2" />
              <Badge variant={selectedAgent.status === 'active' ? 'default' : 'secondary'}>
                {selectedAgent.status}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Status</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">AI Agents</h1>
            <p className="text-muted-foreground">
              Create and manage your AI assistants
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Agent
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Bot className="w-4 h-4" />
              <span className="text-xs">Total Agents</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Play className="w-4 h-4 text-green-500" />
              <span className="text-xs">Active</span>
            </div>
            <p className="text-2xl font-bold">{stats.active}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs">Executions</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalExecutions}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Bot className="w-4 h-4" />
              <span className="text-xs">Conversations</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalConversations}</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="grid">
                <Grid className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Agents Grid/List */}
        {filteredAgents.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No agents found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first agent to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Agent
              </Button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
          }>
            <AnimatePresence>
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={setEditingAgent}
                  onDelete={deleteAgent}
                  onToggleStatus={toggleAgentStatus}
                  onSelect={setSelectedAgent}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Agent Dialog */}
      <CreateAgentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={createAgent}
      />
    </AppLayout>
  );
}
