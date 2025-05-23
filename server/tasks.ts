import type { Express } from "express";
import { storage } from "./storage";
import { processEmailWithAI, summarizeTasksWithAI, getTaskRecommendations } from "./openai";
import { insertTaskSchema, type Task } from "@shared/schema";
import { TaskOutput } from "./openai";

export function setupTaskRoutes(app: Express) {
  // Get tasks for a board
  app.get("/api/tasks", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const boardId = req.query.boardId as string;

      // If no boardId is provided, get all boards for the user and fetch all tasks
      if (!boardId) {
        // Get all boards for this user
        const boards = await storage.getBoardsByUserId((req.user as any).id);
        
        // If no boards found, return empty array
        if (!boards || boards.length === 0) {
          return res.json([]);
        }
        
        // Fetch tasks for all boards and flatten them into one array
        let allTasks: Task[] = [];
        for (const board of boards) {
          const boardTasks = await storage.getTasksByBoardId(String(board.id));
          allTasks = [...allTasks, ...boardTasks];
        }
        
        return res.json(allTasks);
      }
      
      // If boardId is provided, validate it and fetch tasks for that board
      if (isNaN(Number(boardId))) {
        return res.status(400).json({ message: "Valid board ID is required" });
      }

      const numericBoardId = Number(boardId);

      // Verify board belongs to user
      const board = await storage.getBoard(String(numericBoardId));

      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }

      if (board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const tasks = await storage.getTasksByBoardId(String(numericBoardId));
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Create a new task
  app.post("/api/tasks", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const result = insertTaskSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: "Invalid task data", errors: result.error.flatten() });
      }

      // Verify board belongs to user
      const board = await storage.getBoard(String(result.data.boardId));

      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }

      if (board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const task = await storage.createTask(result.data);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Create multiple tasks at once
  app.post("/api/tasks/batch", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      console.log("Received batch task request body:", JSON.stringify(req.body, null, 2));

      const { tasks, boardId } = req.body;

      if (!Array.isArray(tasks) || !boardId) {
        console.log("Invalid batch data. Tasks is array:", Array.isArray(tasks), "boardId:", boardId);
        return res.status(400).json({ message: "Invalid request data" });
      }

      // Verify board belongs to user
      const board = await storage.getBoard(String(boardId));

      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }

      if (board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Each task already has the boardId property from the client,
      // so we don't need to add it again. However, make sure we're dealing with a clean task object.
      console.log("Creating tasks with board ID:", boardId);

      const createdTasks = await Promise.all(
        tasks.map(task => {
          console.log("Creating task:", task);
          // Make sure we're using the correct boardId (the one from the request)
          return storage.createTask({
            ...task,
            // If somehow the task boardId doesn't match the request boardId, use the request boardId
            boardId: Number(boardId),
          });
        })
      );

      console.log("Successfully created tasks:", createdTasks.length);
      res.status(201).json(createdTasks);
    } catch (error) {
      console.error("Error creating tasks:", error);
      res.status(500).json({ 
        message: "Failed to create tasks", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Update a task
  app.patch("/api/tasks/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const taskId = req.params.id;
      const task = await storage.getTask(taskId);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Verify task's board belongs to user
      const board = await storage.getBoard(String(task.boardId));

      if (!board || board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updatedTask = await storage.updateTask(taskId, req.body);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get a single task by ID
  app.get("/api/tasks/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const taskId = req.params.id;
      const task = await storage.getTask(taskId);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Verify task's board belongs to user
      const board = await storage.getBoard(String(task.boardId));

      if (!board || board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Return the task with additional details for the AI workspace
      // Fetch user stats if available
      let stats = null;
      try {
        const userStats = await storage.getUserStats((req.user as any).id);
        if (userStats) {
          stats = {
            taskCompleted: userStats.tasksCompleted,
            tasksCreated: userStats.tasksCreated,
            level: userStats.level,
            points: userStats.points
          };
        }
      } catch (error) {
        console.error("Error fetching user stats:", error);
      }

      // Get recommended next steps or prerequisites if available
      let recommendations: string[] = [];
      if (task.description) {
        try {
          const taskRecs = await getTaskRecommendations({
            id: String(task.id),
            title: task.title,
            description: task.description,
            dueDate: task.dueDate ? task.dueDate.toISOString() : null,
            assignee: task.assignee,
            priority: task.priority,
            status: task.status
          });
          recommendations = taskRecs.recommendations || [];
        } catch (error) {
          console.error("Error generating recommendations:", error);
        }
      }

      res.json({
        ...task,
        recommendations,
        userStats: stats
      });
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  // Delete a task
  app.delete("/api/tasks/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const taskId = req.params.id;
      const task = await storage.getTask(taskId);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Verify task's board belongs to user
      const board = await storage.getBoard(String(task.boardId));

      if (!board || board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteTask(taskId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Process email with AI
  app.post("/api/process-email", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { emailContent, boardId, assignmentOption } = req.body;

      console.log("Process email request:", {
        emailContentLength: emailContent?.length || 0,
        boardId,
        assignmentOption
      });

      if (!emailContent || !boardId) {
        return res.status(400).json({ message: "Email content and board ID are required" });
      }

      // Verify board belongs to user
      const board = await storage.getBoard(String(boardId));

      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }

      if (board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      console.log("Starting AI processing of email...");

      // Process the email with AI
      const tasks = await processEmailWithAI(emailContent, {
        assignmentOption,
        username: (req.user as any).username,
      });

      console.log("AI processing completed, extracted tasks:", tasks);

      // Add board ID to each task
      const tasksWithBoardId = tasks.map(task => ({
        ...task,
        boardId,
        emailSource: emailContent,
      }));

      res.json({ tasks: tasksWithBoardId });
    } catch (error) {
      console.error("Error processing email:", error);
      res.status(500).json({ message: "Failed to process email", error: String(error) });
    }
  });

  // Summarize tasks with AI
  app.post("/api/summarize-tasks", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { boardId } = req.body;

      if (!boardId) {
        return res.status(400).json({ message: "Board ID is required" });
      }

      // Verify board belongs to user
      const board = await storage.getBoard(String(boardId));

      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }

      if (board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get all tasks for the board
      const tasks = await storage.getTasksByBoardId(String(boardId));

      if (tasks.length === 0) {
        return res.json({
          summary: "No tasks found in this board",
          insights: [],
          actionItems: [],
          overallProgress: 0,
          taskCount: 0
        });
      }

      console.log(`Generating summary for ${tasks.length} tasks in board ${boardId}...`);

      // Generate summary with AI
      // Convert database tasks to TaskOutput format
      const taskOutputs: TaskOutput[] = tasks.map(task => ({
        id: String(task.id),
        title: task.title,
        description: task.description || "",
        dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : null,
        assignee: task.assignee,
        priority: task.priority,
        status: task.status
      }));

      const summary = await summarizeTasksWithAI(taskOutputs, {
        username: (req.user as any).username
      });

      console.log("Summary generated successfully");

      // Add task count to the response
      res.json({
        ...summary,
        taskCount: tasks.length
      });
    } catch (error) {
      console.error("Error summarizing tasks:", error);
      res.status(500).json({ message: "Failed to summarize tasks", error: String(error) });
    }
  });

  // Get task dependencies
  app.get("/api/tasks/:id/dependencies", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const taskId = req.params.id;
      const task = await storage.getTask(taskId);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Verify task's board belongs to user
      const board = await storage.getBoard(String(task.boardId));

      if (!board || board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get prerequisite tasks (tasks that this task depends on)
      const prerequisitesPromises = task.prerequisiteTaskIds 
        ? task.prerequisiteTaskIds.map(id => storage.getTask(id))
        : [];

      // Get dependent tasks (tasks that depend on this task)
      const dependentsPromises = task.dependentTaskIds
        ? task.dependentTaskIds.map(id => storage.getTask(id))
        : [];

      const [prerequisites, dependents] = await Promise.all([
        Promise.all(prerequisitesPromises),
        Promise.all(dependentsPromises)
      ]);

      // Filter out any undefined results (tasks that might have been deleted)
      const validPrerequisites = prerequisites.filter(Boolean);
      const validDependents = dependents.filter(Boolean);

      res.json({
        prerequisites: validPrerequisites,
        dependents: validDependents
      });
    } catch (error) {
      console.error("Error fetching task dependencies:", error);
      res.status(500).json({ 
        message: "Failed to fetch task dependencies", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Add task dependency
  app.post("/api/tasks/:id/dependencies", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const taskId = req.params.id;
      const { prerequisiteId } = req.body; // ID of the task that this task depends on

      if (!prerequisiteId) {
        return res.status(400).json({ message: "Prerequisite task ID is required" });
      }

      // Check if the task exists
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check if the prerequisite task exists
      const prerequisiteTask = await storage.getTask(prerequisiteId);
      if (!prerequisiteTask) {
        return res.status(404).json({ message: "Prerequisite task not found" });
      }

      // Verify both tasks' boards belong to the user
      const board = await storage.getBoard(String(task.boardId));
      const prerequisiteBoard = await storage.getBoard(String(prerequisiteTask.boardId));

      if (!board || board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (!prerequisiteBoard || prerequisiteBoard.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Cannot add dependency to itself
      if (taskId === prerequisiteId) {
        return res.status(400).json({ message: "Task cannot depend on itself" });
      }

      // Update this task's prerequisite list
      const currentPrereqs = task.prerequisiteTaskIds || [];
      if (!currentPrereqs.includes(prerequisiteId)) {
        const updatedTask = await storage.updateTask(taskId, {
          prerequisiteTaskIds: [...currentPrereqs, prerequisiteId]
        });

        // Update the prerequisite task's dependent list
        const currentDependents = prerequisiteTask.dependentTaskIds || [];
        if (!currentDependents.includes(taskId)) {
          await storage.updateTask(prerequisiteId, {
            dependentTaskIds: [...currentDependents, taskId]
          });
        }

        res.json(updatedTask);
      } else {
        // Dependency already exists
        res.json(task);
      }
    } catch (error) {
      console.error("Error adding task dependency:", error);
      res.status(500).json({ 
        message: "Failed to add task dependency", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Remove task dependency
  app.delete("/api/tasks/:id/dependencies/:prerequisiteId", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const taskId = req.params.id;
      const { prerequisiteId } = req.params;

      // Check if the task exists
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check if the prerequisite task exists
      const prerequisiteTask = await storage.getTask(prerequisiteId);
      if (!prerequisiteTask) {
        return res.status(404).json({ message: "Prerequisite task not found" });
      }

      // Verify tasks' boards belong to user
      const board = await storage.getBoard(String(task.boardId));

      if (!board || board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Remove prerequisiteId from task's prerequisiteTaskIds
      if (task.prerequisiteTaskIds && task.prerequisiteTaskIds.includes(prerequisiteId)) {
        const updatedPrereqs = task.prerequisiteTaskIds.filter(id => id !== prerequisiteId);
        await storage.updateTask(taskId, {
          prerequisiteTaskIds: updatedPrereqs
        });
      }

      // Remove taskId from prerequisiteTask's dependentTaskIds
      if (prerequisiteTask.dependentTaskIds && prerequisiteTask.dependentTaskIds.includes(taskId)) {
        const updatedDependents = prerequisiteTask.dependentTaskIds.filter(id => id !== taskId);
        await storage.updateTask(prerequisiteId, {
          dependentTaskIds: updatedDependents
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error removing task dependency:", error);
      res.status(500).json({ 
        message: "Failed to remove task dependency", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Get AI recommendations for a task
  app.get("/api/tasks/:id/recommendations", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const taskId = req.params.id;
      const task = await storage.getTask(taskId);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Verify task's board belongs to user
      const board = await storage.getBoard(String(task.boardId));
      if (!board || board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const recommendations = await getTaskRecommendations({
        id: String(task.id),
        title: task.title,
        description: task.description || "",
        dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : null,
        assignee: task.assignee,
        priority: task.priority,
        status: task.status
      });

      res.json(recommendations);
    } catch (error) {
      console.error("Error getting task recommendations:", error);
      res.status(500).json({ 
        message: "Failed to get recommendations", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Get task dependency graph for a board
  app.get("/api/boards/:id/dependency-graph", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const boardId = req.params.id;

      // Verify board belongs to user
      const board = await storage.getBoard(boardId);

      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }

      if (board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get all tasks for the board
      const tasks = await storage.getTasksByBoardId(boardId);

      // Create a graph structure
      const graph = {
        nodes: tasks.map(task => ({
          id: String(task.id),
          label: task.title,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          assignee: task.assignee,
        })),
        links: []
      };

      // Add link for each dependency
      for (const task of tasks) {
        if (task.prerequisiteTaskIds && task.prerequisiteTaskIds.length > 0) {
          for (const prerequisiteId of task.prerequisiteTaskIds) {
            // Check if the prerequisite task exists in this board
            if (tasks.some(t => String(t.id) === prerequisiteId)) {
              graph.links.push({
                source: prerequisiteId,
                target: String(task.id),
                type: "dependency"
              });
            }
          }
        }
      }

      res.json(graph);
    } catch (error) {
      console.error("Error generating dependency graph:", error);
      res.status(500).json({ 
        message: "Failed to generate dependency graph", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
}