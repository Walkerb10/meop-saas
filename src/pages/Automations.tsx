import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Play, Clock, Zap, ChevronRight, 
  MoreHorizontal, Trash2, Power, PowerOff, Loader2, Filter
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { WorkflowBuilder } from '@/components/workflow/WorkflowBuilder';
import { MobileWorkflowBuilder } from '@/components/workflow/MobileWorkflowBuilder';
import { QuickAutomationForm } from '@/components/QuickAutomationForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTasks } from '@/hooks/useTasks';
import { useIsMobile } from '@/hooks/use-mobile';
import { Workflow, WorkflowNode, WorkflowConnection, WorkflowNodeType } from '@/types/workflow';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Demo workflows for showcase
const DEMO_WORKFLOWS: Workflow[] = [
  {
    id: 'demo-1',
    name: 'Daily Market Research',
    description: 'Research market trends every morning and send to Slack',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastRunAt: new Date(Date.now() - 3600000).toISOString(),
    nodes: [
      { id: 'n1', type: 'trigger_schedule', label: 'Daily at 9 AM', position: { x: 100, y: 100 }, config: { frequency: 'daily', time: '09:00' } },
      { id: 'n2', type: 'action_research', label: 'Market Research', position: { x: 100, y: 250 }, config: { query: 'Latest market trends in AI', outputFormat: 'problem', outputLength: '500' } },
      { id: 'n3', type: 'action_slack', label: 'Post to Slack', position: { x: 100, y: 400 }, config: { channel: 'market-updates', message: '{{result}}' } },
    ],
    connections: [
      { id: 'c1', sourceId: 'n1', targetId: 'n2' },
      { id: 'c2', sourceId: 'n2', targetId: 'n3' },
    ],
  },
  {
    id: 'demo-2',
    name: 'Competitor Analysis',
    description: 'Weekly competitor analysis sent via email',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      { id: 'n1', type: 'trigger_schedule', label: 'Weekly Monday', position: { x: 100, y: 100 }, config: { frequency: 'weekly', dayOfWeek: 'Monday', time: '08:00' } },
      { id: 'n2', type: 'action_research', label: 'Competitor Research', position: { x: 100, y: 250 }, config: { query: 'Competitor analysis for tech startups', outputFormat: 'detailed' } },
      { id: 'n3', type: 'action_email', label: 'Send Report', position: { x: 100, y: 400 }, config: { to: 'team@company.com', subject: 'Weekly Competitor Report', message: '{{result}}' } },
    ],
    connections: [
      { id: 'c1', sourceId: 'n1', targetId: 'n2' },
      { id: 'c2', sourceId: 'n2', targetId: 'n3' },
    ],
  },
];

