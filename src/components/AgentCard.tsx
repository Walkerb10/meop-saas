import { motion } from 'framer-motion';
import { 
  Bot, Settings, Play, Pause, Trash2, MoreVertical,
  MessageSquare, Zap, Clock, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Agent, AGENT_TEMPLATES } from '@/hooks/useAgents';
import { formatDistanceToNow } from 'date-fns';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onSelect: (agent: Agent) => void;
}

export function AgentCard({ agent, onEdit, onDelete, onToggleStatus, onSelect }: AgentCardProps) {
  const template = AGENT_TEMPLATES[agent.template];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={`cursor-pointer transition-all hover:border-primary/50 ${
          agent.status === 'inactive' ? 'opacity-60' : ''
        }`}
        onClick={() => onSelect(agent)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                {template?.icon || '🤖'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{agent.name}</h3>
                  <Badge 
                    variant={agent.status === 'active' ? 'default' : 'secondary'}
                    className={agent.status === 'active' ? 'bg-green-500/20 text-green-500 border-green-500/30' : ''}
                  >
                    {agent.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <Switch 
                checked={agent.status === 'active'}
                onCheckedChange={() => onToggleStatus(agent.id)}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(agent)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(agent.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-xs">Chats</span>
              </div>
              <p className="text-lg font-semibold">{agent.stats.totalConversations}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-xs">Runs</span>
              </div>
              <p className="text-lg font-semibold">{agent.stats.totalExecutions}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">Active</span>
              </div>
              <p className="text-xs font-medium">
                {agent.stats.lastActive 
                  ? formatDistanceToNow(new Date(agent.stats.lastActive), { addSuffix: true })
                  : 'Never'
                }
              </p>
            </div>
          </div>

          {/* Tools & Config */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {agent.config.tools?.slice(0, 3).map(tool => (
                <Badge key={tool} variant="outline" className="text-xs">
                  {tool}
                </Badge>
              ))}
              {(agent.config.tools?.length || 0) > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{(agent.config.tools?.length || 0) - 3}
                </Badge>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
