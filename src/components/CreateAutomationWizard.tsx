import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Mail,
  Search,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Icons for action types - using custom SVGs for Discord and Slack
const SlackIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
  </svg>
);

const DiscordIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
  </svg>
);

type ActionType = 'text' | 'slack' | 'discord' | 'email' | 'research';

interface ActionOption {
  type: ActionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const ACTION_OPTIONS: ActionOption[] = [
  {
    type: 'text',
    label: 'Text Message',
    description: 'Send an SMS to a phone number',
    icon: <MessageSquare className="w-6 h-6" />,
    color: 'bg-green-500/10 text-green-500 border-green-500/30',
  },
  {
    type: 'slack',
    label: 'Slack',
    description: 'Send a message to a Slack channel',
    icon: <SlackIcon />,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  },
  {
    type: 'discord',
    label: 'Discord',
    description: 'Send a message to a Discord channel',
    icon: <DiscordIcon />,
    color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
  },
  {
    type: 'email',
    label: 'Email',
    description: 'Send an email to recipients',
    icon: <Mail className="w-6 h-6" />,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  },
  {
    type: 'research',
    label: 'Research',
    description: 'AI-powered research on a topic',
    icon: <Search className="w-6 h-6" />,
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  },
];

const SLACK_CHANNELS = [
  { value: 'all_bhva', label: '#all_bhva' },
  { value: 'general', label: '#general' },
  { value: 'random', label: '#random' },
];

const DISCORD_CHANNELS = [
  { value: 'admin', label: '#admin' },
  { value: 'general', label: '#general' },
  { value: 'announcements', label: '#announcements' },
];

const OUTPUT_FORMATS = [
  { value: 'summary', label: 'Summary' },
  { value: 'detailed', label: 'Detailed Report' },
  { value: 'bullets', label: 'Bullet Points' },
  { value: 'actionable', label: 'Actionable Insights' },
  { value: 'problem_framework', label: 'Problem Framework' },
];

interface CreateAutomationWizardProps {
  onComplete: (data: {
    name: string;
    actionType: ActionType;
    config: Record<string, string>;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CreateAutomationWizard({
  onComplete,
  onCancel,
  isSubmitting = false,
}: CreateAutomationWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<ActionType | null>(null);
  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});

  const selectedOption = ACTION_OPTIONS.find((o) => o.type === selectedType);

  const handleNext = () => {
    if (step === 1 && selectedType) {
      // Set default name based on type
      if (!name) {
        setName(selectedOption?.label || 'New Automation');
      }
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      onCancel();
    }
  };

  const handleSubmit = () => {
    if (!selectedType) return;
    onComplete({
      name: name || selectedOption?.label || 'New Automation',
      actionType: selectedType,
      config,
    });
  };

  const isStep2Valid = () => {
    if (!selectedType) return false;
    switch (selectedType) {
      case 'text':
        return !!config.phone && !!config.message;
      case 'slack':
        return !!config.channel && !!config.message;
      case 'discord':
        return !!config.channel && !!config.message;
      case 'email':
        return !!config.to && !!config.subject && !!config.message;
      case 'research':
        return !!config.query;
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">What do you want to automate?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the type of action for your automation
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACTION_OPTIONS.map((option) => (
          <motion.button
            key={option.type}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedType(option.type)}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
              selectedType === option.type
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-accent/50'
            )}
          >
            <div
              className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center border',
                option.color
              )}
            >
              {option.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{option.label}</p>
              <p className="text-xs text-muted-foreground truncate">
                {option.description}
              </p>
            </div>
            {selectedType === option.type && (
              <Check className="w-5 h-5 text-primary shrink-0" />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => {
    if (!selectedType) return null;

    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <div
            className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center border mx-auto mb-3',
              selectedOption?.color
            )}
          >
            {selectedOption?.icon}
          </div>
          <h2 className="text-xl font-semibold">{selectedOption?.label}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your automation details
          </p>
        </div>

        <div className="space-y-4">
          {/* Name field for all types */}
          <div className="space-y-2">
            <Label htmlFor="name">Automation Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`My ${selectedOption?.label} Automation`}
            />
          </div>

          {/* Type-specific fields */}
          {selectedType === 'text' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={config.phone || ''}
                  onChange={(e) =>
                    setConfig({ ...config, phone: e.target.value })
                  }
                  placeholder="+18005551234"
                  type="tel"
                />
                <p className="text-xs text-muted-foreground">
                  Format: +1XXXXXXXXXX (E.164)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={config.message || ''}
                  onChange={(e) =>
                    setConfig({ ...config, message: e.target.value })
                  }
                  placeholder="Enter your message..."
                  className="min-h-[100px]"
                />
              </div>
            </>
          )}

          {selectedType === 'slack' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="channel">Channel *</Label>
                <Select
                  value={config.channel || ''}
                  onValueChange={(v) => setConfig({ ...config, channel: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {SLACK_CHANNELS.map((ch) => (
                      <SelectItem key={ch.value} value={ch.value}>
                        {ch.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={config.message || ''}
                  onChange={(e) =>
                    setConfig({ ...config, message: e.target.value })
                  }
                  placeholder="Enter your message..."
                  className="min-h-[100px]"
                />
              </div>
            </>
          )}

          {selectedType === 'discord' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="channel">Channel *</Label>
                <Select
                  value={config.channel || ''}
                  onValueChange={(v) => setConfig({ ...config, channel: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCORD_CHANNELS.map((ch) => (
                      <SelectItem key={ch.value} value={ch.value}>
                        {ch.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={config.message || ''}
                  onChange={(e) =>
                    setConfig({ ...config, message: e.target.value })
                  }
                  placeholder="Enter your message..."
                  className="min-h-[100px]"
                />
              </div>
            </>
          )}

          {selectedType === 'email' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="to">To (Email) *</Label>
                <Input
                  id="to"
                  value={config.to || ''}
                  onChange={(e) => setConfig({ ...config, to: e.target.value })}
                  placeholder="recipient@example.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={config.subject || ''}
                  onChange={(e) =>
                    setConfig({ ...config, subject: e.target.value })
                  }
                  placeholder="Email subject..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={config.message || ''}
                  onChange={(e) =>
                    setConfig({ ...config, message: e.target.value })
                  }
                  placeholder="Enter your email content..."
                  className="min-h-[100px]"
                />
              </div>
            </>
          )}

          {selectedType === 'research' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="query">Research Query *</Label>
                <Textarea
                  id="query"
                  value={config.query || ''}
                  onChange={(e) =>
                    setConfig({ ...config, query: e.target.value })
                  }
                  placeholder="What would you like to research?"
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="format">Output Format</Label>
                <Select
                  value={config.outputFormat || 'summary'}
                  onValueChange={(v) =>
                    setConfig({ ...config, outputFormat: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="length">Target Word Count</Label>
                <Input
                  id="length"
                  value={config.outputLength || '500'}
                  onChange={(e) =>
                    setConfig({ ...config, outputLength: e.target.value })
                  }
                  placeholder="500"
                  type="number"
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 py-4 border-b">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
            step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          1
        </div>
        <div className="w-12 h-0.5 bg-muted">
          <div
            className={cn(
              'h-full bg-primary transition-all',
              step >= 2 ? 'w-full' : 'w-0'
            )}
          />
        </div>
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
            step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          2
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: step === 1 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: step === 1 ? 20 : -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 ? renderStep1() : renderStep2()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4 bg-background">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step === 1 ? (
            <Button
              onClick={handleNext}
              disabled={!selectedType}
              className="gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!isStep2Valid() || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create Automation
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
