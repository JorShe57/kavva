import OpenAI from "openai";
import type { Express } from "express";
import { storage } from "./storage";
import { Task } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Interface for workflow data
interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  resources?: { title: string; url: string }[];
  tips?: string[];
  completed: boolean;
}

interface WorkflowData {
  taskId: string;
  title: string;
  description: string;
  steps: WorkflowStep[];
  insights: string[];
  similarTasks?: { title: string; similarity: number }[];
  estimatedTotalTime: string;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export function setupAIChatRoutes(app: Express) {
  // AI Workflow Generator endpoint
  app.post("/api/ai/generate-workflow", async (req, res) => {
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

      // Fetch all tasks for the user to find similar tasks
      const userBoards = await storage.getBoardsByUserId((req.user as any).id);
      let allUserTasks: Task[] = [];
      
      for (const userBoard of userBoards) {
        const boardTasks = await storage.getTasksByBoardId(String(userBoard.id));
        allUserTasks = [...allUserTasks, ...boardTasks];
      }
      
      // Filter out the current task and limit to 10 tasks for context
      const otherTasks = allUserTasks
        .filter(t => t.id !== task.id)
        .slice(0, 10)
        .map(t => ({
          id: String(t.id),
          title: t.title,
          description: t.description || "",
          status: t.status,
          priority: t.priority
        }));

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
You are an AI workflow assistant helping the user (${(req.user as any).username}) plan and execute their task.
You have access to the following task information:
${taskContext}

${task.emailSource ? `Additional context from email:\n${task.emailSource}` : ""}

${otherTasks.length > 0 ? `
Other tasks the user has worked on:
${otherTasks.map(t => `- ${t.title}: ${t.description.substring(0, 100)}${t.description.length > 100 ? '...' : ''}`).join('\n')}
` : ''}

Create a comprehensive workflow plan for this task that includes:
1. A clear title for the workflow
2. A detailed description of the overall approach
3. A step-by-step breakdown with 4-8 concrete steps
4. For each step, include:
   - A clear title
   - A detailed description
   - Estimated time to complete
   - Helpful tips
   - Relevant resources (if applicable)
5. Overall insights about the task
6. If possible, identify similar tasks from the user's task history and calculate a similarity score (0.0-1.0)
7. Estimate the total time required to complete the entire workflow

Format your response as a JSON object with the following structure:
{
  "taskId": "string",
  "title": "string",
  "description": "string",
  "steps": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "estimatedTime": "string",
      "resources": [{"title": "string", "url": "string"}],
      "tips": ["string"],
      "completed": false
    }
  ],
  "insights": ["string"],
  "similarTasks": [{"title": "string", "similarity": number}],
  "estimatedTotalTime": "string"
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemInstruction }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }
      
      // Parse the response and ensure it has the correct structure
      const workflowData: WorkflowData = JSON.parse(content);
      
      // Ensure the taskId is set correctly
      workflowData.taskId = taskId;
      
      // Ensure all steps have an id and completed status
      workflowData.steps = workflowData.steps.map((step, index) => ({
        ...step,
        id: step.id || `step-${index + 1}-${Date.now()}`,
        completed: false
      }));
      
      res.json(workflowData);
    } catch (error) {
      console.error("Error generating workflow:", error);
      res.status(500).json({ 
        message: "Failed to generate workflow", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  // AI Chat endpoint
  app.post("/api/ai/chat", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { message, messages, taskId } = req.body;
      
      // Handle both new format (single message) and old format (messages array)
      let processedMessages: any[] = [];
      
      if (message) {
        // New format: Single message string
        processedMessages = [{
          role: "user",
          content: message,
          timestamp: new Date()
        }];
      } else if (Array.isArray(messages) && messages.length > 0) {
        // Old format: Array of messages
        processedMessages = messages;
      } else {
        return res.status(400).json({ message: "Either message or messages are required" });
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
        ...processedMessages.map((msg: Message) => ({
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