function TasksPopoverContent() {
  const { tasks, loading } = useTasks();
  const processingTasks = tasks.filter(t => t.status === 'processing');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (processingTasks.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">No running workflows</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {processingTasks.map(task => (
        <div key={task.id} className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            <p className="text-sm font-medium">{task.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AutomationsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(DEMO_WORKFLOWS);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { tasks } = useTasks();
  const isMobile = useIsMobile();
  const processingCount = tasks.filter(t => t.status === 'processing').length;

  const filteredWorkflows = workflows.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveWorkflow = useCallback(async (workflowData: Partial<Workflow>) => {
    if (selectedWorkflow) {
      // Update existing
      setWorkflows(prev => prev.map(w => 
        w.id === selectedWorkflow.id 
          ? { ...w, ...workflowData, updatedAt: new Date().toISOString() } as Workflow
          : w
      ));
      toast.success('Workflow saved');
    } else {
      // Create new
      const newWorkflow: Workflow = {
        id: crypto.randomUUID(),
        name: workflowData.name || 'New Workflow',
        description: workflowData.description,
        nodes: workflowData.nodes || [],
        connections: workflowData.connections || [],
        isActive: workflowData.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setWorkflows(prev => [...prev, newWorkflow]);
      setSelectedWorkflow(newWorkflow);
      toast.success('Workflow created');
    }
    setIsCreating(false);
  }, [selectedWorkflow]);

  const handleExecuteWorkflow = useCallback(async () => {
    if (!selectedWorkflow) return;
    
    setExecutingId(selectedWorkflow.id);
    setCompletedNodeIds([]);

    // Simulate execution by stepping through nodes
    const sortedNodes = [...selectedWorkflow.nodes].sort((a, b) => a.position.y - b.position.y);
    
    for (const node of sortedNodes) {
      setExecutingNodeId(node.id);
      await new Promise(r => setTimeout(r, 1500)); // Simulate execution time
      setCompletedNodeIds(prev => [...prev, node.id]);
    }

    setExecutingNodeId(null);
    setExecutingId(null);
    
    // Update last run
    setWorkflows(prev => prev.map(w => 
      w.id === selectedWorkflow.id 
        ? { ...w, lastRunAt: new Date().toISOString() }
        : w
    ));
    
    toast.success('Workflow completed successfully');
  }, [selectedWorkflow]);

  const handleDeleteWorkflow = useCallback(() => {
    if (!deleteWorkflowId) return;
    setWorkflows(prev => prev.filter(w => w.id !== deleteWorkflowId));
    setDeleteWorkflowId(null);
    toast.success('Workflow deleted');
  }, [deleteWorkflowId]);

  const handleToggleActive = useCallback((id: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === id ? { ...w, isActive: !w.isActive } : w
    ));
  }, []);

  // Handle quick automation generation from natural language
  const handleQuickGenerate = useCallback(async (description: string) => {
    setIsGenerating(true);
    
    // Parse the description to extract components
    const lowerDesc = description.toLowerCase();
    
    // Simulate AI processing
    await new Promise(r => setTimeout(r, 1500));
    
    // Create nodes based on description
    const nodes: WorkflowNode[] = [];
    const connections: WorkflowConnection[] = [];
    
    // Determine trigger type from description
    const triggerId = crypto.randomUUID();
    let triggerConfig: Record<string, string> = { frequency: 'daily', time: '09:00' };
    let triggerLabel = 'Daily at 9 AM';
    
    if (lowerDesc.includes('morning')) {
      triggerConfig = { frequency: 'daily', time: '09:00' };
      triggerLabel = 'Every Morning';
    } else if (lowerDesc.includes('evening') || lowerDesc.includes('night')) {
      triggerConfig = { frequency: 'daily', time: '18:00' };
      triggerLabel = 'Every Evening';
    } else if (lowerDesc.includes('weekly') || lowerDesc.includes('week')) {
      triggerConfig = { frequency: 'weekly', dayOfWeek: 'Monday', time: '09:00' };
      triggerLabel = 'Weekly on Monday';
    } else if (lowerDesc.includes('hourly') || lowerDesc.includes('hour')) {
      triggerConfig = { frequency: 'hourly' };
      triggerLabel = 'Every Hour';
    }
    
    nodes.push({
      id: triggerId,
      type: 'trigger_schedule',
      label: triggerLabel,
      position: { x: 150, y: 100 },
      config: triggerConfig,
    });
    
    // Extract research query - everything between "research" and delivery method
    let researchQuery = description;
    const researchMatch = description.match(/research\s+(.+?)(?:\s+(?:and\s+)?(?:send|post|deliver|email|text|slack|discord)|$)/i);
    if (researchMatch) {
      researchQuery = researchMatch[1].trim();
    }
    
    // Add research action node
    const actionId = crypto.randomUUID();
    nodes.push({
      id: actionId,
      type: 'action_research',
      label: 'Research',
      position: { x: 150, y: 250 },
      config: { query: researchQuery, outputFormat: 'detailed', outputLength: '500' },
    });
    connections.push({ id: crypto.randomUUID(), sourceId: triggerId, targetId: actionId });
    
    // Determine output destination
    const outputId = crypto.randomUUID();
    let outputType: WorkflowNodeType = 'action_slack';
    let outputLabel = 'Send to Slack';
    let outputConfig: Record<string, string> = { channel: 'general', message: '{{result}}' };
    
    if (lowerDesc.includes('email')) {
      outputType = 'action_email';
      outputLabel = 'Send Email';
      outputConfig = { to: 'team@company.com', subject: 'Research Results', message: '{{result}}' };
    } else if (lowerDesc.includes('text') || lowerDesc.includes('sms')) {
      outputType = 'action_text';
      outputLabel = 'Send Text';
      outputConfig = { to: '+1234567890', message: '{{result}}' };
    } else if (lowerDesc.includes('discord')) {
      outputType = 'action_discord';
      outputLabel = 'Send to Discord';
      outputConfig = { channel: 'general', message: '{{result}}' };
    } else if (lowerDesc.includes('slack')) {
      // Extract channel name if specified
      const channelMatch = lowerDesc.match(/#(\w+)/);
      if (channelMatch) {
        outputConfig.channel = channelMatch[1];
        outputLabel = `Send to #${channelMatch[1]}`;
      }
    }
    
    nodes.push({
      id: outputId,
      type: outputType,
      label: outputLabel,
      position: { x: 150, y: 400 },
      config: outputConfig,
    });
    connections.push({ id: crypto.randomUUID(), sourceId: actionId, targetId: outputId });
    
    // Generate a meaningful name
    const workflowName = researchQuery.length > 40 
      ? researchQuery.slice(0, 40) + '...' 
      : researchQuery;
    
    // Create the workflow
    const newWorkflow: Workflow = {
      id: crypto.randomUUID(),
      name: workflowName,
      description: description,
      nodes,
      connections,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setWorkflows(prev => [...prev, newWorkflow]);
    setSelectedWorkflow(newWorkflow);
    setIsGenerating(false);
    toast.success('Automation created! Review and save.');
  }, []);

  // Show builder when editing or creating
  if (selectedWorkflow || isCreating) {
    const BuilderComponent = isMobile ? MobileWorkflowBuilder : WorkflowBuilder;
    
    return (
      <AppLayout 
        showTasksButton 
        tasksContent={<TasksPopoverContent />}
        taskCount={processingCount}
      >
        <div className="h-[calc(100vh-3.5rem)]">
          <BuilderComponent
            workflow={selectedWorkflow || undefined}
            onSave={handleSaveWorkflow}
            onExecute={selectedWorkflow ? handleExecuteWorkflow : undefined}
            onBack={() => {
              setSelectedWorkflow(null);
              setIsCreating(false);
              setCompletedNodeIds([]);
            }}
            isExecuting={executingId === selectedWorkflow?.id}
            executingNodeId={executingNodeId}
            completedNodeIds={completedNodeIds}
          />
        </div>
      </AppLayout>
    );
  }

  // Show workflow list
  return (
    <AppLayout 
      showTasksButton 
      tasksContent={<TasksPopoverContent />}
      taskCount={processingCount}
    >
      <div className="p-4 md:p-6 max-w-6xl mx-auto pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Automations</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Build workflows that automate your tasks
            </p>
          </div>
          <Button onClick={() => setIsCreating(true)} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            <span>New Workflow</span>
          </Button>
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-2 md:gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats - responsive grid */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
          <Card>
            <CardContent className="p-2 md:p-4">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 text-center md:text-left">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg md:text-2xl font-bold">{workflows.length}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 md:p-4">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 text-center md:text-left">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Power className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-lg md:text-2xl font-bold">{workflows.filter(w => w.isActive).length}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 md:p-4">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 text-center md:text-left">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-lg md:text-2xl font-bold">
                    {workflows.filter(w => w.lastRunAt).length}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">Ran</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Create Form */}
        <div className="mb-6">
          <QuickAutomationForm 
            onGenerate={handleQuickGenerate}
            isGenerating={isGenerating}
          />
        </div>

        {/* Workflow list */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredWorkflows.map((workflow, index) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md hover:border-primary/30',
                    !workflow.isActive && 'opacity-60'
                  )}
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-3 md:gap-4">
                      {/* Icon */}
                      <div className={cn(
                        'p-2 md:p-3 rounded-lg md:rounded-xl shrink-0',
                        workflow.isActive ? 'bg-primary/10' : 'bg-muted'
                      )}>
                        <Zap className={cn(
                          'w-4 h-4 md:w-5 md:h-5',
                          workflow.isActive ? 'text-primary' : 'text-muted-foreground'
                        )} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm md:text-base text-foreground truncate max-w-[150px] md:max-w-none">
                            {workflow.name}
                          </h3>
                          <Badge variant={workflow.isActive ? 'default' : 'secondary'} className="text-[10px] md:text-xs">
                            {workflow.isActive ? 'Active' : 'Off'}
                          </Badge>
                        </div>
                        {workflow.description && (
                          <p className="text-xs md:text-sm text-muted-foreground truncate mt-0.5 hidden sm:block">
                            {workflow.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 md:gap-4 mt-1 md:mt-2 text-[10px] md:text-xs text-muted-foreground">
                          <span>{workflow.nodes.length} steps</span>
                          {workflow.lastRunAt && (
                            <span className="hidden sm:inline">
                              {formatDistanceToNow(new Date(workflow.lastRunAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWorkflow(workflow);
                            handleExecuteWorkflow();
                          }}
                          disabled={!workflow.isActive || executingId === workflow.id}
                        >
                          {executingId === workflow.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(workflow.id);
                            }}>
                              {workflow.isActive ? (
                                <>
                                  <PowerOff className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Power className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteWorkflowId(workflow.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredWorkflows.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                {searchQuery ? 'No workflows found' : 'No workflows yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Create your first automation workflow'
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreating(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Workflow
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteWorkflowId} onOpenChange={() => setDeleteWorkflowId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The workflow and all its configuration will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWorkflow} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
