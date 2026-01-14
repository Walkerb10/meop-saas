import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Save, Loader2, ArrowLeft, MoreHorizontal, 
  Trash2, Copy, X, Settings
} from 'lucide-react';
import { WorkflowCanvas } from './WorkflowCanvas';
import { NodeConfigPanel } from './NodeConfigPanel';
import { WorkflowNode, WorkflowConnection, WorkflowNodeType, Workflow } from '@/types/workflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface WorkflowBuilderProps {
  workflow?: Partial<Workflow>;
  onSave: (workflow: Partial<Workflow>) => Promise<void>;
  onExecute?: () => Promise<void>;
  onBack: () => void;
  isExecuting?: boolean;
  executingNodeId?: string | null;
  completedNodeIds?: string[];
}

export function WorkflowBuilder({
  workflow,
  onSave,
  onExecute,
  onBack,
  isExecuting = false,
  executingNodeId,
  completedNodeIds = [],
}: WorkflowBuilderProps) {
  const [name, setName] = useState(workflow?.name || 'Untitled Workflow');
  const [description, setDescription] = useState(workflow?.description || '');
  const [isActive, setIsActive] = useState(workflow?.isActive ?? true);
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow?.nodes || []);
  const [connections, setConnections] = useState<WorkflowConnection[]>(workflow?.connections || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  // Add a new node
  const handleAddNode = useCallback((type: WorkflowNodeType, position: { x: number; y: number }) => {
    const newNode: WorkflowNode = {
      id: crypto.randomUUID(),
      type,
      label: getDefaultLabel(type),
      position,
      config: getDefaultConfig(type),
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setShowConfigPanel(true);
  }, []);

  // Insert a new node after a specific node
  const handleInsertNode = useCallback((type: WorkflowNodeType, afterNodeId: string) => {
    const afterNode = nodes.find(n => n.id === afterNodeId);
    if (!afterNode) return;

    // Find the node currently connected to afterNode
    const existingConnection = connections.find(c => c.sourceId === afterNodeId);
    const nextNodeId = existingConnection?.targetId;

    // Create new node positioned between afterNode and the next node
    const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
    const afterIndex = sortedNodes.findIndex(n => n.id === afterNodeId);
    
    // Shift all nodes below the insertion point down
    const updatedNodes = nodes.map(n => {
      if (n.position.y > afterNode.position.y) {
        return { ...n, position: { ...n.position, y: n.position.y + 160 } };
      }
      return n;
    });

    const newNode: WorkflowNode = {
      id: crypto.randomUUID(),
      type,
      label: getDefaultLabel(type),
      position: { 
        x: afterNode.position.x, 
        y: afterNode.position.y + 160 
      },
      config: getDefaultConfig(type),
    };

    // Update connections
    let updatedConnections = connections.filter(c => c.id !== existingConnection?.id);
    
    // Connect afterNode to new node
    updatedConnections.push({
      id: crypto.randomUUID(),
      sourceId: afterNodeId,
      targetId: newNode.id,
    });

    // Connect new node to the next node (if there was one)
    if (nextNodeId) {
      updatedConnections.push({
        id: crypto.randomUUID(),
        sourceId: newNode.id,
        targetId: nextNodeId,
      });
    }

    setNodes([...updatedNodes, newNode]);
    setConnections(updatedConnections);
    setSelectedNodeId(newNode.id);
    setShowConfigPanel(true);
  }, [nodes, connections]);

  // Update a node
  const handleUpdateNode = useCallback((id: string, updates: Partial<WorkflowNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  // Delete a node
  const handleDeleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.sourceId !== id && c.targetId !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
      setShowConfigPanel(false);
    }
  }, [selectedNodeId]);

  // Connect two nodes
  const handleConnect = useCallback((sourceId: string, targetId: string) => {
    const exists = connections.some(c => c.sourceId === sourceId && c.targetId === targetId);
    if (exists) return;

    const newConnection: WorkflowConnection = {
      id: crypto.randomUUID(),
      sourceId,
      targetId,
    };
    setConnections(prev => [...prev, newConnection]);
  }, [connections]);

  // Save workflow
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...workflow,
        name,
        description,
        isActive,
        nodes,
        connections,
      });
    } finally {
      setIsSaving(false);
    }
  }, [workflow, name, description, isActive, nodes, connections, onSave]);

  // Handle node selection
  const handleSelectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
    if (id) {
      setShowConfigPanel(true);
    }
  }, []);

  // Duplicate workflow
  const handleDuplicate = useCallback(() => {
    setName(`${name} (Copy)`);
  }, [name]);

  return (
    <div className="h-full flex flex-col bg-background relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-lg font-semibold border-none bg-transparent p-0 focus-visible:ring-0"
              placeholder="Workflow name"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="scale-75"
            />
            <span className="text-sm text-muted-foreground">
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Save button */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </Button>

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Workflow
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main canvas - full width */}
      <div className="flex-1 relative overflow-hidden">
        <WorkflowCanvas
          nodes={nodes}
          connections={connections}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onConnect={handleConnect}
          onAddNode={handleAddNode}
          onInsertNode={handleInsertNode}
          onExecute={onExecute}
          isExecuting={isExecuting}
          executingNodeId={executingNodeId}
          completedNodeIds={completedNodeIds}
          zoom={zoom}
          onZoomChange={setZoom}
        />

        {/* Floating config panel */}
        <AnimatePresence>
          {showConfigPanel && selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-4 right-4 w-80 max-h-[calc(100%-2rem)] bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Configure Node</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setShowConfigPanel(false);
                    setSelectedNodeId(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="overflow-y-auto max-h-[400px]">
                <NodeConfigPanel
                  node={selectedNode}
                  onUpdate={(updates) => {
                    if (selectedNodeId) {
                      handleUpdateNode(selectedNodeId, updates);
                    }
                  }}
                  onClose={() => {
                    setShowConfigPanel(false);
                    setSelectedNodeId(null);
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Helper functions
function getDefaultLabel(type: WorkflowNodeType): string {
  const labels: Record<WorkflowNodeType, string> = {
    trigger_schedule: 'Schedule Trigger',
    trigger_webhook: 'Webhook Trigger',
    trigger_voice: 'Voice Trigger',
    trigger_manual: 'Manual Trigger',
    action_research: 'Research',
    action_text: 'Send Text',
    action_email: 'Send Email',
    action_slack: 'Slack Message',
    action_discord: 'Discord Message',
    action_delay: 'Delay',
    condition: 'Condition',
    transform: 'Transform',
  };
  return labels[type];
}

function getDefaultConfig(type: WorkflowNodeType): WorkflowNode['config'] {
  switch (type) {
    case 'trigger_schedule':
      return { frequency: 'daily', time: '09:00' };
    case 'action_research':
      return { outputFormat: 'problem', outputLength: '500' };
    case 'action_delay':
      return { delayMinutes: 5 };
    default:
      return {};
  }
}
