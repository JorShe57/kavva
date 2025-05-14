import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { Task } from "@shared/schema";
import { useMutation, useQuery } from '@tanstack/react-query';
import ForceGraph2D from 'react-force-graph-2d';
import { useResizeObserver } from '@/hooks/use-resize-observer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, ZoomOut, Move, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { priorityColors, statusColors } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface GraphNode {
  id: string;
  label: string;
  status: string;
  priority: string;
  dueDate?: Date | null;
  assignee?: string | null;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface TaskDependencyGraphProps {
  boardId: string;
  height?: number;
}

export default function TaskDependencyGraph({ boardId, height = 400 }: TaskDependencyGraphProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useResizeObserver(containerRef);
  const graphRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedTaskToAdd, setSelectedTaskToAdd] = useState<string | null>(null);
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);

  // Fetch dependency graph data
  const { data: graphData, isLoading, error, refetch } = useQuery<GraphData>({
    queryKey: [`/api/boards/${boardId}/dependency-graph`],
    enabled: !!boardId,
  });
  
  // Process the graph data to ensure links have correct source/target objects
  const processedGraphData = useMemo(() => {
    if (!graphData) return null;
    
    // Create a node map for quick lookups
    const nodeMap = new Map();
    graphData.nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });
    
    // Process links to ensure they have the correct object references
    const processedLinks = graphData.links.map(link => {
      // Convert string IDs to object references
      return {
        source: nodeMap.get(link.source) || link.source,
        target: nodeMap.get(link.target) || link.target,
        type: link.type
      };
    });
    
    return {
      nodes: [...graphData.nodes],
      links: processedLinks
    };
  }, [graphData]);

  // Fetch all tasks to select from when adding dependencies
  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks', { boardId }],
    enabled: !!boardId,
  });

  // Mutation to add dependency
  const addDependencyMutation = useMutation({
    mutationFn: async ({ taskId, prerequisiteId }: { taskId: string, prerequisiteId: string }) => {
      const res = await apiRequest('POST', `/api/tasks/${taskId}/dependencies`, { prerequisiteId });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Dependency added',
        description: 'Task dependency has been successfully added.',
      });
      refetch();
      setDependencyDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/dependency-graph`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add dependency',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation to remove dependency
  const removeDependencyMutation = useMutation({
    mutationFn: async ({ taskId, prerequisiteId }: { taskId: string, prerequisiteId: string }) => {
      await apiRequest('DELETE', `/api/tasks/${taskId}/dependencies/${prerequisiteId}`);
    },
    onSuccess: () => {
      toast({
        title: 'Dependency removed',
        description: 'Task dependency has been successfully removed.',
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/dependency-graph`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove dependency',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const width = dimensions?.width || 700;

  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label || 'Task';
    const fontSize = 12/globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;

    // Background
    const textWidth = ctx.measureText(label).width;
    const bgHeight = fontSize * 1.5;
    const status = node.status || 'todo';
    const priority = node.priority || 'medium';
    
    // Get colors with safeguards
    let bgColor = '#888';
    if (status === 'todo') bgColor = statusColors.todo;
    else if (status === 'inprogress') bgColor = statusColors.inprogress;
    else if (status === 'completed') bgColor = statusColors.completed;
    
    let borderColor = '#555';
    if (priority === 'high') borderColor = priorityColors.high;
    else if (priority === 'medium') borderColor = priorityColors.medium;
    else if (priority === 'low') borderColor = priorityColors.low;

    // Draw node background with status color
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    if (node.x !== undefined && node.y !== undefined) {
      ctx.roundRect(node.x - textWidth / 2 - 5, node.y - bgHeight / 2, textWidth + 10, bgHeight, 5);
      ctx.fill();

      // Draw border with priority color
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, node.x, node.y);

      // Draw indicators for assignee or due date
      if (node.assignee) {
        const nameInitial = node.assignee.charAt(0).toUpperCase();
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(node.x + textWidth / 2 + 10, node.y, fontSize / 2, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `${fontSize * 0.8}px Sans-Serif`;
        ctx.fillText(nameInitial, node.x + textWidth / 2 + 10, node.y);
      }
    }
  }, [statusColors, priorityColors]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    setDependencyDialogOpen(true);
  }, []);

  const handleAddDependency = useCallback(() => {
    if (selectedNode && selectedTaskToAdd) {
      addDependencyMutation.mutate({
        taskId: selectedNode.id,
        prerequisiteId: selectedTaskToAdd
      });
    }
  }, [selectedNode, selectedTaskToAdd, addDependencyMutation]);

  const handleRemoveDependency = useCallback((prerequisiteId: string) => {
    if (selectedNode) {
      removeDependencyMutation.mutate({
        taskId: selectedNode.id,
        prerequisiteId
      });
    }
  }, [selectedNode, removeDependencyMutation]);

  // Compute current prerequisites and dependents for selected node
  const { prerequisites, dependents } = useMemo(() => {
    if (!selectedNode || !processedGraphData) {
      return { prerequisites: [], dependents: [] };
    }

    // Find links where the selected node is the target (these are prerequisites)
    const prerequisiteLinks = processedGraphData.links.filter(link => {
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return targetId === selectedNode.id;
    });
    
    const prerequisiteIds = prerequisiteLinks.map(link => {
      return typeof link.source === 'object' ? link.source.id : link.source;
    });

    // Find links where the selected node is the source (these are dependents)
    const dependentLinks = processedGraphData.links.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      return sourceId === selectedNode.id;
    });
    
    const dependentIds = dependentLinks.map(link => {
      return typeof link.target === 'object' ? link.target.id : link.target;
    });

    // Get the full node data for each prerequisite and dependent
    const prerequisites = processedGraphData.nodes.filter(node => prerequisiteIds.includes(node.id));
    const dependents = processedGraphData.nodes.filter(node => dependentIds.includes(node.id));

    return { prerequisites, dependents };
  }, [selectedNode, processedGraphData]);

  // Filter task options to prevent circular dependencies and self-dependencies
  const availableTasks = useMemo(() => {
    if (!tasks || !selectedNode) return [];
    
    // Make sure tasks is an array
    const taskArray = Array.isArray(tasks) ? tasks : [];

    // Filter out the selected task itself and any tasks that are already prerequisites
    return taskArray.filter((task: any) => 
      task.id !== parseInt(selectedNode.id) && 
      !prerequisites.some(p => p.id === task.id.toString())
    );
  }, [tasks, selectedNode, prerequisites]);

  const zoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.2);
    }
  };

  const zoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.2);
    }
  };

  const centerGraph = () => {
    if (graphRef.current) {
      graphRef.current.centerAt();
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Task Dependencies</CardTitle>
          <CardDescription>Loading dependency graph...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center" style={{ height }}>
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Task Dependencies</CardTitle>
          <CardDescription className="text-red-500">Failed to load dependency graph</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  const hasData = graphData && graphData.nodes.length > 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Task Dependencies</CardTitle>
            <CardDescription>
              {hasData 
                ? `Visualizing ${graphData.nodes.length} tasks with ${graphData.links.length} dependencies` 
                : 'No task dependencies found'}
            </CardDescription>
          </div>
          {hasData && (
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={zoomIn} title="Zoom In">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={zoomOut} title="Zoom Out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={centerGraph} title="Center View">
                <Move className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent ref={containerRef}>
        <div style={{ height: height + 'px', width: '100%' }} className="border rounded-md">
          {hasData ? (
            <ForceGraph2D
              ref={graphRef}
              graphData={processedGraphData || { nodes: [], links: [] }}
              nodeLabel="label"
              width={width}
              height={height}
              nodeCanvasObject={nodeCanvasObject}
              nodePointerAreaPaint={(node: GraphNode, color, ctx) => {
                const fontSize = 12;
                ctx.fillStyle = color;
                const label = node.label || 'Task';
                const textWidth = ctx.measureText(label).width;
                const bgHeight = fontSize * 1.5;
                
                if (node.x !== undefined && node.y !== undefined) {
                  ctx.beginPath();
                  ctx.roundRect(node.x - textWidth / 2 - 5, node.y - bgHeight / 2, textWidth + 10, bgHeight, 5);
                  ctx.fill();
                }
              }}
              linkDirectionalArrowLength={5}
              linkDirectionalArrowRelPos={1}
              linkCurvature={0.2}
              linkColor={() => "#94a3b8"}
              linkWidth={2}
              onNodeClick={handleNodeClick}
              cooldownTicks={100}
              // Apply forces as a configuration object
              // @ts-ignore - d3Force is available but not in types
              d3Force={{
                charge: { strength: -1000 },
                link: { distance: 100 },
                center: { strength: 0.05 }
              }}
            />
          ) : (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              No task dependencies found for this board.
            </div>
          )}
        </div>
      </CardContent>

      {/* Task dependency dialog */}
      <Dialog open={dependencyDialogOpen} onOpenChange={setDependencyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Task Dependencies</DialogTitle>
            <DialogDescription>
              {selectedNode && `Manage dependencies for "${selectedNode.label}"`}
            </DialogDescription>
          </DialogHeader>

          {selectedNode && (
            <div className="grid gap-4 py-4">
              <div>
                <h3 className="text-sm font-medium mb-2">This task depends on:</h3>
                {prerequisites.length > 0 ? (
                  <ul className="space-y-2">
                    {prerequisites.map((task) => (
                      <li key={task.id} className="flex items-center justify-between p-2 border rounded-md">
                        <span>{task.label}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveDependency(task.id)}
                          disabled={removeDependencyMutation.isPending}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No prerequisites</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Tasks that depend on this:</h3>
                {dependents.length > 0 ? (
                  <ul className="space-y-2">
                    {dependents.map((task) => (
                      <li key={task.id} className="p-2 border rounded-md">
                        {task.label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No dependent tasks</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Add a prerequisite:</h3>
                {availableTasks.length > 0 ? (
                  <div className="flex gap-2">
                    <select 
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={selectedTaskToAdd || ""}
                      onChange={(e) => setSelectedTaskToAdd(e.target.value)}
                    >
                      <option value="">Select a task</option>
                      {availableTasks.map((task: any) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                    <Button 
                      onClick={handleAddDependency} 
                      disabled={!selectedTaskToAdd || addDependencyMutation.isPending}
                    >
                      {addDependencyMutation.isPending ? 
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                        'Add'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No available tasks to add as prerequisites</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setDependencyDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
