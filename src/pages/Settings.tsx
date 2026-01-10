import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Webhook, Volume2, Bell, Shield, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SequencesManager } from '@/components/SequencesManager';
import { AppLayout } from '@/components/AppLayout';
import { useSequences } from '@/hooks/useSequences';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const ELEVENLABS_WEBHOOKS = [
  {
    name: 'Conversation Webhook',
    description: 'Receives transcripts and events from ElevenLabs conversations',
    path: 'elevenlabs-webhook',
  },
  {
    name: 'Conversation Token',
    description: 'Generates signed URLs for starting agent conversations',
    path: 'elevenlabs-conversation-token',
  },
  {
    name: 'Text-to-Speech',
    description: 'Converts text to speech audio',
    path: 'elevenlabs-tts',
  },
  {
    name: 'Speech-to-Text',
    description: 'Converts audio to text transcripts',
    path: 'elevenlabs-stt',
  },
];

const Settings = () => {
  const { sequences, addSequence, updateSequence, deleteSequence } = useSequences();
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('selectedVoice') || 'Sarah';
  });
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);

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
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="w-4 h-4" />
              <span className="hidden sm:inline">Webhooks</span>
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
              {/* ElevenLabs Webhooks Section */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">ElevenLabs Webhooks</h2>
                  <p className="text-sm text-muted-foreground">
                    Use these endpoints to integrate with ElevenLabs agent tools and callbacks.
                  </p>
                </div>
                <div className="grid gap-3">
                  {ELEVENLABS_WEBHOOKS.map((webhook) => (
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
                  Security settings coming soon.
                </p>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;
