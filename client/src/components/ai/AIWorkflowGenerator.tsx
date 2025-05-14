import React, { useState } from "react";
import { Task } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
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
  Link as LinkIcon,
  Trophy,
  BarChart,
  Workflow,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIWorkflowGeneratorProps {
  task: Task | null;
  onWorkflowGenerated?: (workflow: WorkflowData) => void;
}

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  resources?: { title: string; url: string }[];
  tips?: string[];
  completed: boolean;
}

export interface WorkflowData {
  taskId: string;
  title: string;
  description: string;
  steps: WorkflowStep[];
  insights: string[];
  similarTasks?: { title: string; similarity: number }[];
  estimatedTotalTime: string;
}

export default function AIWorkflowGenerator({ task, onWorkflowGenerated }: AIWorkflowGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const generateWorkflow = async () => {
    if (!task) return;
    
    setIsGenerating(true);
    
    try {
      // Call the API to generate a workflow
      const response = await fetch(`/api/ai/generate-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: task.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate workflow");
      }
      
      const data = await response.json();
      setWorkflow(data);
      
      if (onWorkflowGenerated) {
        onWorkflowGenerated(data);
      }
      
      toast({
        title: "Workflow Generated",
        description: "Your AI workflow has been created successfully.",
      });
    } catch (error) {
      console.error("Error generating workflow:", error);
      toast({
        title: "Error",
        description: "Failed to generate workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStepCompletion = (stepId: string, completed: boolean) => {
    if (!workflow) return;
    
    const updatedSteps = workflow.steps.map(step => 
      step.id === stepId ? { ...step, completed } : step
    );
    
    setWorkflow({
      ...workflow,
      steps: updatedSteps
    });
  };

  if (!task) {
    return (
      <Card className="bg-white rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle>AI Workflow Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Workflow className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Select a task to generate a workflow</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-lg shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>AI Workflow Generator</CardTitle>
          {!workflow && !isGenerating && (
            <Button 
              onClick={generateWorkflow}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Workflow
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isGenerating ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
            <Skeleton className="h-[200px] w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : workflow ? (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{workflow.title}</h3>
              <p className="text-muted-foreground">{workflow.description}</p>
              <div className="flex items-center mt-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                <span>Estimated time: {workflow.estimatedTotalTime}</span>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">
                  <Info className="h-4 w-4 mr-1" /> Overview
                </TabsTrigger>
                <TabsTrigger value="steps">
                  <ListChecks className="h-4 w-4 mr-1" /> Steps
                </TabsTrigger>
                <TabsTrigger value="insights">
                  <Lightbulb className="h-4 w-4 mr-1" /> Insights
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Workflow Summary</h4>
                    <p className="text-sm">{workflow.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Key Steps</h4>
                    <div className="space-y-2">
                      {workflow.steps.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                          <Badge variant="outline" className="mr-2 w-6 h-6 flex items-center justify-center p-0">
                            {index + 1}
                          </Badge>
                          <span className="text-sm">{step.title}</span>
                          {index < workflow.steps.length - 1 && (
                            <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {workflow.similarTasks && workflow.similarTasks.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Similar Tasks</h4>
                      <div className="space-y-2">
                        {workflow.similarTasks.map((similarTask, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <span className="text-sm">{similarTask.title}</span>
                            <Badge variant="secondary">
                              {Math.round(similarTask.similarity * 100)}% similar
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="steps" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {workflow.steps.map((step, index) => (
                      <div 
                        key={step.id} 
                        className={`p-4 border rounded-lg ${
                          step.completed ? "bg-muted/50 border-muted" : "bg-card"
                        }`}
                      >
                        <div className="flex items-start">
                          <div 
                            className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center border ${
                              step.completed ? "bg-primary" : "bg-muted"
                            } cursor-pointer mr-3 mt-1`}
                            onClick={() => handleStepCompletion(step.id, !step.completed)}
                          >
                            {step.completed && (
                              <CheckCircle className="h-4 w-4 text-primary-foreground" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className={`font-medium ${step.completed ? "line-through text-muted-foreground" : ""}`}>
                                {index + 1}. {step.title}
                              </h4>
                              <Badge variant="outline" className="ml-2">
                                <Clock className="h-3 w-3 mr-1" />
                                {step.estimatedTime}
                              </Badge>
                            </div>
                            
                            <p className={`mt-1 text-sm ${step.completed ? "text-muted-foreground" : ""}`}>
                              {step.description}
                            </p>
                            
                            {step.tips && step.tips.length > 0 && (
                              <div className="mt-3">
                                <h5 className="text-sm font-medium mb-1">Tips:</h5>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {step.tips.map((tip, tipIndex) => (
                                    <li key={tipIndex}>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {step.resources && step.resources.length > 0 && (
                              <div className="mt-3">
                                <h5 className="text-sm font-medium mb-1">Resources:</h5>
                                <div className="space-y-1">
                                  {step.resources.map((resource, resourceIndex) => (
                                    <a 
                                      key={resourceIndex} 
                                      href={resource.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center text-sm text-blue-600 hover:underline"
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      {resource.title}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {!step.completed && (
                              <div className="mt-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                >
                                  <Bot className="h-3 w-3 mr-1" /> 
                                  Ask AI for help with this step
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="insights" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">AI Insights</h4>
                    <div className="space-y-2">
                      {workflow.insights.map((insight, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-start">
                            <Lightbulb className="h-5 w-5 mr-2 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{insight}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2">Progress Tracking</h4>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Completion Status</span>
                        <span className="text-sm">
                          {workflow.steps.filter(s => s.completed).length} of {workflow.steps.length} steps completed
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${(workflow.steps.filter(s => s.completed).length / workflow.steps.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Workflow className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Generate an AI workflow to break down this task into manageable steps</p>
            <p className="text-sm mt-2">The AI will analyze the task, gather data on similar tasks, and recommend a complete workflow</p>
            <Button 
              onClick={generateWorkflow}
              className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Workflow
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
