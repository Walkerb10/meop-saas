import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Zap,
  MoreHorizontal, Trash2, Loader2
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { WorkflowBuilder } from '@/components/workflow/WorkflowBuilder';
import { MobileWorkflowBuilder } from '@/components/workflow/MobileWorkflowBuilder';
import { CreateAutomationWizard } from '@/components/CreateAutomationWizard';
import { StepPreview } from '@/components/AutomationSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useIsMobile } from '@/hooks/use-mobile';
import { Workflow, WorkflowNode, WorkflowConnection } from '@/types/workflow';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { coerceAutomationStepsToWorkflow } from '@/lib/automationWorkflow';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export default function AutomationsPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isCreatingWizard, setIsCreatingWizard] = useState(false);
  const [isCreatingCanvas, setIsCreatingCanvas] = useState(false);
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
  
  const isMobile = useIsMobile();

  // Fetch workflows from database
  const fetchWorkflows = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Workflow[] = (data || []).map((row) => {
        const { nodes, connections } = coerceAutomationStepsToWorkflow({
          steps: row.steps,
          triggerConfig: row.trigger_config,
          triggerType: row.trigger_type,
        });

        return {
          id: row.id,
          name: row.name,
          description: row.description || undefined,
          isActive: row.is_active,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          lastRunAt: row.last_run_at || undefined,
          nodes,
          connections,
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
      setIsCreatingCanvas(false);
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

    // Sort nodes by Y position
    const sortedNodes = [...selectedWorkflow.nodes].sort((a, b) => a.position.y - b.position.y);

    try {
      // Call the execute-automation edge function
      const { data, error } = await supabase.functions.invoke('execute-automation', {
        body: { automationId: selectedWorkflow.id },
      });

      if (error) {
        console.error('Execution error:', error);
        toast.error(`Execution failed: ${error.message}`);
        setExecutingId(null);
        return;
      }

      console.log('Execution result:', data);

      // Animate through nodes based on step results
      if (data?.stepResults) {
        for (const step of data.stepResults) {
          const node = sortedNodes.find(n => n.id === step.nodeId);
          if (node) {
            setExecutingNodeId(node.id);
            await new Promise(r => setTimeout(r, 300)); // Brief animation
            setCompletedNodeIds(prev => [...prev, node.id]);
          }
        }
      } else {
        // Fallback: animate all nodes
        for (const node of sortedNodes) {
          setExecutingNodeId(node.id);
          await new Promise(r => setTimeout(r, 300));
          setCompletedNodeIds(prev => [...prev, node.id]);
        }
      }

      setExecutingNodeId(null);
      setExecutingId(null);
      
      if (data?.success) {
        toast.success('Automation executed successfully!');
      } else {
        toast.error(data?.error || 'Execution completed with issues');
      }
      
      await fetchWorkflows();
    } catch (err) {
      console.error('Execution error:', err);
      toast.error('Failed to execute automation');
      setExecutingId(null);
      setExecutingNodeId(null);
    }
  }, [selectedWorkflow, fetchWorkflows]);

  const handleDeleteWorkflow = useCallback(async (idToDelete?: string) => {
    const targetId = idToDelete || deleteWorkflowId;
    if (!targetId) return;
    
    try {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', targetId);

      if (error) throw error;
      
      setDeleteWorkflowId(null);
      // If we're in the builder view of this workflow, go back
      if (selectedWorkflow?.id === targetId) {
        setSelectedWorkflow(null);
      }
      toast.success('Automation deleted');
      await fetchWorkflows();
    } catch (err) {
      console.error('Failed to delete workflow:', err);
      toast.error('Failed to delete automation');
    }
  }, [deleteWorkflowId, selectedWorkflow, fetchWorkflows]);

  // Check if workflow has repeatable schedule (daily, weekly, monthly)
  const isRepeatableSchedule = useCallback((workflow: Workflow) => {
    const triggerNode = workflow.nodes.find(n => n.type === 'trigger_schedule');
    if (!triggerNode?.config) return false;
    const freq = triggerNode.config.frequency as string;
    return freq === 'daily' || freq === 'weekly' || freq === 'monthly' || freq === 'hourly';
  }, []);

  const handleToggleActive = useCallback(async (id: string) => {
    const workflow = workflows.find(w => w.id === id);
    if (!workflow) return;
    
    // If trying to turn on, check if it has a repeatable schedule
    if (!workflow.isActive && !isRepeatableSchedule(workflow)) {
      toast.error('Add a repeating schedule (daily, weekly, monthly) to enable this automation');
      return;
    }
    
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
  }, [workflows, fetchWorkflows, isRepeatableSchedule]);
  // Handle wizard complete - create automation from wizard data
  const handleWizardComplete = useCallback(async (data: {
    name: string;
    actionType: 'text' | 'slack' | 'discord' | 'email' | 'research';
    config: Record<string, string>;
    frequency: 'manual' | 'once' | 'daily' | 'weekly' | 'monthly';
    frequencyConfig: Record<string, string | string[]>;
  }) => {
    try {
      // Map actionType to node type
      const nodeTypeMap: Record<string, string> = {
        text: 'action_text',
        slack: 'action_slack',
        discord: 'action_discord',
        email: 'action_email',
        research: 'action_research',
      };

      // Determine trigger type based on frequency
      const triggerTypeMap: Record<string, string> = {
        manual: 'trigger_manual',
        once: 'trigger_schedule',
        daily: 'trigger_schedule',
        weekly: 'trigger_schedule',
        monthly: 'trigger_schedule',
      };

      const triggerId = crypto.randomUUID();
      const actionId = crypto.randomUUID();

      // Build trigger config based on frequency
      const triggerConfig: Record<string, unknown> = {};
      if (data.frequency !== 'manual') {
        triggerConfig.frequency = data.frequency;
        triggerConfig.time = data.frequencyConfig.time;
        if (data.frequency === 'once') {
          triggerConfig.date = data.frequencyConfig.date;
        } else if (data.frequency === 'weekly') {
          triggerConfig.days = data.frequencyConfig.days;
        } else if (data.frequency === 'monthly') {
          triggerConfig.dayOfMonth = data.frequencyConfig.dayOfMonth;
        }
      }

      const triggerLabel = data.frequency === 'manual' 
        ? 'Manual Trigger' 
        : data.frequency === 'once'
          ? 'Run Once'
          : `${data.frequency.charAt(0).toUpperCase() + data.frequency.slice(1)} Schedule`;

      const nodes = [
        {
          id: triggerId,
          type: triggerTypeMap[data.frequency],
          label: triggerLabel,
          position: { x: 150, y: 100 },
          config: triggerConfig,
        },
        {
          id: actionId,
          type: nodeTypeMap[data.actionType],
          label: data.name,
          position: { x: 150, y: 250 },
          config: data.config,
        },
      ];

      const connections = [
        { id: crypto.randomUUID(), sourceId: triggerId, targetId: actionId },
      ];

      const stepsJson = { nodes, connections } as unknown as Json;

      // Set the database trigger_type based on frequency
      const dbTriggerType = data.frequency === 'manual' ? 'manual' : 'schedule';

      // Set is_active to false for manual or once frequencies (non-repeatable)
      const isRepeatable = data.frequency === 'daily' || data.frequency === 'weekly' || data.frequency === 'monthly';
      
      const { error } = await supabase
        .from('automations')
        .insert({
          name: data.name,
          is_active: isRepeatable,
          steps: stepsJson,
          trigger_type: dbTriggerType,
          trigger_config: triggerConfig as unknown as Json,
        });

      if (error) throw error;

      toast.success('Sequence created!');
      setIsCreatingWizard(false);
      await fetchWorkflows();
    } catch (err) {
      console.error('Failed to create sequence:', err);
      toast.error('Failed to create sequence');
    }
  }, [fetchWorkflows]);

  // Show wizard when creating new automation
  if (isCreatingWizard) {
    return (
      <AppLayout>
        <div className="h-[calc(100vh-3.5rem)]">
          <CreateAutomationWizard
            onComplete={handleWizardComplete}
            onCancel={() => setIsCreatingWizard(false)}
          />
        </div>
      </AppLayout>
    );
  }

  // Show builder when editing or creating via canvas
  if (selectedWorkflow || isCreatingCanvas) {
    const BuilderComponent = isMobile ? MobileWorkflowBuilder : WorkflowBuilder;
    
    return (
      <AppLayout>
        <div className="h-[calc(100vh-3.5rem)]">
          <BuilderComponent
            workflow={selectedWorkflow || undefined}
            onSave={handleSaveWorkflow}
            onExecute={selectedWorkflow ? handleExecuteWorkflow : undefined}
            onBack={() => {
              setSelectedWorkflow(null);
              setIsCreatingCanvas(false);
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
      <AppLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto min-h-full pb-32">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 md:w-6 md:h-6" />
              Automations
            </h1>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/executions')} 
              className="text-muted-foreground hover:text-foreground"
            >
              Executions
            </Button>
          </div>
          
          <Button onClick={() => setIsCreatingWizard(true)} size="icon">
            <Plus className="w-4 h-4" />
          </Button>
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
                    'cursor-pointer transition-all hover:shadow-md hover:border-primary/30 group',
                    !workflow.isActive && 'opacity-60'
                  )}
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-3 md:gap-4">
                      {/* Step preview icons - filter out triggers, show only action icons */}
                      <div className="shrink-0">
                        <StepPreview 
                          nodes={workflow.nodes.filter(n => !n.type.startsWith('trigger_'))} 
                          maxSteps={3} 
                        />
                      </div>

                      {/* Name and schedule info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm md:text-base text-foreground truncate">
                          {workflow.name}
                        </h3>
                        {/* Show schedule info if active and scheduled */}
                        {workflow.isActive && (() => {
                          const triggerNode = workflow.nodes.find(n => n.type === 'trigger_schedule');
                          if (triggerNode?.config) {
                            const config = triggerNode.config;
                            const freq = config.frequency as string;
                            const time = config.time as string || '9:00 AM';
                            // Format time for display (convert 24h to 12h)
                            const formatTime = (t: string) => {
                              const [hours, minutes] = t.split(':');
                              const h = parseInt(hours);
                              const ampm = h >= 12 ? 'PM' : 'AM';
                              const h12 = h % 12 || 12;
                              return `${h12}:${minutes} ${ampm}`;
                            };
                            const displayTime = formatTime(time);
                            
                            let scheduleText = '';
                            if (freq === 'daily') scheduleText = `Runs daily at ${displayTime}`;
                            else if (freq === 'weekly') scheduleText = `Runs weekly at ${displayTime}`;
                            else if (freq === 'monthly') scheduleText = `Runs monthly at ${displayTime}`;
                            else if (freq === 'hourly') scheduleText = 'Runs hourly';
                            
                            if (scheduleText) {
                              return (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {scheduleText}
                                </p>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>

                      {/* On/Off toggle and menu */}
                      <div className="flex items-center gap-2">
                        {(() => {
                          const canToggle = isRepeatableSchedule(workflow) || workflow.isActive;
                          return (
                            <Switch
                              checked={workflow.isActive}
                              disabled={!canToggle && !workflow.isActive}
                              onCheckedChange={() => {}}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleActive(workflow.id);
                              }}
                            />
                          );
                        })()}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            
            {/* Create Automation button at the bottom of the list */}
            {workflows.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: workflows.length * 0.05 }}
                className="pt-4"
              >
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => setIsCreatingWizard(true)}
                >
                  <Plus className="w-4 h-4" />
                  Create Automation
                </Button>
              </motion.div>
            )}
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
              <Button onClick={() => setIsCreatingWizard(true)} className="gap-2">
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
            <AlertDialogAction onClick={() => handleDeleteWorkflow()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
