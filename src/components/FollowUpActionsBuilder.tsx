import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, MessageSquare, Mail, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FollowUpAction } from '@/types/agent';

// Discord icon component
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

// Slack icon component  
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  );
}

const PLATFORMS = [
  { id: 'text' as const, label: 'Text (SMS)', icon: MessageSquare, color: 'text-blue-500' },
  { id: 'email' as const, label: 'Email', icon: Mail, color: 'text-orange-500' },
  { id: 'slack' as const, label: 'Slack', icon: SlackIcon, color: 'text-green-500' },
  { id: 'discord' as const, label: 'Discord', icon: DiscordIcon, color: 'text-indigo-500' },
];

const SLACK_CHANNELS = [
  { value: 'all_bhva', label: 'all_bhva' },
];

const DISCORD_CHANNELS = [
  { value: 'admin', label: 'admin' },
];

interface FollowUpActionsBuilderProps {
  actions: FollowUpAction[];
  onChange: (actions: FollowUpAction[]) => void;
  primaryActionType: string;
}

export function FollowUpActionsBuilder({ 
  actions, 
  onChange,
  primaryActionType 
}: FollowUpActionsBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addAction = () => {
    const newAction: FollowUpAction = {
      id: crypto.randomUUID(),
      platform: 'slack',
      enabled: true,
      message: primaryActionType === 'research' 
        ? 'Here are the research results:\n\n{{result}}' 
        : '{{result}}',
      channel: 'all_bhva',
    };
    onChange([...actions, newAction]);
    setExpandedId(newAction.id);
  };

  const updateAction = (id: string, updates: Partial<FollowUpAction>) => {
    onChange(actions.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const removeAction = (id: string) => {
    onChange(actions.filter(a => a.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Then Send To...</h4>
          <p className="text-xs text-muted-foreground">
            Chain follow-up actions after the main task completes
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addAction}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {actions.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No follow-up actions yet. Add one to send results to Slack, Discord, Email, or Text.
          </p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {actions.map((action, index) => {
          const platform = PLATFORMS.find(p => p.id === action.platform);
          const Icon = platform?.icon || MessageSquare;
          const isExpanded = expandedId === action.id;

          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              {/* Arrow connector */}
              {index === 0 && (
                <div className="flex justify-center py-2 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Then</span>
                  </div>
                </div>
              )}

              {/* Header */}
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpand(action.id)}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={action.enabled}
                    onCheckedChange={(checked) => {
                      updateAction(action.id, { enabled: checked });
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className={`p-1.5 rounded-md bg-secondary ${platform?.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{platform?.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.platform === 'slack' && `#${action.channel || 'all_bhva'}`}
                      {action.platform === 'discord' && `#${action.channel || 'admin'}`}
                      {action.platform === 'email' && (action.emailTo || 'No recipient')}
                      {action.platform === 'text' && 'SMS Message'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAction(action.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded Config */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border"
                  >
                    <div className="p-4 space-y-3">
                      {/* Platform Selector */}
                      <div>
                        <label className="text-xs font-medium mb-1.5 block">Platform</label>
                        <Select 
                          value={action.platform}
                          onValueChange={(v) => {
                            const updates: Partial<FollowUpAction> = { 
                              platform: v as FollowUpAction['platform'] 
                            };
                            // Set defaults for new platform
                            if (v === 'slack') updates.channel = 'all_bhva';
                            if (v === 'discord') updates.channel = 'admin';
                            updateAction(action.id, updates);
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLATFORMS.map(p => {
                              const PIcon = p.icon;
                              return (
                                <SelectItem key={p.id} value={p.id}>
                                  <div className="flex items-center gap-2">
                                    <PIcon className={`w-4 h-4 ${p.color}`} />
                                    {p.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Platform-specific config */}
                      {action.platform === 'slack' && (
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">Channel</label>
                          <Select 
                            value={action.channel || 'all_bhva'}
                            onValueChange={(v) => updateAction(action.id, { channel: v })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SLACK_CHANNELS.map(c => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {action.platform === 'discord' && (
                        <div>
                          <label className="text-xs font-medium mb-1.5 block">Channel</label>
                          <Select 
                            value={action.channel || 'admin'}
                            onValueChange={(v) => updateAction(action.id, { channel: v })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DISCORD_CHANNELS.map(c => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {action.platform === 'email' && (
                        <>
                          <div>
                            <label className="text-xs font-medium mb-1.5 block">To</label>
                            <Input
                              type="email"
                              placeholder="recipient@example.com"
                              value={action.emailTo || ''}
                              onChange={(e) => updateAction(action.id, { emailTo: e.target.value })}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1.5 block">Subject</label>
                            <Input
                              placeholder="Research Results"
                              value={action.emailSubject || ''}
                              onChange={(e) => updateAction(action.id, { emailSubject: e.target.value })}
                              className="h-9"
                            />
                          </div>
                        </>
                      )}

                      {/* Message Template */}
                      <div>
                        <label className="text-xs font-medium mb-1.5 block">
                          Message Template
                        </label>
                        <Textarea
                          placeholder="Use {{result}} to include the output from the previous step"
                          value={action.message || ''}
                          onChange={(e) => updateAction(action.id, { message: e.target.value })}
                          rows={3}
                          className="text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Use <code className="bg-muted px-1 rounded">{'{{result}}'}</code> to include output from the main action
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
