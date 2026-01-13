import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Mail, Send, X, Check, ChevronRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

// Slack icon component  
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

// Discord icon component
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

type DeliveryMethod = 'text' | 'email' | 'slack' | 'discord';

const DELIVERY_OPTIONS: Array<{
  id: DeliveryMethod;
  label: string;
  icon: React.ElementType;
  color: string;
}> = [
  { id: 'text', label: 'Text', icon: MessageSquare, color: 'bg-green-500/10 text-green-500 border-green-500/30' },
  { id: 'email', label: 'Email', icon: Mail, color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  { id: 'slack', label: 'Slack', icon: SlackIcon, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
  { id: 'discord', label: 'Discord', icon: DiscordIcon, color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' },
];

const SLACK_CHANNELS = ['general', 'all_bhva', 'announcements'];
const DISCORD_CHANNELS = ['admin', 'general', 'announcements'];

interface SendResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  researchContent: string;
  researchName?: string;
}

export function SendResultsDialog({ 
  open, 
  onOpenChange, 
  researchContent,
  researchName = 'Research Results'
}: SendResultsDialogProps) {
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Config state
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(`${researchName}`);
  const [channel, setChannel] = useState('');
  const [message, setMessage] = useState('Here are the research results:\n\n{{result}}');

  const handleSelectMethod = (method: DeliveryMethod) => {
    setSelectedMethod(method);
    // Set defaults
    if (method === 'slack') setChannel('all_bhva');
    if (method === 'discord') setChannel('admin');
    setStep('configure');
  };

  const handleSendNow = async () => {
    if (!selectedMethod) return;
    
    setSaving(true);
    try {
      // Replace {{result}} with actual content
      const finalMessage = message.replace(/\{\{result\}\}/g, researchContent);
      
      // Map to webhook action type
      const actionTypeMap: Record<DeliveryMethod, string> = {
        text: 'send_text',
        email: 'send_email',
        slack: 'slack_message',
        discord: 'discord_message',
      };

      // Build payload based on method
      let payload: Record<string, unknown> = {
        action_type: actionTypeMap[selectedMethod],
        message: finalMessage,
      };

      if (selectedMethod === 'text') {
        payload.phone = phone;
      } else if (selectedMethod === 'email') {
        payload.to = email;
        payload.subject = subject;
      } else if (selectedMethod === 'slack') {
        payload.slack_channel = channel;
      } else if (selectedMethod === 'discord') {
        payload.discord_channel = channel;
      }

      // Call the vapi-webhook to send immediately
      const { error } = await supabase.functions.invoke('vapi-webhook', {
        body: {
          message: {
            type: 'tool-calls',
            toolCalls: [{
              id: crypto.randomUUID(),
              type: 'function',
              function: {
                name: actionTypeMap[selectedMethod],
                arguments: JSON.stringify(payload),
              },
            }],
          },
        },
      });

      if (error) throw error;
      
      toast.success(`Results sent via ${selectedMethod}!`);
      onOpenChange(false);
      resetState();
    } catch (err) {
      console.error('Failed to send:', err);
      toast.error('Failed to send results');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSequence = async () => {
    if (!selectedMethod) return;
    
    setSaving(true);
    try {
      // Build nodes for the sequence
      const triggerId = crypto.randomUUID();
      const actionId = crypto.randomUUID();

      const nodeTypeMap: Record<DeliveryMethod, string> = {
        text: 'action_text',
        email: 'action_email',
        slack: 'action_slack',
        discord: 'action_discord',
      };

      const config: Record<string, unknown> = { message };
      if (selectedMethod === 'text') config.to = phone;
      if (selectedMethod === 'email') {
        config.to = email;
        config.subject = subject;
      }
      if (selectedMethod === 'slack' || selectedMethod === 'discord') {
        config.channel = channel;
      }

      const nodes = [
        {
          id: triggerId,
          type: 'trigger_manual',
          label: 'Manual Trigger',
          position: { x: 150, y: 100 },
          config: {},
        },
        {
          id: actionId,
          type: nodeTypeMap[selectedMethod],
          label: `Send to ${selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1)}`,
          position: { x: 150, y: 250 },
          config,
        },
      ];

      const connections = [
        { id: crypto.randomUUID(), sourceId: triggerId, targetId: actionId },
      ];

      const stepsJson = { nodes, connections } as unknown as Json;

      const { error } = await supabase
        .from('automations')
        .insert({
          name: `Send ${researchName} to ${selectedMethod}`,
          is_active: true,
          steps: stepsJson,
          trigger_type: 'manual',
        });

      if (error) throw error;
      
      toast.success('Sequence created! You can run it anytime from Automations.');
      onOpenChange(false);
      resetState();
    } catch (err) {
      console.error('Failed to create sequence:', err);
      toast.error('Failed to create sequence');
    } finally {
      setSaving(false);
    }
  };

  const resetState = () => {
    setStep('select');
    setSelectedMethod(null);
    setPhone('');
    setEmail('');
    setSubject(`${researchName}`);
    setChannel('');
    setMessage('Here are the research results:\n\n{{result}}');
  };

  const handleBack = () => {
    if (step === 'configure') {
      setStep('select');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) resetState();
      onOpenChange(o);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Send Research Results
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3 py-4"
            >
              <p className="text-sm text-muted-foreground mb-4">
                Choose how you want to receive your research results:
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {DELIVERY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelectMethod(option.id)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border transition-all hover:border-primary/50 hover:bg-primary/5'
                      )}
                    >
                      <div className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center',
                        option.color
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="font-medium text-sm">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 'configure' && selectedMethod && (
            <motion.div
              key="configure"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back
              </button>

              {/* Method-specific config */}
              {selectedMethod === 'text' && (
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              )}

              {selectedMethod === 'email' && (
                <>
                  <div className="space-y-2">
                    <Label>Email Address *</Label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      placeholder="Subject line"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                </>
              )}

              {selectedMethod === 'slack' && (
                <div className="space-y-2">
                  <Label>Slack Channel *</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {SLACK_CHANNELS.map((ch) => (
                        <SelectItem key={ch} value={ch}>#{ch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedMethod === 'discord' && (
                <div className="space-y-2">
                  <Label>Discord Channel *</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCORD_CHANNELS.map((ch) => (
                        <SelectItem key={ch} value={ch}>#{ch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Message template */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Message</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const pos = message.length;
                      setMessage(message + '{{result}}');
                    }}
                    className="text-xs h-7 gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Add Result
                  </Button>
                </div>
                <Textarea
                  placeholder="Enter your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">{'{{result}}'}</code> to include research content
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSendNow}
                  disabled={saving || !isConfigValid(selectedMethod, { phone, email, channel })}
                  className="flex-1 gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Now
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCreateSequence}
                  disabled={saving || !isConfigValid(selectedMethod, { phone, email, channel })}
                  className="flex-1 gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save as Sequence
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function isConfigValid(
  method: DeliveryMethod, 
  config: { phone: string; email: string; channel: string }
): boolean {
  switch (method) {
    case 'text':
      return config.phone.length > 0;
    case 'email':
      return config.email.length > 0;
    case 'slack':
    case 'discord':
      return config.channel.length > 0;
    default:
      return false;
  }
}
