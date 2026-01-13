import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { WorkflowNode, WorkflowConnection, WorkflowNodeType } from '@/types/workflow';
import { WorkflowNodeComponent } from './WorkflowNode';
import { NodePicker } from './NodePicker';
import { Button } from '@/components/ui/button';
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
  onZoomChange?: (zoom: number) => void;
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
  onZoomChange,
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
  
  // Node picker state
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [nodePickerPosition, setNodePickerPosition] = useState({ x: 0, y: 0 });
  const [nodePickerCanvasPosition, setNodePickerCanvasPosition] = useState({ x: 0, y: 0 });
  const [showTriggersFirst, setShowTriggersFirst] = useState(false);

  // Handle canvas click to deselect
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('workflow-grid')) {
      onSelectNode(null);
      setShowNodePicker(false);
    }
  }, [onSelectNode]);

  // Handle double-click to add node
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;
    
    setNodePickerPosition({ x: e.clientX, y: e.clientY });
    setNodePickerCanvasPosition({ 
      x: Math.round(canvasX / 20) * 20, 
      y: Math.round(canvasY / 20) * 20 
    });
    setShowTriggersFirst(nodes.length === 0);
    setShowNodePicker(true);
  }, [pan, zoom, nodes.length]);

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;
    
    setNodePickerPosition({ x: e.clientX, y: e.clientY });
    setNodePickerCanvasPosition({ 
      x: Math.round(canvasX / 20) * 20, 
      y: Math.round(canvasY / 20) * 20 
    });
    setShowTriggersFirst(nodes.length === 0);
    setShowNodePicker(true);
  }, [pan, zoom, nodes.length]);

  // Handle node selection from picker
  const handleNodePickerSelect = useCallback((type: WorkflowNodeType) => {
    onAddNode(type, nodePickerCanvasPosition);
    setShowNodePicker(false);
  }, [onAddNode, nodePickerCanvasPosition]);

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

  // Handle mouse move for dragging and panning
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

    // Snap to grid - use finer grid (10px) for better vertical alignment
    const snappedX = Math.max(0, Math.round(newX / 10) * 10);
    const snappedY = Math.max(0, Math.round(newY / 10) * 10);

    // Check for vertical alignment with other nodes (allow snapping to exact same X position)
    const draggedNode = nodes.find(n => n.id === draggedNodeId);
    let finalX = snappedX;
    
    if (draggedNode) {
      const NODE_CENTER = 130; // Half of node width (260/2)
      const SNAP_THRESHOLD = 15;
      
      for (const node of nodes) {
        if (node.id === draggedNodeId) continue;
        
        // Check if we're close to another node's X position (for vertical alignment)
        if (Math.abs(snappedX - node.position.x) < SNAP_THRESHOLD) {
          finalX = node.position.x;
          break;
        }
      }
    }

    onUpdateNode(draggedNodeId, {
      position: {
        x: finalX,
        y: snappedY,
      },
    });
  }, [isDragging, draggedNodeId, dragOffset, onUpdateNode, pan, zoom, isPanning, panStart, nodes]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedNodeId(null);
    setIsPanning(false);
    
    if (connectingFrom) {
      setConnectingFrom(null);
    }
  }, [connectingFrom]);

  // Handle canvas pan (middle mouse or space+drag)
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse button or Alt+Left click or Space+click for panning
    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, []);

  // Handle wheel for zoom and pan - slower zoom speed
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom with Ctrl/Cmd + scroll - reduced delta for slower zoom
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.03 : 0.03;
      const newZoom = Math.min(2, Math.max(0.25, zoom + delta));
      onZoomChange?.(newZoom);
    } else {
      // Pan with regular scroll
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, [zoom, onZoomChange]);

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

  // Get node connection points (center of the circles)
  // Node width is ~260px, so center is x + 130
  // Top circle is at y - 3 (12px from top, but it's positioned at -top-3)
  // Bottom circle is at y + nodeHeight - 3 (positioned at -bottom-3)
  const NODE_WIDTH = 260;
  const NODE_HEIGHT = 120; // Approximate height based on content
  
  const getNodeTopCenter = useCallback((node: WorkflowNode) => {
    return {
      x: node.position.x + NODE_WIDTH / 2,
      y: node.position.y, // Top connection point
    };
  }, []);
  
  const getNodeBottomCenter = useCallback((node: WorkflowNode) => {
    return {
      x: node.position.x + NODE_WIDTH / 2,
      y: node.position.y + NODE_HEIGHT, // Bottom connection point
    };
  }, []);

  // Render connection path - connect from source bottom circle to target top circle
  const renderConnection = useCallback((connection: WorkflowConnection) => {
    const sourceNode = nodes.find(n => n.id === connection.sourceId);
    const targetNode = nodes.find(n => n.id === connection.targetId);
    if (!sourceNode || !targetNode) return null;

    const sourcePoint = getNodeBottomCenter(sourceNode);
    const targetPoint = getNodeTopCenter(targetNode);

    // Calculate bezier curve control points for smooth connection
    const dy = targetPoint.y - sourcePoint.y;
    const controlOffset = Math.min(Math.abs(dy) * 0.4, 60);

    const isExecuting = executingNodeId === connection.targetId;
    const isCompleted = completedNodeIds.includes(connection.targetId);

    const pathD = `M ${sourcePoint.x} ${sourcePoint.y} C ${sourcePoint.x} ${sourcePoint.y + controlOffset}, ${targetPoint.x} ${targetPoint.y - controlOffset}, ${targetPoint.x} ${targetPoint.y}`;

    return (
      <g key={connection.id}>
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
        <path
          d={pathD}
          fill="none"
          stroke={isCompleted ? 'hsl(142.1 76.2% 36.3%)' : isExecuting ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
          strokeWidth={2}
          strokeDasharray={isExecuting ? '5,5' : undefined}
          className={isExecuting ? 'animate-dash' : ''}
        />
        {/* Arrow head at target */}
        <circle
          cx={targetPoint.x}
          cy={targetPoint.y}
          r={4}
          fill={isCompleted ? 'hsl(142.1 76.2% 36.3%)' : isExecuting ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
        />
      </g>
    );
  }, [nodes, getNodeBottomCenter, getNodeTopCenter, executingNodeId, completedNodeIds]);

  // Render connecting line while dragging
  const renderConnectingLine = useCallback(() => {
    if (!connectingFrom || !canvasRef.current) return null;

    const sourceNode = nodes.find(n => n.id === connectingFrom);
    if (!sourceNode) return null;

    const sourcePoint = getNodeBottomCenter(sourceNode);
    const rect = canvasRef.current.getBoundingClientRect();
    const targetX = (mousePos.x - rect.left - pan.x) / zoom;
    const targetY = (mousePos.y - rect.top - pan.y) / zoom;

    return (
      <path
        d={`M ${sourcePoint.x} ${sourcePoint.y} L ${targetX} ${targetY}`}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeDasharray="5,5"
        opacity={0.6}
      />
    );
  }, [connectingFrom, nodes, mousePos, getNodeBottomCenter, pan, zoom]);

  // Open node picker from + button
  const handleAddButtonClick = useCallback(() => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    setNodePickerPosition({ 
      x: rect.left + centerX, 
      y: rect.top + centerY - 100 
    });
    setNodePickerCanvasPosition({ 
      x: Math.round(((centerX - pan.x) / zoom) / 20) * 20, 
      y: Math.round(((centerY - pan.y) / zoom) / 20) * 20 
    });
    setShowTriggersFirst(nodes.length === 0);
    setShowNodePicker(true);
  }, [pan, zoom, nodes.length]);

  return (
    <div
      ref={canvasRef}
      className={cn(
        "relative w-full h-full overflow-hidden bg-background",
        isPanning ? "cursor-grabbing" : "cursor-default"
      )}
      onClick={handleCanvasClick}
      onDoubleClick={handleCanvasDoubleClick}
      onContextMenu={handleContextMenu}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleWheel}
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

      {/* Add button - floating */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          size="lg"
          onClick={handleAddButtonClick}
          className="gap-2 rounded-full px-6 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Add Node
        </Button>
      </motion.div>

      {/* Zoom controls */}
      <div className="absolute bottom-6 right-6 flex items-center gap-1 bg-background/80 backdrop-blur-sm border border-border rounded-lg p-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onZoomChange?.(Math.max(0.25, zoom - 0.1))}
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
          onClick={() => onZoomChange?.(Math.min(2, zoom + 0.1))}
        >
          +
        </Button>
      </div>

      {/* Pan hint */}
      <div className="absolute bottom-6 left-6 text-xs text-muted-foreground bg-background/60 backdrop-blur-sm px-2 py-1 rounded">
        Scroll to pan • Ctrl+scroll to zoom • Double-click or right-click to add
      </div>

      {/* Empty state */}
      {nodes.length === 0 && !showNodePicker && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-10 h-10 text-primary" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">Start Building</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Click the <strong>Add Node</strong> button below, or double-click anywhere on the canvas
            </p>
          </motion.div>
        </div>
      )}

      {/* Node Picker Portal */}
      <AnimatePresence>
        {showNodePicker && (
          <NodePicker
            position={nodePickerPosition}
            onSelect={handleNodePickerSelect}
            onClose={() => setShowNodePicker(false)}
            showTriggersFirst={showTriggersFirst}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
