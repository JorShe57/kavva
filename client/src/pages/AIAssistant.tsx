import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Task } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
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

  return (
    <div className="container mx-auto py-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          {task && (
            <p className="text-muted-foreground mt-1">
              Working on: {task.title}
            </p>
          )}
        </div>
        
        {taskId && (
          <Button
            variant="outline"
            onClick={() => setLocation('/')}
          >
            Back to Tasks
          </Button>
        )}
      </div>
      
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle>AI Task Assistant</CardTitle>
          <CardDescription>
            Ask for recommendations, research information, or help with completing your tasks
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
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
        </CardContent>
        
        <CardFooter className="pt-0">
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
        </CardFooter>
      </Card>
    </div>
  );
}