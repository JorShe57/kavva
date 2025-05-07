import { Task } from "@shared/schema";
import { formatDate, getInitials, priorityColors } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const isCompleted = task.status === "completed";
  
  const priorityClass = priorityColors[task.priority] || "text-muted-foreground bg-muted";
  
  return (
    <div 
      className="task-card bg-white rounded-md shadow-sm p-4 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <h4 className={cn("font-medium text-foreground", isCompleted && "line-through")}>
          {task.title}
        </h4>
        <span className={cn("text-xs font-medium rounded-full px-2 py-1", priorityClass)}>
          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </span>
      </div>
      
      <p className={cn("text-sm text-muted-foreground mb-3 line-clamp-2", isCompleted && "line-through")}>
        {task.description}
      </p>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          {isCompleted ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDate(task.dueDate)}
          </span>
        </div>
        
        {task.assignee ? (
          <div 
            className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-medium text-primary"
            title={task.assignee}
          >
            {getInitials(task.assignee)}
          </div>
        ) : (
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
