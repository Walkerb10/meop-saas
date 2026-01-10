import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentVoiceButton } from '@/components/AgentVoiceButton';
import { AppLayout } from '@/components/AppLayout';
import { useElevenLabsAgent } from '@/hooks/useElevenLabsAgent';
import { Message } from '@/types/agent';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Execution {
  id: string;
  sequence_name: string;
  status: string;
  started_at: string;
}

function TasksPopoverContent({ executions }: { executions: Execution[] }) {
  const runningTasks = executions.filter(e => e.status === 'running');
  
  if (runningTasks.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
          <Zap className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No active tasks</p>
        <p className="text-xs text-muted-foreground mt-1">
          Tasks appear here when automations are running
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Active Tasks</h3>
        <span className="text-xs text-muted-foreground">{runningTasks.length} running</span>
      </div>
      {runningTasks.map((task) => (
        <div key={task.id} className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-start gap-3">
            <Loader2 className="w-4 h-4 text-primary mt-0.5 animate-spin shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground font-medium truncate">{task.sequence_name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Started {format(new Date(task.started_at), 'h:mm a')}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const { toast } = useToast();

  // Fetch running executions for tasks
  useEffect(() => {
    const fetchExecutions = async () => {
      const { data } = await supabase
        .from('executions')
        .select('id, sequence_name, status, started_at')
        .eq('status', 'running')
        .order('started_at', { ascending: false });
      if (data) setExecutions(data);
    };
    fetchExecutions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('executions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'executions' }, () => {
        fetchExecutions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleTranscript = useCallback((text: string, role: 'user' | 'assistant') => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role,
        content: text,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleError = useCallback(
    (error: string) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error,
      });
    },
    [toast]
  );

  const { status, isActive, toggle } = useElevenLabsAgent({
    onTranscript: handleTranscript,
    onError: handleError,
  });

  const runningCount = executions.filter(e => e.status === 'running').length;

  return (
    <AppLayout 
      showTasksButton 
      tasksContent={<TasksPopoverContent executions={executions} />}
      taskCount={runningCount}
    >
      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.08), transparent 50%)',
          }}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top section - tagline fades, mic stays */}
          <div className="flex flex-col items-center pt-8">
            {/* Tagline - fades out when active */}
            <AnimatePresence>
              {!isActive && (
                <motion.div 
                  className="text-center space-y-1 max-w-md px-4 mb-8"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-xl md:text-2xl font-semibold text-foreground">
                    Speak your problem.
                  </p>
                  <p className="text-xl md:text-2xl font-semibold text-foreground">
                    Agents handle it.
                  </p>
                  <p className="text-xl md:text-2xl font-semibold text-foreground">
                    Start to finish.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Voice button - ONE button, doesn't move */}
            <AgentVoiceButton 
              status={status} 
              isActive={isActive} 
              onToggle={toggle} 
              size={isActive ? 'small' : 'normal'} 
            />
            
            {/* Start speaking hint */}
            <AnimatePresence>
              {isActive && messages.length === 0 && (
                <motion.p 
                  className="text-muted-foreground text-sm mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Start speaking...
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Messages area - appears below mic when active */}
          <AnimatePresence>
            {isActive && messages.length > 0 && (
              <motion.div 
                className="flex-1 overflow-y-auto px-4 py-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="max-w-2xl mx-auto space-y-4">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {format(msg.timestamp, 'h:mm a')}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom text input */}
        <div className="p-4 bg-background/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <div 
              className={`relative flex items-center bg-secondary/50 rounded-full border transition-all duration-300 px-4 ${
                inputFocused 
                  ? 'border-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]' 
                  : 'border-border'
              }`}
            >
              <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Enter message..."
                className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button 
                size="icon" 
                variant="ghost"
                className={`shrink-0 h-8 w-8 rounded-full transition-all ${
                  textInput.trim() 
                    ? 'text-primary hover:bg-primary/10' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
                disabled={!textInput.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
