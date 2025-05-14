import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Task } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TaskDetailsModalProps {
  task: Task;
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
}

export default function TaskDetailsModal({ task, onClose, onSave }: TaskDetailsModalProps) {
  // Fetch recommendations
  const { data: recommendations, isLoading: loadingRecommendations } = useQuery({
    queryKey: ['taskRecommendations', task?.id],
    queryFn: async () => {
      if (!task?.id) return null;
      const response = await fetch(`/api/tasks/${task.id}/recommendations`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return response.json();
    },
    enabled: !!task?.id
  });
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  // Create a properly typed initial state
  const [taskData, setTaskData] = useState<Task>({
    ...task,
    // Ensure string | null types are properly initialized for the form
    description: task.description || "",
    assignee: task.assignee || "",
    emailSource: task.emailSource || null,
    dueDate: task.dueDate
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTaskData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setTaskData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // Check if this is a new task or existing task
      const isNewTask = !task.id || task.id.toString().startsWith('temp-');
      
      // Prepare the task data with proper date formatting
      const preparedTaskData = {
        ...taskData,
        // Ensure dates are in ISO format
        dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null,
      };
      
      if (isNewTask) {
        // Create new task
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(preparedTaskData),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to create task');
        }
        
        const newTask = await response.json();
        
        toast({
          title: "Task created",
          description: "Your task has been created successfully.",
        });
        
        onSave(newTask);
      } else {
        // Update existing task
        const response = await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(preparedTaskData),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to update task');
        }
        
        const updatedTask = await response.json();
        
        toast({
          title: "Task updated",
          description: "Your task has been updated successfully.",
        });
        
        onSave(updatedTask);
      }
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "Error",
        description: `Failed to ${!task.id ? 'create' : 'update'} task. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await apiRequest("DELETE", `/api/tasks/${task.id}`, undefined);
      toast({
        title: "Task deleted",
        description: "Your task has been deleted successfully.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>

          {/* AI Recommendations */}
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold">AI Recommendations</h3>
            {loadingRecommendations ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ) : recommendations ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Quick Tips:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {recommendations.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground">{rec}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Step-by-Step Guide:</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    {recommendations.steps.map((step: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground">{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : null}
          </div>

          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>
            View and edit task details
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Task Title</Label>
            <Input 
              id="title" 
              name="title"
              value={taskData.title}
              onChange={handleChange}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              name="description"
              value={taskData.description || ""}
              onChange={handleChange}
              rows={4}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input 
                id="dueDate" 
                name="dueDate"
                type="date"
                value={taskData.dueDate ? format(new Date(taskData.dueDate), "yyyy-MM-dd") : ""}
                onChange={handleChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={taskData.priority} 
                onValueChange={(value) => handleSelectChange("priority", value)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Input 
                id="assignee" 
                name="assignee"
                value={taskData.assignee || ""}
                onChange={handleChange}
                placeholder="Enter assignee name"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={taskData.status} 
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="inprogress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid gap-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="generateWorkflow"
                checked={!!taskData.generateWorkflow}
                onChange={(e) => setTaskData(prev => ({ ...prev, generateWorkflow: e.target.checked }))}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="generateWorkflow">Generate AI Workflow</Label>
            </div>
            <p className="text-sm text-muted-foreground">When enabled, an AI-powered workflow will be generated to help complete this task efficiently.</p>
          </div>
          
          {task.emailSource && (
            <div className="grid gap-2">
              <Label>Extracted From Email</Label>
              <div className="bg-muted rounded-md p-4 font-mono text-sm text-muted-foreground max-h-40 overflow-y-auto">
                <p>{task.emailSource}</p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isLoading}
          >
            Delete
          </Button>
          <Button 
            variant="default"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
