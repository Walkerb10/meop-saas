import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Play, ChevronRight, Zap,
  MoreHorizontal, Trash2, Power, PowerOff, Loader2
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { WorkflowBuilder } from '@/components/workflow/WorkflowBuilder';
import { MobileWorkflowBuilder } from '@/components/workflow/MobileWorkflowBuilder';
import { QuickAutomationForm } from '@/components/QuickAutomationForm';
import { Button } from '@/components/ui/button';
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
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

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
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { tasks } = useTasks();
  const isMobile = useIsMobile();
  const processingCount = tasks.filter(t => t.status === 'processing').length;

  // Fetch workflows from database
  const fetchWorkflows = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Workflow[] = (data || []).map((row) => {
        // Parse steps as workflow data
        const stepsData = row.steps as { nodes?: WorkflowNode[]; connections?: WorkflowConnection[] } | null;
        return {
          id: row.id,
          name: row.name,
          description: row.description || undefined,
          isActive: row.is_active,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          lastRunAt: row.last_run_at || undefined,
          nodes: stepsData?.nodes || [],
          connections: stepsData?.connections || [],
        };
      });

      setWorkflows(mapped);
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
      toast.error('Failed to load automations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and subscribe to changes
  useEffect(() => {
    fetchWorkflows();

    const channel = supabase
      .channel('automations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'automations' }, () => {
        fetchWorkflows();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchWorkflows]);

  const handleSaveWorkflow = useCallback(async (workflowData: Partial<Workflow>) => {
    try {
      const stepsJson = {
        nodes: workflowData.nodes || [],
        connections: workflowData.connections || [],
      } as unknown as Json;

      if (selectedWorkflow) {
        // Update existing
        const { error } = await supabase
          .from('automations')
          .update({
            name: workflowData.name || selectedWorkflow.name,
            description: workflowData.description || null,
            is_active: workflowData.isActive ?? selectedWorkflow.isActive,
            steps: stepsJson,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedWorkflow.id);

        if (error) throw error;
        toast.success('Automation saved');
      } else {
        // Create new
        const { data, error } = await supabase
          .from('automations')
          .insert({
            name: workflowData.name || 'New Automation',
            description: workflowData.description || null,
            is_active: workflowData.isActive ?? true,
            steps: stepsJson,
            trigger_type: 'manual',
          })
          .select()
          .single();

        if (error) throw error;
        
        // Select the newly created workflow
        if (data) {
          const stepsData = data.steps as { nodes?: WorkflowNode[]; connections?: WorkflowConnection[] } | null;
          setSelectedWorkflow({
            id: data.id,
            name: data.name,
            description: data.description || undefined,
            isActive: data.is_active,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            nodes: stepsData?.nodes || [],
            connections: stepsData?.connections || [],
          });
        }
        toast.success('Automation created');
      }
      setIsCreating(false);
      await fetchWorkflows();
    } catch (err) {
      console.error('Failed to save workflow:', err);
      toast.error('Failed to save automation');
    }
  }, [selectedWorkflow, fetchWorkflows]);

  const handleExecuteWorkflow = useCallback(async () => {
    if (!selectedWorkflow) return;
    
    setExecutingId(selectedWorkflow.id);
    setCompletedNodeIds([]);

    // Simulate execution by stepping through nodes
    const sortedNodes = [...selectedWorkflow.nodes].sort((a, b) => a.position.y - b.position.y);
    
    for (const node of sortedNodes) {
      setExecutingNodeId(node.id);
      await new Promise(r => setTimeout(r, 1500));
      setCompletedNodeIds(prev => [...prev, node.id]);
    }

    setExecutingNodeId(null);
    setExecutingId(null);
    
    // Update last run in database
    await supabase
      .from('automations')
      .update({ last_run_at: new Date().toISOString() })
      .eq('id', selectedWorkflow.id);
    
    toast.success('Workflow completed successfully');
    await fetchWorkflows();
  }, [selectedWorkflow, fetchWorkflows]);

  const handleDeleteWorkflow = useCallback(async () => {
    if (!deleteWorkflowId) return;
    
    try {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', deleteWorkflowId);

      if (error) throw error;
      
      setDeleteWorkflowId(null);
      toast.success('Automation deleted');
      await fetchWorkflows();
    } catch (err) {
      console.error('Failed to delete workflow:', err);
      toast.error('Failed to delete automation');
    }
  }, [deleteWorkflowId, fetchWorkflows]);

  const handleToggleActive = useCallback(async (id: string) => {
    const workflow = workflows.find(w => w.id === id);
    if (!workflow) return;
    
    try {
      const { error } = await supabase
        .from('automations')
        .update({ is_active: !workflow.isActive })
        .eq('id', id);

      if (error) throw error;
      await fetchWorkflows();
    } catch (err) {
      console.error('Failed to toggle workflow:', err);
    }
  }, [workflows, fetchWorkflows]);

  // Handle quick automation generation from natural language
  const handleQuickGenerate = useCallback(async (description: string) => {
    setIsGenerating(true);
    
    const lowerDesc = description.toLowerCase();
    
    // Create nodes based on description
    const nodes: WorkflowNode[] = [];
    const connections: WorkflowConnection[] = [];
    
    // Determine trigger type
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
    
    // Extract research query
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
    
    // Save to database
    try {
      const stepsJson = { nodes, connections } as unknown as Json;
      const { data, error } = await supabase
        .from('automations')
        .insert({
          name: workflowName,
          description: description,
          is_active: true,
          steps: stepsJson,
          trigger_type: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const stepsData = data.steps as { nodes?: WorkflowNode[]; connections?: WorkflowConnection[] } | null;
        setSelectedWorkflow({
          id: data.id,
          name: data.name,
          description: data.description || undefined,
          isActive: data.is_active,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          nodes: stepsData?.nodes || [],
          connections: stepsData?.connections || [],
        });
      }
      
      toast.success('Automation created! Review and save.');
      await fetchWorkflows();
    } catch (err) {
      console.error('Failed to create automation:', err);
      toast.error('Failed to create automation');
    } finally {
      setIsGenerating(false);
    }
  }, [fetchWorkflows]);

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
      <div className="p-4 md:p-6 max-w-6xl mx-auto min-h-full pb-32">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Automations</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Build workflows that automate your tasks
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <QuickAutomationForm 
              onGenerate={handleQuickGenerate}
              isGenerating={isGenerating}
            />
            <Button onClick={() => setIsCreating(true)} className="gap-2 flex-1 sm:flex-initial">
              <Plus className="w-4 h-4" />
              <span>New Automation</span>
            </Button>
          </div>
        </div>

        {/* Workflow list */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <AnimatePresence>
            {workflows.map((workflow, index) => (
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
          )}

          {!loading && workflows.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                No automations yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first automation
              </p>
              <Button onClick={() => setIsCreating(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Automation
              </Button>
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
