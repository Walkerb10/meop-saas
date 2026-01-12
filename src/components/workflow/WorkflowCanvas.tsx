import { useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkflowNode, WorkflowConnection, WorkflowNodeType } from '@/types/workflow';
import { WorkflowNodeComponent } from './WorkflowNode';
import { cn } from '@/lib/utils';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onUpdateNode: (id: string, updates: Partial<WorkflowNode>) => void;
  onDeleteNode: (id: string) => void;
  onConnect: (sourceId: string, targetId: string) => void;
  onAddNode: (type: WorkflowNodeType, position: { x: number; y: number }) => void;
  executingNodeId?: string | null;
  completedNodeIds?: string[];
  zoom?: number;
}

export function WorkflowCanvas({
  nodes,
  connections,
  selectedNodeId,
  onSelectNode,
  onUpdateNode,
  onDeleteNode,
  onConnect,
  onAddNode,
  executingNodeId,
  completedNodeIds = [],
  zoom = 1,
}: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Handle canvas click to deselect
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('workflow-grid')) {
      onSelectNode(null);
    }
  }, [onSelectNode]);

  // Handle node drag start
  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const rect = (e.target as HTMLElement).closest('.workflow-node')?.getBoundingClientRect();
    if (!rect) return;

    setDraggedNodeId(nodeId);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    onSelectNode(nodeId);
  }, [nodes, onSelectNode]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!isDragging || !draggedNodeId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
    const newY = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;

    onUpdateNode(draggedNodeId, {
      position: {
        x: Math.max(0, Math.round(newX / 20) * 20),
        y: Math.max(0, Math.round(newY / 20) * 20),
      },
    });
  }, [isDragging, draggedNodeId, dragOffset, onUpdateNode, pan, zoom, isPanning, panStart]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedNodeId(null);
    setIsPanning(false);
    
    if (connectingFrom) {
      setConnectingFrom(null);
    }
  }, [connectingFrom]);

  // Handle connection start
  const handleStartConnection = useCallback((nodeId: string) => {
    setConnectingFrom(nodeId);
  }, []);

  // Handle connection end
  const handleEndConnection = useCallback((targetId: string) => {
    if (connectingFrom && connectingFrom !== targetId) {
      onConnect(connectingFrom, targetId);
    }
    setConnectingFrom(null);
  }, [connectingFrom, onConnect]);

  // Handle canvas pan
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, []);

  // Get node center position
  const getNodeCenter = useCallback((node: WorkflowNode) => {
    return {
      x: node.position.x + 120, // Half of node width
      y: node.position.y + 40, // Half of node height
    };
  }, []);

  // Render connection path
  const renderConnection = useCallback((connection: WorkflowConnection) => {
    const sourceNode = nodes.find(n => n.id === connection.sourceId);
    const targetNode = nodes.find(n => n.id === connection.targetId);
    if (!sourceNode || !targetNode) return null;

    const sourceCenter = getNodeCenter(sourceNode);
    const targetCenter = getNodeCenter(targetNode);

    // Calculate control points for smooth curve
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;
    const cx1 = sourceCenter.x + dx * 0.5;
    const cy1 = sourceCenter.y;
    const cx2 = targetCenter.x - dx * 0.5;
    const cy2 = targetCenter.y;

    const isExecuting = executingNodeId === connection.targetId;
    const isCompleted = completedNodeIds.includes(connection.targetId);

    const pathD = `M ${sourceCenter.x} ${sourceCenter.y + 40} C ${cx1} ${sourceCenter.y + 80}, ${cx2} ${targetCenter.y - 40}, ${targetCenter.x} ${targetCenter.y - 40}`;

    return (
      <g key={connection.id}>
        {/* Shadow/glow for active connections */}
        {(isExecuting || isCompleted) && (
          <path
            d={pathD}
            fill="none"
            stroke={isExecuting ? 'hsl(var(--primary))' : 'hsl(var(--success))'}
            strokeWidth={6}
            opacity={0.3}
            className={isExecuting ? 'animate-pulse' : ''}
          />
        )}
        {/* Main connection line */}
        <path
          d={pathD}
          fill="none"
          stroke={isCompleted ? 'hsl(142.1 76.2% 36.3%)' : isExecuting ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
          strokeWidth={2}
          strokeDasharray={isExecuting ? '5,5' : undefined}
          className={isExecuting ? 'animate-dash' : ''}
        />
        {/* Arrow */}
        <circle
          cx={targetCenter.x}
          cy={targetCenter.y - 40}
          r={4}
          fill={isCompleted ? 'hsl(142.1 76.2% 36.3%)' : isExecuting ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
        />
      </g>
    );
  }, [nodes, getNodeCenter, executingNodeId, completedNodeIds]);

  // Render connecting line while dragging
  const renderConnectingLine = useCallback(() => {
    if (!connectingFrom || !canvasRef.current) return null;

    const sourceNode = nodes.find(n => n.id === connectingFrom);
    if (!sourceNode) return null;

    const sourceCenter = getNodeCenter(sourceNode);
    const rect = canvasRef.current.getBoundingClientRect();
    const targetX = (mousePos.x - rect.left - pan.x) / zoom;
    const targetY = (mousePos.y - rect.top - pan.y) / zoom;

    return (
      <path
        d={`M ${sourceCenter.x} ${sourceCenter.y + 40} L ${targetX} ${targetY}`}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeDasharray="5,5"
        opacity={0.6}
      />
    );
  }, [connectingFrom, nodes, mousePos, getNodeCenter, pan, zoom]);

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden bg-background cursor-grab active:cursor-grabbing"
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={handleCanvasMouseDown}
    >
      {/* Grid background */}
      <div 
        className="workflow-grid absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border) / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Canvas content with zoom and pan */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* SVG for connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ width: '5000px', height: '5000px' }}>
          {connections.map(renderConnection)}
          {renderConnectingLine()}
        </svg>

        {/* Nodes */}
        <AnimatePresence>
          {nodes.map(node => (
            <WorkflowNodeComponent
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              isExecuting={executingNodeId === node.id}
              isCompleted={completedNodeIds.includes(node.id)}
              onSelect={() => onSelectNode(node.id)}
              onDragStart={(e) => handleNodeDragStart(node.id, e)}
              onStartConnection={() => handleStartConnection(node.id)}
              onEndConnection={() => handleEndConnection(node.id)}
              onDelete={() => onDeleteNode(node.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm border border-border rounded-md px-2 py-1 text-xs text-muted-foreground">
        {Math.round(zoom * 100)}%
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="6" height="6" rx="1" />
                <rect x="15" y="15" width="6" height="6" rx="1" />
                <path d="M6 9v3a3 3 0 003 3h6" />
                <path d="M15 12l3 3-3 3" />
              </svg>
            </div>
            <p className="text-lg font-medium text-foreground mb-1">Start Building</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Drag nodes from the panel on the left to create your workflow
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
