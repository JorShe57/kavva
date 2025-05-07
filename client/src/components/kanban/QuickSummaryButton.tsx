import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuickSummaryButtonProps {
  boardId: string;
  onSummaryGenerated: (summary: any) => void;
  disabled?: boolean;
}

export default function QuickSummaryButton({
  boardId,
  onSummaryGenerated,
  disabled = false
}: QuickSummaryButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleGenerateSummary = async () => {
    if (!boardId) {
      toast({
        title: "Error",
        description: "No board selected",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/summarize-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardId
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to summarize tasks');
      }
      
      const summary = await response.json();
      
      // Call the parent component's callback
      onSummaryGenerated(summary);
      
      toast({
        title: "Success",
        description: "Task summary generated successfully",
      });
    } catch (error) {
      console.error('Error generating task summary:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate task summary",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-1 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/50"
      onClick={handleGenerateSummary}
      disabled={disabled || isLoading}
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span className="sr-only md:not-sr-only md:whitespace-nowrap">
        {isLoading ? "Generating..." : "Quick Summary"}
      </span>
    </Button>
  );
}