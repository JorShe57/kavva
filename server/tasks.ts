import type { Express } from "express";
import { storage } from "./storage";
import { processEmailWithAI, summarizeTasksWithAI } from "./openai";
import { insertTaskSchema } from "@shared/schema";
import { TaskOutput } from "./openai";

export function setupTaskRoutes(app: Express) {
  // Get tasks for a board
  app.get("/api/tasks", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const boardId = req.query.boardId as string;
      
      if (!boardId) {
        return res.status(400).json({ message: "Board ID is required" });
      }
      
      // Verify board belongs to user
      const board = await storage.getBoard(boardId);
      
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }
      
      if (board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const tasks = await storage.getTasksByBoardId(boardId);
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
      res.status(500).json({ message: "Failed to update task" });
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
}