import { useState } from "react";
import { Task } from "@shared/schema";
import TaskCard from "./TaskCard";
import { cn, statusColors } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { downloadAsPDF, generateShareableLink } from "@/lib/utils";

interface TaskBoardProps {
  tasks: Task[];
  loading: boolean;
  onTaskClick: (task: Task) => void;
  boardId: string;
}

export default function TaskBoard({ tasks, loading, onTaskClick, boardId }: TaskBoardProps) {
  const [showShareOptions, setShowShareOptions] = useState(false);
  
  const tasksByStatus = {
    todo: tasks.filter((task) => task.status === "todo"),
    inprogress: tasks.filter((task) => task.status === "inprogress"),
    completed: tasks.filter((task) => task.status === "completed"),
  };
  
  const handleShareBoard = () => {
    setShowShareOptions(!showShareOptions);
  };
  
  const handleExportPDF = () => {
    downloadAsPDF(tasks, `board-${boardId}.pdf`);
  };
  
  const handleCopyShareLink = () => {
    const link = generateShareableLink(boardId);
    navigator.clipboard.writeText(link);
    // Show a toast notification
    alert("Link copied to clipboard!");
    setShowShareOptions(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Task Board</h2>
          <p className="text-sm text-muted-foreground">Manage your tasks</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted"
            title="Board Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          
          <button 
            className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted"
            title="Export as PDF"
            onClick={handleExportPDF}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          
          <div className="relative">
            <button 
              className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted"
              title="Share Board"
              onClick={handleShareBoard}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
            
            {showShareOptions && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-border">
                <div className="py-1">
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                    onClick={handleCopyShareLink}
                  >
                    Copy shareable link
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                    onClick={handleExportPDF}
                  >
                    Export as PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Kanban Board */}
      <div className="flex overflow-x-auto pb-4 scrollbar-hide">
        {/* To Do Column */}
        <div className="kanban-column mr-4 flex-shrink-0">
          <div className="bg-muted rounded-md p-4 w-80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className={cn("w-3 h-3 rounded-full mr-2", statusColors.todo)}></div>
                <h3 className="font-medium">To Do</h3>
              </div>
              <div className="flex items-center">
                <span className="bg-background text-muted-foreground px-2 py-1 rounded-full text-xs font-medium mr-2">
                  {tasksByStatus.todo.length}
                </span>
                <button
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-background"
                  title="Add new task"
                  onClick={() => {
                    const newTask = {
                      id: `temp-${Date.now()}`,
                      title: "New Task",
                      description: "Task description",
                      status: "todo",
                      priority: "medium",
                      boardId,
                      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                      createdAt: new Date().toISOString(),
                      userId: 0 // This will be set by the server
                    } as Task;
                    onTaskClick(newTask as Task);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Task Cards */}
            <div className="space-y-3">
              {loading ? (
                // Skeleton loader
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-md shadow-sm p-4">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-3" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                ))
              ) : tasksByStatus.todo.length > 0 ? (
                tasksByStatus.todo.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onClick={() => onTaskClick(task)} 
                  />
                ))
              ) : (
                <div className="bg-white rounded-md shadow-sm p-4 text-center text-muted-foreground">
                  No tasks to do
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* In Progress Column */}
        <div className="kanban-column mr-4 flex-shrink-0">
          <div className="bg-muted rounded-md p-4 w-80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className={cn("w-3 h-3 rounded-full mr-2", statusColors.inprogress)}></div>
                <h3 className="font-medium">In Progress</h3>
              </div>
              <div className="flex items-center">
                <span className="bg-background text-muted-foreground px-2 py-1 rounded-full text-xs font-medium mr-2">
                  {tasksByStatus.inprogress.length}
                </span>
                <button
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-background"
                  title="Add new task"
                  onClick={() => {
                    const newTask = {
                      id: `temp-${Date.now()}`,
                      title: "New Task",
                      description: "Task description",
                      status: "inprogress",
                      priority: "medium",
                      boardId,
                      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                      createdAt: new Date().toISOString(),
                      userId: 0 // This will be set by the server
                    } as Task;
                    onTaskClick(newTask);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Task Cards */}
            <div className="space-y-3">
              {loading ? (
                // Skeleton loader
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-md shadow-sm p-4">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-3" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                ))
              ) : tasksByStatus.inprogress.length > 0 ? (
                tasksByStatus.inprogress.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onClick={() => onTaskClick(task)} 
                  />
                ))
              ) : (
                <div className="bg-white rounded-md shadow-sm p-4 text-center text-muted-foreground">
                  No tasks in progress
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Completed Column */}
        <div className="kanban-column flex-shrink-0">
          <div className="bg-muted rounded-md p-4 w-80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className={cn("w-3 h-3 rounded-full mr-2", statusColors.completed)}></div>
                <h3 className="font-medium">Completed</h3>
              </div>
              <span className="bg-background text-muted-foreground px-2 py-1 rounded-full text-xs font-medium">
                {tasksByStatus.completed.length}
              </span>
            </div>
            
            {/* Task Cards */}
            <div className="space-y-3">
              {loading ? (
                // Skeleton loader
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-md shadow-sm p-4">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-3" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                ))
              ) : tasksByStatus.completed.length > 0 ? (
                tasksByStatus.completed.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onClick={() => onTaskClick(task)} 
                  />
                ))
              ) : (
                <div className="bg-white rounded-md shadow-sm p-4 text-center text-muted-foreground">
                  No completed tasks
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
