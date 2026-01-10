import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentVoiceButton } from '@/components/AgentVoiceButton';
import { AppLayout } from '@/components/AppLayout';
import { useElevenLabsAgent } from '@/hooks/useElevenLabsAgent';
import { Message, Task } from '@/types/agent';
import { useToast } from '@/hooks/use-toast';
import {
  Clock,
  FileSpreadsheet,
  FileText,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const demoTask: Task = {
  id: '1',
  title: 'Lead won → send onboarding sequence',
  status: 'in_progress',
  createdAt: new Date(),
};

const demoTaskMeta = {
  whatsGettingDone:
    'Creating a scheduled action that triggers when a CRM lead is marked "Won", then sends onboarding.',
  demoSteps: [
    'Trigger: CRM lead status changes to Won',
    'Action: Send onboarding form (Google Sheet)',
    'Action: Send intro video + checklist (Notion doc)',
  ],
  technicalNotes: [
    'Google Sheet: Onboarding Form (shared link)',
    'Notion: "Customer Onboarding – Intro Video" document',
  ],
} as const;

function TasksPopoverContent() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Tasks</h3>
        <span className="text-xs text-muted-foreground">1 active</span>
      </div>

      <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0 animate-pulse" />
          <div className="min-w-0">
            <p className="text-sm text-foreground font-medium">{demoTask.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{demoTaskMeta.whatsGettingDone}</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Demo steps</p>
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
            {demoTaskMeta.demoSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Technical notes</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="w-4 h-4" />
              <span>{demoTaskMeta.technicalNotes[0]}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>{demoTaskMeta.technicalNotes[1]}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const { toast } = useToast();

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

  return (
    <AppLayout 
      showTasksButton 
      tasksContent={<TasksPopoverContent />}
      taskCount={1}
    >
      <div className="flex-1 flex flex-col relative h-full">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.08), transparent 50%)',
          }}
        />

        {/* Main content area */}
        <div className="flex-1 flex items-center justify-center">
          <motion.div 
            className="relative flex flex-col items-center justify-center gap-8"
            animate={{ 
              y: isActive ? -80 : 0 
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
          >
            {/* Logo tagline - hidden when active */}
            <AnimatePresence>
              {!isActive && (
                <motion.div 
                  className="text-center space-y-1 max-w-md px-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
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

            <AgentVoiceButton status={status} isActive={isActive} onToggle={toggle} />
          </motion.div>
        </div>

        {/* Bottom text input - ChatGPT style */}
        <div className="p-4 bg-background/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-center bg-secondary/50 rounded-full border border-border focus-within:border-primary/50 transition-colors px-4">
              <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Message..."
                className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button 
                size="icon" 
                variant="ghost"
                className={`shrink-0 h-9 w-9 rounded-full transition-all border-2 ${
                  textInput.trim() 
                    ? 'text-primary border-primary hover:bg-primary/10' 
                    : 'text-muted-foreground border-muted-foreground/30 hover:bg-muted'
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
