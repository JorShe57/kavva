import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-placeholder-key" });

interface ProcessEmailOptions {
  assignmentOption: string;
  username: string;
}

export async function processEmailWithAI(emailContent: string, options: ProcessEmailOptions) {
  try {
    const { assignmentOption, username } = options;
    
    const prompt = `
Extract tasks from the following email content. For each task, provide:
- Task title (short and actionable)
- Task description (detailed explanation)
- Due date (if mentioned, otherwise use a reasonable date based on context)
- Assignee (if mentioned, otherwise ${assignmentOption === 'assignToMe' ? `assign to "${username}"` : assignmentOption === 'leaveUnassigned' ? 'leave blank' : 'suggest an appropriate assignee'})
- Priority (high, medium, or low based on urgency indicated in the email)
- Status (always "todo" for new tasks)

Return the results in JSON format like this:
[
  {
    "id": "temp-1", // Temporary ID that can be replaced by the server
    "title": "Task title",
    "description": "Task description",
    "dueDate": "YYYY-MM-DD",
    "assignee": "Assignee name",
    "priority": "high|medium|low",
    "status": "todo"
  }
]

Email content:
${emailContent}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Ensure the result is an array
    if (!Array.isArray(result) && result.tasks && Array.isArray(result.tasks)) {
      return result.tasks;
    }
    
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw new Error("Failed to process email with AI");
  }
}
