import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  RotateCcw, 
  AlertCircle,
  Loader2,
  Bot
} from "lucide-react";
import { Task } from "@shared/schema";
import { useGamification } from "@/hooks/use-gamification";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface TaskActionButtonProps {
  task: Task;
  onStatusChange?: (task: Task, newStatus: string) => void;
}

export default function TaskActionButton({ task, onStatusChange }: TaskActionButtonProps) {
  const { triggerTaskCompleted } = useGamification();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [, setLocation] = useLocation();
  
  // Convert task.id to string once to avoid multiple conversions
  const taskId = String(task.id);
  
  const handleMarkComplete = async () => {
    if (task.status === 'completed') return;
    
    setIsLoading(true);
    try {
      // First update the task in the database
      const now = new Date();
      const updatedTask = await apiRequest(
        'PATCH',
        `/api/tasks/${taskId}`,
        { 
          status: 'completed', 
          completedAt: now.toISOString(),
          // No need to send all these fields for a status update
          // Only send what's changing
        }
      ).then(res => res.json());
      
      // Then trigger the gamification event
      await triggerTaskCompleted(taskId);
      
      // Update UI
      if (onStatusChange) {
        onStatusChange(updatedTask, 'completed');
      }
      
      // Show success message
      toast({
        title: "Task completed",
        description: "You've earned points for completing this task!",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    } catch (error) {
      console.error('Failed to complete task:', error);
      toast({
        title: "Failed to complete task",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReopenTask = async () => {
    if (task.status !== 'completed') return;
    
    setIsLoading(true);
    try {
      // Update the task in the database
      const updatedTask = await apiRequest(
        'PATCH',
        `/api/tasks/${taskId}`,
        { status: 'inprogress', completedAt: null }
      ).then(res => res.json());
      
      // Update UI
      if (onStatusChange) {
        onStatusChange(updatedTask, 'inprogress');
      }
      
      // Show success message
      toast({
        title: "Task reopened",
        description: "Task has been moved back to In Progress",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    } catch (error) {
      console.error('Failed to reopen task:', error);
      toast({
        title: "Failed to reopen task",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="w-full justify-start">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {task.status === 'completed' ? 'Reopening...' : 'Completing...'}
      </Button>
    );
  }
  
  if (task.status === 'completed') {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleReopenTask}
        className="w-full justify-start text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reopen Task
      </Button>
    );
  }
  
  // Handle opening the AI assistant for this task
  const handleCompleteWithAI = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/ai-assistant/${taskId}`);
  };

  if (task.priority === 'high') {
    return (
      <div className="space-y-1">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleMarkComplete} 
          className="w-full justify-start text-amber-500 hover:text-amber-600 hover:bg-amber-50"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Complete High Priority
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleCompleteWithAI}
          className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Bot className="h-4 w-4 mr-2" />
          Complete with AI
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-1">
      <Button 
        variant="ghost" 
        size="sm"
        onClick={handleMarkComplete}
        className="w-full justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        Mark Complete
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm"
        onClick={handleCompleteWithAI}
        className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
      >
        <Bot className="h-4 w-4 mr-2" />
        Complete with AI
      </Button>
    </div>
  );
}
