import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Save, Loader2, ArrowLeft, MoreHorizontal, 
  Power, PowerOff, Trash2, Copy
} from 'lucide-react';
import { WorkflowCanvas } from './WorkflowCanvas';
import { NodeLibrary } from './NodeLibrary';
import { NodeConfigPanel } from './NodeConfigPanel';
import { WorkflowNode, WorkflowConnection, WorkflowNodeType, Workflow } from '@/types/workflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
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
  const [draggingType, setDraggingType] = useState<WorkflowNodeType | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);

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
  }, []);

  // Handle drop on canvas
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType') as WorkflowNodeType;
    if (!type || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    handleAddNode(type, { x: Math.round(x / 20) * 20, y: Math.round(y / 20) * 20 });
    setDraggingType(null);
  }, [handleAddNode, zoom]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

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
    }
  }, [selectedNodeId]);

  // Connect two nodes
  const handleConnect = useCallback((sourceId: string, targetId: string) => {
    // Prevent duplicate connections
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

  // Duplicate workflow
  const handleDuplicate = useCallback(() => {
    setName(`${name} (Copy)`);
    // Clear IDs so it saves as new
  }, [name]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
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

          {/* Run button */}
          {onExecute && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExecute}
              disabled={isExecuting || nodes.length === 0}
              className="gap-2"
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isExecuting ? 'Running...' : 'Run'}
            </Button>
          )}

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

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left panel - Node library */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full border-r border-border bg-card">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Nodes</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag nodes to the canvas
                </p>
              </div>
              <NodeLibrary onDragStart={setDraggingType} />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Center - Canvas */}
          <ResizablePanel defaultSize={55}>
            <div 
              ref={canvasRef}
              className="h-full"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <WorkflowCanvas
                nodes={nodes}
                connections={connections}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                onUpdateNode={handleUpdateNode}
                onDeleteNode={handleDeleteNode}
                onConnect={handleConnect}
                onAddNode={handleAddNode}
                executingNodeId={executingNodeId}
                completedNodeIds={completedNodeIds}
                zoom={zoom}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right panel - Node config */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <div className="h-full border-l border-border bg-card">
              <NodeConfigPanel
                node={selectedNode}
                onUpdate={(updates) => {
                  if (selectedNodeId) {
                    handleUpdateNode(selectedNodeId, updates);
                  }
                }}
                onClose={() => setSelectedNodeId(null)}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-20 right-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setZoom(z => Math.max(0.25, z - 0.1))}
        >
          -
        </Button>
        <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setZoom(z => Math.min(2, z + 0.1))}
        >
          +
        </Button>
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
