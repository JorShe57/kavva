import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ProcessEmailOptions {
  assignmentOption: string;
  username: string;
}

interface TaskOutput {
  id?: string;
  title: string;
  description: string;
  dueDate: string | null;
  assignee: string | null;
  priority: string;
  status: string;
}

export async function processEmailWithAI(emailContent: string, options: ProcessEmailOptions): Promise<TaskOutput[]> {
  try {
    if (!emailContent || emailContent.trim() === "") {
      console.error("No email content provided");
      return [];
    }

    const { assignmentOption, username } = options;
    
    // Test if we can access the OpenAI API
    console.log("Testing OpenAI API access...");
    
    // Create a much simpler prompt focused on task extraction
    const prompt = `
Extract tasks from this email:

"""
${emailContent}
"""

Format each task with these fields:
- title: short name of the task
- description: details of what needs to be done
- dueDate: when it's due (YYYY-MM-DD format, or null if not specified)
- assignee: ${assignmentOption === 'assignToMe' ? username : assignmentOption === 'leaveUnassigned' ? 'null' : 'name of person if mentioned'}
- priority: "high", "medium", or "low" based on urgency

Return ONLY a valid JSON array of tasks with NO additional explanation.
Example: 
[
  {
    "title": "Create presentation",
    "description": "Prepare slides for client meeting",
    "dueDate": "2023-05-15",
    "assignee": "John",
    "priority": "high"
  }
]
`;

    console.log("Sending to OpenAI:", prompt.substring(0, 200) + "...");
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const content = response.choices[0].message.content || "";
      console.log("OpenAI raw response:", content);
      
      // Try to parse the response as JSON
      let tasks: TaskOutput[] = [];
      
      try {
        // Check if the response is already a JSON array
        if (content.trim().startsWith('[') && content.trim().endsWith(']')) {
          tasks = JSON.parse(content);
        } else {
          // Try to extract JSON from the response - using a simpler regex without the 's' flag
          const jsonMatch = content.match(/\[[\s\S]*\{[\s\S]*\}[\s\S]*\]/);
          if (jsonMatch) {
            tasks = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError);
        return [];
      }
      
      // Process the extracted tasks
      if (Array.isArray(tasks) && tasks.length > 0) {
        return tasks.map(task => ({
          ...task,
          id: `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          status: "todo",
          dueDate: task.dueDate || null,
          assignee: task.assignee || null
        }));
      }
      
      console.log("No tasks found in the response");
      return [];
    } catch (apiError) {
      console.error("OpenAI API error:", apiError);
      
      // For testing/fallback, create a dummy task
      console.log("Creating a test task for development purposes");
      return [{
        id: `temp-${Date.now()}`,
        title: "Test Task",
        description: "This is a test task created by the system when AI processing failed",
        dueDate: new Date().toISOString().split('T')[0],
        assignee: username,
        priority: "medium",
        status: "todo"
      }];
    }
  } catch (error) {
    console.error("General error in processEmailWithAI:", error);
    throw new Error(`Failed to process email with AI: ${error instanceof Error ? error.message : String(error)}`);
  }
}
