import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Task } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  ListChecks, 
  Lightbulb, 
  FileText, 
  CheckCircle, 
  Info, 
  Bot, 
  ExternalLink,
  Clock,
  Calendar,
  PlusCircle,
  Link as LinkIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

type MessageRole = "user" | "assistant" | "system";

interface Message {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export default function AIAssistant() {
  const { taskId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch task details if taskId is provided
  const { data: task, isLoading: isLoadingTask } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const response = await fetch(`/api/tasks/${taskId}`);
      if (!response.ok) throw new Error("Failed to fetch task");
      return response.json() as Promise<Task>;
    },
    enabled: !!taskId,
  });

  // Initialize chat with context if task is provided
  useEffect(() => {
    if (task && messages.length === 0) {
      // Generate a welcome message with task context
      const systemMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Hello! I'm your AI assistant for task: "${task.title}". 
        
I can help you with recommendations, research, draft emails, or even complete simple tasks for you. What would you like help with?`,
        timestamp: new Date(),
      };
      
      setMessages([systemMessage]);
    } else if (!taskId && messages.length === 0) {
      // Generic welcome message if no specific task
      const systemMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Hello! I'm your AI assistant. I can help with task recommendations, research, drafting emails, or completing simple tasks for you. How can I help today?",
        timestamp: new Date(),
      };
      
      setMessages([systemMessage]);
    }
  }, [task, taskId]);

  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus the input when the component loads
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Add user message to the chat
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);
    
    try {
      // Prepare chat history for the API
      const chatHistory: Message[] = messages
        .filter(msg => msg.role !== "system")
        .map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }));
      
      // Add the new user message
      chatHistory.push({
        role: "user",
        content: inputValue,
        timestamp: new Date()
      });
      
      // Call API with task context if available
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: chatHistory,
          taskId: taskId || null,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }
      
      const data = await response.json();
      
      // Add AI response to the chat
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error in AI chat:", error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Task selection and workspace state
  const [activeTaskId, setActiveTaskId] = useState<string | null>(taskId || null);
  const [workNotes, setWorkNotes] = useState<string>("");
  const [taskSteps, setTaskSteps] = useState<string[]>([]);
  const [taskSuggestions, setTaskSuggestions] = useState<string[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [customStepInput, setCustomStepInput] = useState<string>("");
  const [taskProgress, setTaskProgress] = useState<number>(0);
  const [relatedResources, setRelatedResources] = useState<{title: string, url: string}[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  // Fetch all tasks for task selection
  const { data: allTasks, isLoading: isLoadingAllTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error("Failed to fetch tasks");
      return response.json() as Promise<Task[]>;
    },
  });
  
  // Fetch related tasks
  const { data: relatedTasksData, isLoading: isLoadingRelatedTasks } = useQuery({
    queryKey: ["related-tasks", activeTaskId],
    queryFn: async () => {
      if (!activeTaskId) return [];
      // In a real implementation, this would fetch tasks related to the current task
      // For now, we'll filter tasks that might be related based on title/description similarity
      
      if (!allTasks) return [];
      
      const activeTask = allTasks.find(t => t.id === Number(activeTaskId));
      if (!activeTask) return [];
      
      // Find tasks that might be related based on keywords in the title or description
      return allTasks.filter(t => {
        if (t.id.toString() === activeTaskId) return false;
        
        const titleMatch = t.title.toLowerCase().includes(activeTask.title.toLowerCase()) || 
                          activeTask.title.toLowerCase().includes(t.title.toLowerCase());
        
        const descMatch = t.description && activeTask.description && 
                          (t.description.toLowerCase().includes(activeTask.description.toLowerCase()) || 
                          activeTask.description.toLowerCase().includes(t.description.toLowerCase()));
        
        return titleMatch || descMatch;
      }).slice(0, 3); // Limit to 3 related tasks
    },
    enabled: !!activeTaskId && !!allTasks
  });
  
  // Update linked tasks when related tasks data changes
  useEffect(() => {
    if (relatedTasksData) {
      setLinkedTasks(relatedTasksData);
    }
  }, [relatedTasksData]);
  
  // Calculate task progress based on completed steps
  useEffect(() => {
    if (taskSteps.length === 0) {
      setTaskProgress(0);
    } else {
      const progress = (completedSteps.size / taskSteps.length) * 100;
      setTaskProgress(progress);
    }
  }, [completedSteps, taskSteps]);
  
  // Auto-generate notes, suggestions, and resources when task is selected
  useEffect(() => {
    if (task && task.description) {
      // Generate task-specific steps based on task content
      let generatedSteps: string[] = [];
      
      if (task.title.toLowerCase().includes("review") || task.title.toLowerCase().includes("analyze")) {
        generatedSteps = [
          "Review task requirements and details",
          "Identify key points and questions",
          "Research any unclear concepts",
          "Analyze findings and note observations",
          "Compile feedback or recommendations",
          "Finalize review and submit conclusions"
        ];
      } else if (task.title.toLowerCase().includes("create") || task.title.toLowerCase().includes("develop")) {
        generatedSteps = [
          "Define requirements and scope",
          "Research best practices and examples",
          "Create initial draft or prototype",
          "Test functionality and gather feedback",
          "Revise based on feedback",
          "Finalize and deliver the completed work"
        ];
      } else if (task.title.toLowerCase().includes("plan") || task.title.toLowerCase().includes("schedule")) {
        generatedSteps = [
          "Define goals and objectives",
          "Identify required resources and constraints",
          "Create timeline and milestone schedule",
          "Assign responsibilities and tasks",
          "Establish tracking and reporting mechanisms",
          "Finalize plan and distribute to stakeholders"
        ];
      } else {
        // Default steps
        generatedSteps = [
          "Review task requirements and details",
          "Gather necessary resources and information",
          "Outline approach and strategy",
          "Execute the main task components",
          "Test and validate results",
          "Finalize and submit completed work"
        ];
      }
      
      setTaskSteps(generatedSteps);
      
      // Set initial work notes with enhanced template
      setWorkNotes(`# Working on: ${task.title}\n\n## Objective\n${task.description || "No description provided"}\n\n## Notes\n- `);
      
      // Task-specific suggestions based on task content
      let suggestions: string[] = [];
      
      if (task.priority === "high") {
        suggestions.push("Focus on this high-priority task before others");
        suggestions.push("Consider breaking this down into smaller, manageable subtasks");
      }
      
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 3) {
          suggestions.push(`Urgent: Only ${diffDays} day${diffDays !== 1 ? 's' : ''} remaining until deadline`);
        }
      }
      
      // Add general suggestions
      suggestions = [
        ...suggestions,
        "Break down this task into smaller components",
        "Research similar approaches or best practices",
        "Consider setting milestone deadlines for each step",
        "Document your progress as you complete each step"
      ];
      
      setTaskSuggestions(suggestions);
      
      // Add related resources based on task content
      let resources: {title: string, url: string}[] = [];
      
      if (task.title.toLowerCase().includes("email") || task.description?.toLowerCase().includes("email")) {
        resources.push({
          title: "Email Writing Best Practices",
          url: "https://www.grammarly.com/blog/email-writing-tips/"
        });
      }
      
      if (task.title.toLowerCase().includes("review") || task.description?.toLowerCase().includes("review")) {
        resources.push({
          title: "Effective Code Review Guidelines",
          url: "https://google.github.io/eng-practices/review/"
        });
      }
      
      if (task.title.toLowerCase().includes("presentation") || task.description?.toLowerCase().includes("presentation")) {
        resources.push({
          title: "Creating Effective Presentations",
          url: "https://www.skillsyouneed.com/present/presentation-tips.html"
        });
      }
      
      setRelatedResources(resources);
    }
  }, [task]);
  
  // Handle adding custom steps
  const addCustomStep = () => {
    if (customStepInput.trim()) {
      setTaskSteps(prev => [...prev, customStepInput]);
      setCustomStepInput("");
    }
  };
  
  const toggleStepCompletion = (index: number) => {
    const updatedSteps = new Set(completedSteps);
    if (updatedSteps.has(index)) {
      updatedSteps.delete(index);
    } else {
      updatedSteps.add(index);
    }
    setCompletedSteps(updatedSteps);
  };
  
  const handleTaskSelection = (id: string) => {
    setActiveTaskId(id);
    setLocation(`/ai-assistant/${id}`);
  };

  return (
    <div className="container mx-auto py-4 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">AI Workspace</h1>
          {task && (
            <p className="text-muted-foreground mt-1">
              Working on: {task.title}
            </p>
          )}
        </div>
        
        <Button
          variant="outline"
          onClick={() => setLocation('/')}
        >
          Back to Dashboard
        </Button>
      </div>
      
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-10rem)]">
        {/* Left Sidebar - Task Selection */}
        <div className="col-span-3 bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 bg-muted font-medium flex items-center">
            <ListChecks className="h-5 w-5 mr-2" />
            <h3>My Tasks</h3>
          </div>
          <ScrollArea className="h-[calc(100%-3rem)] p-2">
            {isLoadingAllTasks ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {allTasks?.map((t) => (
                  <Button
                    key={t.id}
                    variant={activeTaskId === t.id.toString() ? "default" : "ghost"}
                    className="w-full justify-start text-left h-auto py-2 px-3"
                    onClick={() => handleTaskSelection(t.id.toString())}
                  >
                    <div>
                      <div className="font-medium truncate">{t.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.status} • {t.priority}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        
        {/* Main Workspace Area */}
        <div className="col-span-6 bg-card rounded-lg border shadow-sm overflow-hidden flex flex-col">
          <Tabs defaultValue="chat" className="flex flex-col h-full">
            <div className="p-1 px-3 bg-muted border-b">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="chat" className="text-xs">
                  <Bot className="h-4 w-4 mr-1" /> AI Chat
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-xs">
                  <FileText className="h-4 w-4 mr-1" /> Work Notes
                </TabsTrigger>
                <TabsTrigger value="steps" className="text-xs">
                  <CheckCircle className="h-4 w-4 mr-1" /> Task Steps
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col m-0 border-none p-0">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 mb-4">
                  {isLoadingTask ? (
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="ml-4 space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[400px]" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {message.role !== "user" && (
                          <Avatar className="h-10 w-10">
                            <AvatarImage src="/ai-avatar.svg" alt="AI" />
                            <AvatarFallback>AI</AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div
                          className={`mx-2 rounded-lg p-4 max-w-[80%] ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground ml-auto"
                              : "bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs mt-2 opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        
                        {message.role === "user" && (
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>ME</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))
                  )}
                  
                  {isProcessing && (
                    <div className="flex items-start">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="/ai-avatar.svg" alt="AI" />
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                      <div className="mx-2 rounded-lg p-4 bg-muted max-w-[80%]">
                        <div className="flex space-x-2">
                          <div className="h-3 w-3 bg-foreground/40 rounded-full animate-bounce"></div>
                          <div className="h-3 w-3 bg-foreground/40 rounded-full animate-bounce delay-150"></div>
                          <div className="h-3 w-3 bg-foreground/40 rounded-full animate-bounce delay-300"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              <div className="p-3 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex w-full items-center space-x-2"
                >
                  <Input
                    ref={inputRef}
                    placeholder="Type your message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                    disabled={isProcessing}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!inputValue.trim() || isProcessing}
                  >
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </form>
              </div>
            </TabsContent>
            
            {/* Work Notes Tab */}
            <TabsContent value="notes" className="flex-1 flex flex-col m-0 border-none p-3">
              <div className="flex-1">
                <Textarea 
                  placeholder="Add your work notes here..."
                  className="h-full resize-none"
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                />
              </div>
            </TabsContent>
            
            {/* Task Steps Tab */}
            <TabsContent value="steps" className="flex-1 flex flex-col m-0 border-none">
              {task && (
                <div className="flex items-center justify-between p-3 border-b">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">Task Completion</h4>
                    <div className="flex items-center gap-2">
                      <Progress value={taskProgress} className="w-32 h-2" />
                      <span className="text-xs text-muted-foreground">{Math.round(taskProgress)}%</span>
                    </div>
                  </div>
                  <Badge variant={task.status === "completed" ? "default" : "outline"}>
                    {task.status}
                  </Badge>
                </div>
              )}
              
              <div className="p-3 border-b">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add a custom step..."
                    value={customStepInput}
                    onChange={(e) => setCustomStepInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customStepInput.trim()) {
                        e.preventDefault();
                        addCustomStep();
                      }
                    }}
                  />
                  <Button 
                    size="sm"
                    variant="secondary"
                    onClick={addCustomStep}
                    disabled={!customStepInput.trim()}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {taskSteps.map((step, index) => (
                    <div 
                      key={index} 
                      className="flex items-start space-x-2 p-3 rounded-md border bg-background hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => toggleStepCompletion(index)}
                    >
                      <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center border ${
                        completedSteps.has(index) ? "bg-primary" : "bg-muted"
                      }`}>
                        {completedSteps.has(index) && (
                          <CheckCircle className="h-4 w-4 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`${completedSteps.has(index) ? "line-through text-muted-foreground" : ""}`}>
                          {step}
                        </div>
                        {completedSteps.has(index) && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Completed
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {taskSteps.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No steps defined yet</p>
                      <p className="text-sm">Add a custom step or select a task to get started</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Right Sidebar - Task Info & Suggestions */}
        <div className="col-span-3 bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 bg-muted font-medium flex items-center">
            <Info className="h-5 w-5 mr-2" />
            <h3>Task Details</h3>
          </div>
          <ScrollArea className="h-[calc(100%-3rem)]">
            {task ? (
              <div className="p-4 space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={task.priority === "high" ? "destructive" : 
                                     task.priority === "medium" ? "default" : "secondary"}>
                        {task.priority}
                      </Badge>
                      <Badge variant="outline">{task.status}</Badge>
                    </div>
                    
                    {task.dueDate && (
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    {task.assignee && (
                      <div className="flex items-center text-muted-foreground">
                        <Avatar className="h-4 w-4 mr-2">
                          <AvatarFallback className="text-[8px]">{task.assignee.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span>Assigned to: {task.assignee}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">{task.description}</p>
                </div>
                
                {linkedTasks.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center mb-2">
                        <LinkIcon className="h-4 w-4 mr-2 text-blue-500" />
                        <h4 className="font-semibold">Related Tasks</h4>
                      </div>
                      <div className="space-y-2">
                        {linkedTasks.map((relatedTask) => (
                          <Button
                            key={relatedTask.id}
                            variant="outline"
                            className="w-full justify-start text-left h-auto py-2 px-3"
                            onClick={() => handleTaskSelection(relatedTask.id.toString())}
                          >
                            <div>
                              <div className="font-medium text-sm truncate">{relatedTask.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {relatedTask.status} • {relatedTask.priority}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                <Separator />
                
                <div>
                  <div className="flex items-center mb-2">
                    <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" />
                    <h4 className="font-semibold">AI Suggestions</h4>
                  </div>
                  <div className="space-y-2">
                    {taskSuggestions.map((suggestion, index) => (
                      <div key={index} className="text-sm p-2 bg-muted rounded-md">
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
                
                {relatedResources.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center mb-2">
                        <ExternalLink className="h-4 w-4 mr-2 text-blue-500" />
                        <h4 className="font-semibold">Related Resources</h4>
                      </div>
                      <div className="space-y-2">
                        {relatedResources.map((resource, index) => (
                          <a 
                            key={index} 
                            href={resource.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center p-2 text-sm bg-muted rounded-md hover:bg-accent group"
                          >
                            <span className="flex-1 truncate">{resource.title}</span>
                            <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <div className="py-8">
                  <Info className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Select a task to view details</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}