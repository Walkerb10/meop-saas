import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Mail, Search, ArrowLeft, ArrowRight, Check, Loader2, Clock, Calendar, Repeat, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AIEnhanceButton } from '@/components/AIEnhanceButton';
import { supabase } from '@/integrations/supabase/client';

// Icons for action types - using custom SVGs for Discord and Slack
const SlackIcon = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
  </svg>;
const DiscordIcon = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
  </svg>;
type ActionType = 'text' | 'slack' | 'discord' | 'email' | 'research' | 'linkedin';
type FrequencyType = 'manual' | 'once' | 'daily' | 'weekly' | 'monthly';
interface ActionOption {
  type: ActionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}
interface FrequencyOption {
  type: FrequencyType;
  label: string;
  description: string;
  icon: React.ReactNode;
}
const ACTION_OPTIONS: ActionOption[] = [{
  type: 'text',
  label: 'Text Message',
  description: 'Send an SMS to a phone number',
  icon: <MessageSquare className="w-6 h-6" />,
  color: 'bg-green-500/10 text-green-500 border-green-500/30'
}, {
  type: 'slack',
  label: 'Slack',
  description: 'Send a message to a Slack channel',
  icon: <SlackIcon />,
  color: 'bg-purple-500/10 text-purple-500 border-purple-500/30'
}, {
  type: 'discord',
  label: 'Discord',
  description: 'Send a message to a Discord channel',
  icon: <DiscordIcon />,
  color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30'
}, {
  type: 'email',
  label: 'Email',
  description: 'Send an email to recipients',
  icon: <Mail className="w-6 h-6" />,
  color: 'bg-blue-500/10 text-blue-500 border-blue-500/30'
}, {
  type: 'research',
  label: 'Research',
  description: 'AI-powered research on a topic',
  icon: <Search className="w-6 h-6" />,
  color: 'bg-amber-500/10 text-amber-500 border-amber-500/30'
}, {
  type: 'linkedin',
  label: 'LinkedIn Research',
  description: 'Content ideas from social trends',
  icon: <TrendingUp className="w-6 h-6" />,
  color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30'
}];
const FREQUENCY_OPTIONS: FrequencyOption[] = [{
  type: 'manual',
  label: 'Manual',
  description: 'Run only when you trigger it',
  icon: <Zap className="w-5 h-5" />
}, {
  type: 'once',
  label: 'Once',
  description: 'Run once at a specific time',
  icon: <Clock className="w-5 h-5" />
}, {
  type: 'daily',
  label: 'Daily',
  description: 'Run every day at a set time',
  icon: <Calendar className="w-5 h-5" />
}, {
  type: 'weekly',
  label: 'Weekly',
  description: 'Run on specific days each week',
  icon: <Repeat className="w-5 h-5" />
}, {
  type: 'monthly',
  label: 'Monthly',
  description: 'Run on a specific day each month',
  icon: <Calendar className="w-5 h-5" />
}];
const DAYS_OF_WEEK = [{
  value: 'monday',
  label: 'Mon'
}, {
  value: 'tuesday',
  label: 'Tue'
}, {
  value: 'wednesday',
  label: 'Wed'
}, {
  value: 'thursday',
  label: 'Thu'
}, {
  value: 'friday',
  label: 'Fri'
}, {
  value: 'saturday',
  label: 'Sat'
}, {
  value: 'sunday',
  label: 'Sun'
}];
const SLACK_CHANNELS = [{
  value: 'all_bhva',
  label: '#all_bhva'
}, {
  value: 'general',
  label: '#general'
}, {
  value: 'random',
  label: '#random'
}];
const DISCORD_CHANNELS = [{
  value: 'admin',
  label: '#admin'
}, {
  value: 'general',
  label: '#general'
}, {
  value: 'announcements',
  label: '#announcements'
}];
const OUTPUT_FORMATS = [{
  value: 'summary',
  label: 'Summary'
}, {
  value: 'detailed',
  label: 'Detailed Report'
}, {
  value: 'bullets',
  label: 'Bullet Points'
}, {
  value: 'actionable',
  label: 'Actionable Insights'
}, {
  value: 'problem_framework',
  label: 'Problem Framework'
}];
const LENGTH_OPTIONS = [{
  value: '125',
  label: 'Tiny',
  desc: '¼ page'
}, {
  value: '250',
  label: 'Short',
  desc: '½ page'
}, {
  value: '500',
  label: 'Medium',
  desc: '1 page'
}, {
  value: '1500',
  label: 'Long',
  desc: '3 pages'
}, {
  value: '2500',
  label: 'Extended',
  desc: '5 pages'
}, {
  value: '5000',
  label: 'Extra Long',
  desc: '10 pages'
}, {
  value: 'custom',
  label: 'Custom',
  desc: 'Enter pages'
}];
interface CreateAutomationWizardProps {
  onComplete: (data: {
    name: string;
    actionType: ActionType;
    config: Record<string, string>;
    frequency: FrequencyType;
    frequencyConfig: Record<string, string | string[]>;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}
export function CreateAutomationWizard({
  onComplete,
  onCancel,
  isSubmitting = false
}: CreateAutomationWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<ActionType | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [frequency, setFrequency] = useState<FrequencyType>('manual');
  const [frequencyConfig, setFrequencyConfig] = useState<Record<string, string | string[]>>({
    time: '09:00',
    days: [],
    dayOfMonth: '1'
  });
  const selectedOption = ACTION_OPTIONS.find(o => o.type === selectedType);

  // Fetch existing automation names to check for duplicates
  useEffect(() => {
    const fetchNames = async () => {
      const {
        data
      } = await supabase.from('automations').select('name');
      if (data) {
        setExistingNames(data.map(a => a.name.toLowerCase()));
      }
    };
    fetchNames();
  }, []);

  // Validate name on change
  const handleNameChange = (value: string) => {
    setName(value);
    if (!value.trim()) {
      setNameError('Name is required');
    } else if (existingNames.includes(value.toLowerCase().trim())) {
      setNameError('An automation with this name already exists');
    } else {
      setNameError('');
    }
  };
  const handleNext = () => {
    if (step === 1 && selectedType) {
      setStep(2);
    } else if (step === 2 && isStep2Valid()) {
      setStep(3);
    }
  };
  const handleBack = () => {
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
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
      frequency,
      frequencyConfig
    });
  };
  const isStep2Valid = () => {
    if (!selectedType || !name.trim() || nameError) return false;
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
      case 'linkedin':
        return true; // LinkedIn uses preset config
      default:
        return false;
    }
  };
  const isStep3Valid = () => {
    if (frequency === 'manual') return true;
    if (frequency === 'weekly') {
      const days = frequencyConfig.days as string[];
      return days && days.length > 0;
    }
    return true;
  };
  const toggleDay = (day: string) => {
    const currentDays = frequencyConfig.days as string[] || [];
    if (currentDays.includes(day)) {
      setFrequencyConfig({
        ...frequencyConfig,
        days: currentDays.filter(d => d !== day)
      });
    } else {
      setFrequencyConfig({
        ...frequencyConfig,
        days: [...currentDays, day]
      });
    }
  };
  const renderStep1 = () => <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold">What do you want to automate?</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ACTION_OPTIONS.map(option => <motion.button key={option.type} whileHover={{
        scale: 1.02
      }} whileTap={{
        scale: 0.98
      }} onClick={() => {
        setSelectedType(option.type);
        setStep(2);
      }} className={cn('flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center', 'border-border hover:border-primary/50 hover:bg-accent/50')}>
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center border', option.color)}>
              {option.icon}
            </div>
            <p className="font-medium text-sm">{option.label}</p>
          </motion.button>)}
      </div>
    </div>;
  const renderStep2 = () => {
    if (!selectedType) return null;
    return <div className="space-y-4">
        <div className="text-center mb-6">
          <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center border mx-auto mb-3', selectedOption?.color)}>
            {selectedOption?.icon}
          </div>
          <h2 className="text-xl font-semibold">Configure {selectedOption?.label}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set up the details for your sequence
          </p>
        </div>

        <div className="space-y-4">
          {/* Name field for all types */}
          <div className="space-y-2">
            <Label htmlFor="name">Automation Name <span className="text-destructive">*</span></Label>
            <Input id="name" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Enter a unique name..." className={nameError ? 'border-destructive' : ''} />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>

          {/* Type-specific fields */}
          {selectedType === 'text' && <>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" value={config.phone || ''} onChange={e => setConfig({
              ...config,
              phone: e.target.value
            })} placeholder="+18005551234" type="tel" />
                <p className="text-xs text-muted-foreground">
                  Format: +1XXXXXXXXXX (E.164)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea id="message" value={config.message || ''} onChange={e => setConfig({
              ...config,
              message: e.target.value
            })} placeholder="Enter your message..." className="min-h-[100px]" />
              </div>
            </>}

          {selectedType === 'slack' && <>
              <div className="space-y-2">
                <Label htmlFor="channel">Channel *</Label>
                <Select value={config.channel || ''} onValueChange={v => setConfig({
              ...config,
              channel: v
            })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {SLACK_CHANNELS.map(ch => <SelectItem key={ch.value} value={ch.value}>
                        {ch.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea id="message" value={config.message || ''} onChange={e => setConfig({
              ...config,
              message: e.target.value
            })} placeholder="Enter your message..." className="min-h-[100px]" />
              </div>
            </>}

          {selectedType === 'discord' && <>
              <div className="space-y-2">
                <Label htmlFor="channel">Channel *</Label>
                <Select value={config.channel || ''} onValueChange={v => setConfig({
              ...config,
              channel: v
            })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCORD_CHANNELS.map(ch => <SelectItem key={ch.value} value={ch.value}>
                        {ch.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea id="message" value={config.message || ''} onChange={e => setConfig({
              ...config,
              message: e.target.value
            })} placeholder="Enter your message..." className="min-h-[100px]" />
              </div>
            </>}

          {selectedType === 'email' && <>
              <div className="space-y-2">
                <Label htmlFor="to">To (Email) *</Label>
                <Input id="to" value={config.to || ''} onChange={e => setConfig({
              ...config,
              to: e.target.value
            })} placeholder="recipient@example.com" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input id="subject" value={config.subject || ''} onChange={e => setConfig({
              ...config,
              subject: e.target.value
            })} placeholder="Email subject..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea id="message" value={config.message || ''} onChange={e => setConfig({
              ...config,
              message: e.target.value
            })} placeholder="Enter your email content..." className="min-h-[100px]" />
              </div>
            </>}

          {selectedType === 'research' && <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="query">Research Query <span className="text-destructive">*</span></Label>
                  <AIEnhanceButton value={config.query || ''} onChange={v => setConfig({
                ...config,
                query: v
              })} type="research" context={{
                output_format: config.outputFormat,
                output_length: config.outputLength
              }} />
                </div>
                <Textarea id="query" value={config.query || ''} onChange={e => setConfig({
              ...config,
              query: e.target.value
            })} placeholder="What would you like to research?" className="min-h-[80px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="format">Output Format</Label>
                <Select value={config.outputFormat || 'summary'} onValueChange={v => setConfig({
              ...config,
              outputFormat: v
            })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_FORMATS.map(f => <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="length">Target Length</Label>
                <Select value={config.outputLengthType || '500'} onValueChange={v => {
                  setConfig({
                    ...config,
                    outputLengthType: v,
                    outputLength: v !== 'custom' ? v : config.outputLength
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select length" />
                  </SelectTrigger>
                  <SelectContent>
                    {LENGTH_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-muted-foreground">({opt.desc})</span>
                        </span>
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                
                {config.outputLengthType === 'custom' && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      min={0.25}
                      step={0.25}
                      value={config.customPages || ''}
                      onChange={e => {
                        const pages = parseFloat(e.target.value) || 1;
                        setConfig({
                          ...config,
                          customPages: e.target.value,
                          outputLength: String(Math.round(pages * 500))
                        });
                      }}
                      placeholder="1"
                      className="w-24 h-10"
                    />
                    <span className="text-sm text-muted-foreground">pages (~{config.outputLength || 500} words)</span>
                  </div>
                )}
              </div>
            </>}

          {selectedType === 'linkedin' && <>
              <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-sm">
                <p className="font-medium text-cyan-700 dark:text-cyan-300 mb-2">LinkedIn Research Automation</p>
                <p className="text-muted-foreground">
                  This automation scrapes TikTok, LinkedIn, Yahoo Finance, X, and Reddit for AI/startup trends 
                  and generates 3 human-like post drafts in Walker's style - contrarian hooks, punchy sentences, 
                  and specific CTAs.
                </p>
              </div>
            </>}
        </div>
      </div>;
  };
  const renderStep3 = () => <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center border bg-primary/10 text-primary border-primary/30 mx-auto mb-3">
          <Clock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-semibold">Set Frequency</h2>
        <p className="text-sm text-muted-foreground mt-1">
          How often should this sequence run?
        </p>
      </div>

      <div className="space-y-3">
        {FREQUENCY_OPTIONS.map(option => <motion.button key={option.type} whileHover={{
        scale: 1.01
      }} whileTap={{
        scale: 0.99
      }} onClick={() => setFrequency(option.type)} className={cn('flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left w-full', frequency === option.type ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/50')}>
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', frequency === option.type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              {option.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{option.label}</p>
              <p className="text-xs text-muted-foreground">
                {option.description}
              </p>
            </div>
            {frequency === option.type && <Check className="w-5 h-5 text-primary shrink-0" />}
          </motion.button>)}
      </div>

      {/* Frequency-specific configuration */}
      <AnimatePresence mode="wait">
        {frequency !== 'manual' && <motion.div initial={{
        opacity: 0,
        height: 0
      }} animate={{
        opacity: 1,
        height: 'auto'
      }} exit={{
        opacity: 0,
        height: 0
      }} className="space-y-4 pt-4 border-t">
            {/* Time picker for all scheduled options */}
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={frequencyConfig.time as string || '09:00'} onChange={e => setFrequencyConfig({
            ...frequencyConfig,
            time: e.target.value
          })} />
            </div>

            {/* Date picker for once */}
            {frequency === 'once' && <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={frequencyConfig.date as string || ''} onChange={e => setFrequencyConfig({
            ...frequencyConfig,
            date: e.target.value
          })} />
              </div>}

            {/* Day picker for weekly */}
            {frequency === 'weekly' && <div className="space-y-2">
                <Label>Days of the Week *</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => {
              const isSelected = (frequencyConfig.days as string[] || []).includes(day.value);
              return <button key={day.value} type="button" onClick={() => toggleDay(day.value)} className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors', isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                        {day.label}
                      </button>;
            })}
                </div>
              </div>}

            {/* Day of month for monthly */}
            {frequency === 'monthly' && <div className="space-y-2">
                <Label htmlFor="dayOfMonth">Day of Month</Label>
                <Select value={frequencyConfig.dayOfMonth as string || '1'} onValueChange={v => setFrequencyConfig({
            ...frequencyConfig,
            dayOfMonth: v
          })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({
                length: 28
              }, (_, i) => i + 1).map(day => <SelectItem key={day} value={day.toString()}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}
          </motion.div>}
      </AnimatePresence>
    </div>;
  return <div className="min-h-full flex flex-col">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 py-4">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors', step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
          1
        </div>
        <div className="w-8 h-0.5 bg-muted">
          <div className={cn('h-full bg-primary transition-all', step >= 2 ? 'w-full' : 'w-0')} />
        </div>
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors', step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
          2
        </div>
        <div className="w-8 h-0.5 bg-muted">
          <div className={cn('h-full bg-primary transition-all', step >= 3 ? 'w-full' : 'w-0')} />
        </div>
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors', step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
          3
        </div>
      </div>

      {/* Step labels */}
      

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{
            opacity: 0,
            x: step === 1 ? -20 : 20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: step === 1 ? 20 : -20
          }} transition={{
            duration: 0.2
          }}>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4 flex items-center justify-between">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>

        {step < 3 ? <Button onClick={handleNext} disabled={step === 1 ? !selectedType : !isStep2Valid()}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button> : <Button onClick={handleSubmit} disabled={isSubmitting || !isStep3Valid()}>
            {isSubmitting ? <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </> : <>
                <Check className="w-4 h-4 mr-2" />
                Create Sequence
              </>}
          </Button>}
      </div>
    </div>;
}