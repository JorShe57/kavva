import OpenAI from "openai";
import type { Express } from "express";
import { storage } from "./storage";
import { Task } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export function setupAIChatRoutes(app: Express) {
  // AI Chat endpoint
  app.post("/api/ai/chat", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { messages, taskId } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "Messages are required" });
      }

      // Fetch task context if taskId is provided
      let taskContext = "";
      let task: Task | undefined;
      
      if (taskId) {
        task = await storage.getTask(taskId);
        
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }
        
        // Verify task belongs to the user
        const board = await storage.getBoard(String(task.boardId));
        
        if (!board || board.userId !== (req.user as any).id) {
          return res.status(403).json({ message: "Forbidden" });
        }
        
        // Generate task context
        taskContext = `
Task Context:
- Title: ${task.title}
- Description: ${task.description || "No description provided"}
- Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}
- Status: ${task.status}
- Priority: ${task.priority}
- Assignee: ${task.assignee || "Unassigned"}
`;

        if (task.emailSource) {
          taskContext += `
Email Source Context:
${task.emailSource}
`;
        }
      }

      const username = (req.user as any).username;
      
      // Prepare system message with instructions
      const systemInstruction = `
You are an AI task assistant helping the user (${username}) with their tasks.
${taskContext ? "You have access to the following task information:\n" + taskContext : ""}

Your capabilities include:
1. Providing recommendations on how to complete tasks effectively
2. Breaking down tasks into manageable steps
3. Researching information related to the task
4. Drafting emails, reports, or other content related to the task
5. Suggesting approaches to complete tasks more efficiently

Be helpful, specific, and practical with your advice. When possible, provide actionable steps.
If the user asks you to complete a task that requires external action, explain what steps would be needed.
`;

      // Format conversation history for OpenAI API
      const formattedMessages = [
        { role: "system" as const, content: systemInstruction },
        ...messages.map((msg: Message) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content
        }))
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }
      
      res.json({ response: content });
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ 
        message: "Failed to process chat request", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // AI task completion endpoint
  app.post("/api/ai/complete-task", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { taskId } = req.body;

      if (!taskId) {
        return res.status(400).json({ message: "Task ID is required" });
      }

      // Fetch task
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Verify task belongs to the user
      const board = await storage.getBoard(String(task.boardId));
      
      if (!board || board.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Generate task context
      const taskContext = `
Task Context:
- Title: ${task.title}
- Description: ${task.description || "No description provided"}
- Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}
- Status: ${task.status}
- Priority: ${task.priority}
- Assignee: ${task.assignee || "Unassigned"}
`;

      const systemInstruction = `
You are an AI task assistant helping the user (${(req.user as any).username}) complete their task.
You have access to the following task information:
${taskContext}

${task.emailSource ? `Additional context from email:\n${task.emailSource}` : ""}

Create a concise report on how you would complete this task, including:
1. A summary of the completed task
2. The approach you took
3. Any challenges and how they were addressed
4. Next steps or follow-up actions if applicable

Make this report as if you have just completed the task.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system" as const, content: systemInstruction }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }
      
      // Update task status to completed
      const completedTask = await storage.updateTask(taskId, {
        status: "completed",
        completedAt: new Date()
      });
      
      res.json({
        task: completedTask,
        completionReport: content
      });
    } catch (error) {
      console.error("Error in AI task completion:", error);
      res.status(500).json({ 
        message: "Failed to complete task", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
}