import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate?: string;
  boardId: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: number;
  title: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to fetch and manage tasks data from the real database
 */
export function useTasksData() {
  const { toast } = useToast();

  // Fetch all boards for the current user
  const {
    data: boards,
    isLoading: isLoadingBoards,
    error: boardsError,
    refetch: refetchBoards
  } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
    enabled: true, // Only fetch when component mounts
  });

  // Get the first/default board ID
  const defaultBoardId = boards && boards.length > 0 ? boards[0].id : undefined;

  // Fetch tasks for the default board
  const {
    data: tasks,
    isLoading: isLoadingTasks,
    error: tasksError,
    refetch: refetchTasks
  } = useQuery<Task[]>({
    queryKey: ['/api/tasks', { boardId: defaultBoardId }],
    enabled: !!defaultBoardId, // Only fetch when we have a boardId
  });

  // Mutation to update a task
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, taskData }: { taskId: string, taskData: Partial<Task> }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}`, taskData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate cache for tasks
      if (defaultBoardId) {
        queryClient.invalidateQueries({ queryKey: ['/api/tasks', { boardId: defaultBoardId }] });
      }
      toast({
        title: "Task updated",
        description: "The task has been updated successfully.",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  // Loading state for all queries
  const isLoading = isLoadingBoards || isLoadingTasks;

  // Combine errors
  const error = boardsError || tasksError;

  // Function to refresh all data
  const refreshAllData = () => {
    refetchBoards();
    if (defaultBoardId) {
      refetchTasks();
    }
  };

  // Filter tasks by status
  const filterTasksByStatus = (status: string | null) => {
    if (!tasks) return [];
    if (!status || status === 'all') return tasks;
    return tasks.filter(task => task.status.toLowerCase() === status.toLowerCase());
  };

  return {
    boards,
    tasks,
    defaultBoardId,
    isLoading,
    error,
    refreshAllData,
    updateTaskMutation,
    filterTasksByStatus
  };
}