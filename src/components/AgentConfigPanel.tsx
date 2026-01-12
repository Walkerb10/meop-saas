import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Save, Bot, Mic, Brain, Wrench, Sliders, 
  Loader2, Play, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Agent, AGENT_TEMPLATES } from '@/hooks/useAgents';

interface AgentConfigPanelProps {
  agent: Agent;
  onSave: (updates: Partial<Agent>) => Promise<void>;
  onClose: () => void;
}

const AVAILABLE_MODELS = [
  { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
];

const AVAILABLE_VOICES = [
  { id: 'alloy', name: 'Alloy' },
  { id: 'echo', name: 'Echo' },
  { id: 'fable', name: 'Fable' },
  { id: 'onyx', name: 'Onyx' },
  { id: 'nova', name: 'Nova' },
  { id: 'shimmer', name: 'Shimmer' },
];

const AVAILABLE_TOOLS = [
  { id: 'research', name: 'Research', description: 'Web search and analysis' },
  { id: 'calendar', name: 'Calendar', description: 'Schedule management' },
  { id: 'tasks', name: 'Tasks', description: 'Task creation and tracking' },
  { id: 'email', name: 'Email', description: 'Send emails' },
  { id: 'slack', name: 'Slack', description: 'Slack messaging' },
  { id: 'discord', name: 'Discord', description: 'Discord messaging' },
  { id: 'web_search', name: 'Web Search', description: 'Search the internet' },
  { id: 'notifications', name: 'Notifications', description: 'Push notifications' },
];

export function AgentConfigPanel({ agent, onSave, onClose }: AgentConfigPanelProps) {
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description || '');
  const [model, setModel] = useState(agent.config.model || 'gpt-5');
  const [voice, setVoice] = useState(agent.config.voice || 'alloy');
  const [systemPrompt, setSystemPrompt] = useState(agent.config.systemPrompt || '');
  const [temperature, setTemperature] = useState(agent.config.temperature || 0.7);
  const [tools, setTools] = useState<string[]>(agent.config.tools || []);
  const [saving, setSaving] = useState(false);

  const toggleTool = (toolId: string) => {
    setTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(t => t !== toolId)
        : [...prev, toolId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name,
        description,
        config: {
          ...agent.config,
          model,
          voice,
          systemPrompt,
          temperature,
          tools,
        },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-semibold">Configure Agent</h2>
            <p className="text-xs text-muted-foreground">{agent.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="gap-1.5">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="model" className="gap-1.5">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Model</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-1.5">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Tools</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-1.5">
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">Advanced</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Agent Name</Label>
                  <Input 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    placeholder="My Agent"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What does this agent do?"
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Voice</Label>
                  <Select value={voice} onValueChange={setVoice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_VOICES.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="model" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} <span className="text-muted-foreground">({m.provider})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>System Prompt</Label>
                  <Textarea 
                    value={systemPrompt} 
                    onChange={e => setSystemPrompt(e.target.value)}
                    placeholder="You are a helpful AI assistant..."
                    className="min-h-[120px] font-mono text-sm"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Temperature</Label>
                    <span className="text-sm text-muted-foreground">{temperature.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[temperature]}
                    onValueChange={([v]) => setTemperature(v)}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Available Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AVAILABLE_TOOLS.map(tool => (
                    <div 
                      key={tool.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        tools.includes(tool.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleTool(tool.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{tool.name}</span>
                        <Switch 
                          checked={tools.includes(tool.id)}
                          onCheckedChange={() => toggleTool(tool.id)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Voice</Label>
                    <p className="text-xs text-muted-foreground">Allow voice interactions</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Stream Responses</Label>
                    <p className="text-xs text-muted-foreground">Show responses as they generate</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Memory Enabled</Label>
                    <p className="text-xs text-muted-foreground">Remember past conversations</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
