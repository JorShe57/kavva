import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
    
    const systemPrompt = `
You are an AI assistant that extracts tasks from emails. Your job is to carefully analyze the email content 
and identify any tasks, action items, or responsibilities mentioned. Follow these guidelines:

1. Extract ONLY tasks that need to be done (ignore completed tasks)
2. Create clear, actionable task titles
3. Include detailed descriptions with context from the email
4. Identify due dates when mentioned, or infer reasonable ones from context
5. Properly assign tasks based on the email context and assignment option
6. Determine priority based on urgency signals in the email (use "high", "medium", or "low")
7. Always set status to "todo" for new tasks
8. If there are no tasks to extract, return an empty array

Your response must be in this exact JSON format:
{
  "tasks": [
    {
      "title": "Task title here",
      "description": "Detailed description here",
      "dueDate": "YYYY-MM-DD",
      "assignee": "Person name",
      "priority": "high|medium|low",
      "status": "todo"
    }
  ]
}

If no tasks are found, return: { "tasks": [] }
`;

    const userPrompt = `
Extract all tasks from this email and format them according to the specified JSON structure.

Assignment preference: ${assignmentOption === 'assignToMe' ? `Assign to "${username}"` : assignmentOption === 'leaveUnassigned' ? 'Leave tasks unassigned' : 'Suggest appropriate assignees based on the email'}

EMAIL CONTENT:
${emailContent}
`;

    console.log("Sending email to OpenAI for processing...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error("OpenAI returned empty content");
      return [];
    }
    
    console.log("OpenAI response:", content);
    
    const result = JSON.parse(content);
    
    // Ensure the result has a tasks array
    if (result.tasks && Array.isArray(result.tasks)) {
      return result.tasks.map((task: TaskOutput) => ({
        ...task,
        id: `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Generate unique temporary IDs
        status: "todo" // Ensure status is set to todo
      }));
    }
    
    console.warn("OpenAI response did not contain a tasks array");
    return [];
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw new Error("Failed to process email with AI");
  }
}
