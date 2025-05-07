import { useState } from "react";
import { Task } from "@shared/schema";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResultsModalProps {
  isOpen: boolean;
  tasks: Task[];
  onClose: () => void;
  onAddTasks: (tasks: Task[]) => void;
}

export default function ResultsModal({ isOpen, tasks, onClose, onAddTasks }: ResultsModalProps) {
  const [selectedTasks, setSelectedTasks] = useState<Task[]>(tasks);
  
  const toggleTask = (task: Task) => {
    if (selectedTasks.some((t) => t.id === task.id)) {
      setSelectedTasks(selectedTasks.filter((t) => t.id !== task.id));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  };
  
  const handleEditTasks = () => {
    // This would ideally open a more detailed editing interface
    // For now, we'll just do a basic implementation
    alert("Task editing functionality would be implemented here");
  };
  
  const handleAddTasks = () => {
    onAddTasks(selectedTasks);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Extracted Tasks</DialogTitle>
          <DialogDescription>
            The AI successfully extracted the following tasks from your email.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          
          <ScrollArea className="h-[300px] rounded-md">
            <div className="space-y-4 pr-4">
              {tasks.map((task) => (
                <div key={task.id} className="bg-muted rounded-md p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <Checkbox 
                        checked={selectedTasks.some((t) => t.id === task.id)} 
                        onCheckedChange={() => toggleTask(task)}
                        id={`task-${task.id}`}
                      />
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between">
                        <label 
                          htmlFor={`task-${task.id}`}
                          className="text-sm font-medium text-foreground"
                        >
                          {task.title}
                        </label>
                        <span className="text-xs font-medium text-muted-foreground bg-white rounded-full px-2 py-1">
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                      <div className="flex items-center mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center mr-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>{task.dueDate ? formatDate(task.dueDate) : "No due date"}</span>
                        </div>
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <span>{task.assignee || "Unassigned"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          {tasks.length > 0 && (
            <div className="bg-primary/10 rounded-md p-4 mt-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8l4 4 8-8" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-primary">AI Insights</h4>
                  <p className="text-sm text-primary/80">
                    I've extracted these tasks with appropriate priorities and deadlines based on the content.
                    {tasks.some(t => !t.assignee) && " Some tasks don't have clear assignees - you might want to assign them manually."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleEditTasks}
            className="mr-2"
          >
            Edit Tasks
          </Button>
          <Button 
            variant="default" 
            onClick={handleAddTasks}
            disabled={selectedTasks.length === 0}
          >
            Add to Board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
