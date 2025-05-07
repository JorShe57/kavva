import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import TaskBoard from "@/components/kanban/TaskBoard";
import EmailProcessor from "@/components/email/EmailProcessor";
import TaskDetailsModal from "@/components/modals/TaskDetailsModal";
import ProcessingModal from "@/components/modals/ProcessingModal";
import ResultsModal from "@/components/modals/ResultsModal";
import TaskSummaryModal, { TaskSummaryData } from "@/components/modals/TaskSummaryModal";
import TaskSummaryProcessor from "@/components/summary/TaskSummaryProcessor";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Task, TaskBoard as TaskBoardType } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [extractedTasks, setExtractedTasks] = useState<Task[]>([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [activeBoard, setActiveBoard] = useState<string | null>(null);
  const [showNewBoardDialog, setShowNewBoardDialog] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [taskSummary, setTaskSummary] = useState<TaskSummaryData | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Query to fetch boards
  const { data: boards = [], isLoading: boardsLoading } = useQuery<TaskBoardType[]>({ 
    queryKey: ['/api/boards'],
    enabled: !!user
  });

  // Query to fetch tasks for the active board
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({ 
    queryKey: ['/api/tasks', activeBoard],
    queryFn: async () => {
      if (!activeBoard) return [];
      const response = await fetch(`/api/tasks?boardId=${activeBoard}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return response.json();
    },
    enabled: !!activeBoard
  });
  
  // Mutation to create a new board
  const createBoardMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, userId: user?.id }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to create board');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      setShowNewBoardDialog(false);
      setNewBoardTitle('');
      toast({
        title: "Success",
        description: "Board created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create board",
        variant: "destructive",
      });
    }
  });

  // Handle redirection in a useEffect to avoid state updates during render
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  const handleProcessEmail = async (emailContent: string, boardId: string, assignmentOption: string) => {
    setIsProcessing(true);
    setProcessingProgress(0);
    
    try {
      // Simulate progress updates
      const timer = setInterval(() => {
        setProcessingProgress((prev) => {
          if (prev >= 90) {
            clearInterval(timer);
            return 90;
          }
          return prev + 10;
        });
      }, 300);
      
      // Make the actual API request
      const response = await fetch('/api/process-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailContent,
          boardId,
          assignmentOption
        }),
        credentials: 'include'
      });
      
      clearInterval(timer);
      
      if (!response.ok) {
        throw new Error('Failed to process email');
      }
      
      const data = await response.json();
      setProcessingProgress(100);
      
      // Short delay to show 100% completion
      setTimeout(() => {
        setIsProcessing(false);
        setExtractedTasks(data.tasks || []);
        setShowResultsModal(true);
      }, 500);
      
    } catch (error) {
      console.error('Error processing email:', error);
      setIsProcessing(false);
      toast({
        title: "Error",
        description: "Failed to process email",
        variant: "destructive"
      });
    }
  };

  const handleAddTasksToBoard = async (tasks: Task[]) => {
    try {
      if (!activeBoard) {
        toast({
          title: "Error",
          description: "No active board selected",
          variant: "destructive"
        });
        return;
      }
      
      // Clean up tasks - remove temporary IDs and extract only necessary properties
      // Make sure we include all required fields from insertTaskSchema
      const cleanedTasks = tasks.map(task => ({
        title: task.title,
        description: task.description || "",
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        assignee: task.assignee,
        priority: task.priority || "medium",
        status: task.status || "todo",
        boardId: Number(activeBoard), // Must be a number, not string
        emailSource: ""
      }));
      
      console.log('Sending tasks to server:', cleanedTasks);
      
      // Use fetch directly to avoid Response type issues
      const response = await fetch('/api/tasks/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: cleanedTasks,
          boardId: Number(activeBoard) // Convert to number
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to add tasks to board');
      }
      
      // Get the created tasks from the response
      const createdTasks = await response.json();
      console.log('Created tasks:', createdTasks);
      
      // Invalidate tasks query
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', activeBoard] });
      setShowResultsModal(false);
      toast({
        title: "Success",
        description: `${tasks.length} task${tasks.length !== 1 ? 's' : ''} added to board`
      });
    } catch (error) {
      console.error('Error adding tasks:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add tasks to board",
        variant: "destructive"
      });
    }
  };
  
  // Function to handle task summarization
  const handleSummarizeTasks = async (boardId: string) => {
    setIsSummarizing(true);
    setShowSummaryModal(true);
    
    try {
      const response = await fetch('/api/summarize-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardId
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to summarize tasks');
      }
      
      const summary = await response.json();
      setTaskSummary(summary);
    } catch (error) {
      console.error('Error summarizing tasks:', error);
      toast({
        title: "Error",
        description: "Failed to generate task summary",
        variant: "destructive"
      });
      setShowSummaryModal(false);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        boards={boards as TaskBoardType[]}
        activeBoard={activeBoard}
        onBoardSelect={setActiveBoard}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Extract tasks from emails with AI and organize them effortlessly.
                </p>
              </div>
              
              <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button 
                  className="inline-flex items-center justify-center px-4 py-2 border border-primary rounded-md text-primary bg-background hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  onClick={() => setShowNewBoardDialog(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>New Board</span>
                </button>
                
                <button 
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  onClick={() => {
                    const emailSection = document.getElementById('email-processor');
                    if (emailSection) {
                      emailSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span>Process Email</span>
                </button>
                
                <button 
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  onClick={() => {
                    const summarySection = document.getElementById('task-summary-processor');
                    if (summarySection) {
                      summarySection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  <span>AI Summary</span>
                </button>
              </div>
            </div>
          </div>
          
          {activeBoard && (
            <TaskBoard 
              tasks={tasks} 
              loading={tasksLoading}
              onTaskClick={setSelectedTask}
              boardId={activeBoard}
              onSummaryGenerated={(summary) => {
                setTaskSummary({
                  ...summary,
                  taskCount: tasks.length,
                });
                setShowSummaryModal(true);
              }}
            />
          )}
          
          <div id="email-processor" className="mt-8">
            <EmailProcessor onSubmit={handleProcessEmail} boards={boards as TaskBoardType[]} />
          </div>
          
          <div id="task-summary-processor" className="mt-8">
            <TaskSummaryProcessor 
              onSubmit={handleSummarizeTasks} 
              boards={boards as TaskBoardType[]} 
              disabled={isSummarizing}
            />
          </div>
        </main>
      </div>
      
      {selectedTask && (
        <TaskDetailsModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onSave={() => {
            setSelectedTask(null);
            // Refresh tasks
            queryClient.invalidateQueries({ queryKey: ['/api/tasks', activeBoard] });
          }}
        />
      )}
      
      <ProcessingModal 
        isOpen={isProcessing} 
        progress={processingProgress}
        onCancel={() => setIsProcessing(false)} 
      />
      
      <ResultsModal 
        isOpen={showResultsModal} 
        tasks={extractedTasks}
        onClose={() => setShowResultsModal(false)}
        onAddTasks={handleAddTasksToBoard}
      />

      <TaskSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        summary={taskSummary}
        loading={isSummarizing}
      />
      
      {/* New Board Dialog */}
      <Dialog open={showNewBoardDialog} onOpenChange={setShowNewBoardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>
              Enter a name for your new task board.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="board-title" className="text-right">
                Board Name
              </Label>
              <Input
                id="board-title"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                placeholder="My Task Board"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="secondary" 
              onClick={() => setShowNewBoardDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (newBoardTitle.trim() !== '') {
                  createBoardMutation.mutate(newBoardTitle.trim());
                }
              }}
              disabled={createBoardMutation.isPending || !newBoardTitle.trim()}
            >
              {createBoardMutation.isPending ? 'Creating...' : 'Create Board'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}