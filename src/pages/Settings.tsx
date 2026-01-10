import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Webhook, Volume2, Bell, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SequencesManager } from '@/components/SequencesManager';
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

const Settings = () => {
  const navigate = useNavigate();
  const { sequences, addSequence, updateSequence, deleteSequence } = useSequences();
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('selectedVoice') || 'Sarah';
  });

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('selectedVoice', voice);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-6">
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
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-semibold mb-2">n8n Webhook Sequences</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Create webhook URLs that can be called by ElevenLabs tools to trigger n8n workflows.
                  Each sequence maps to an n8n webhook that will be called when the tool is invoked.
                </p>
              </div>
              <SequencesManager
                sequences={sequences}
                onAdd={addSequence}
                onUpdate={updateSequence}
                onDelete={deleteSequence}
              />
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
      </main>
    </div>
  );
};

export default Settings;
