import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, Lightbulb, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: TaskSummaryData | null;
  loading: boolean;
}

export interface TaskSummaryData {
  summary: string;
  insights: string[];
  actionItems: string[];
  overallProgress: number;
  taskCount: number;
}

export default function TaskSummaryModal({
  isOpen,
  onClose,
  summary,
  loading,
}: TaskSummaryModalProps) {
  const { toast } = useToast();

  const handleCopyToClipboard = () => {
    if (!summary) return;

    const summaryText = `
Task Summary:
${summary.summary}

Insights:
${summary.insights.map(insight => `- ${insight}`).join('\n')}

Action Items:
${summary.actionItems.map(item => `- ${item}`).join('\n')}

Overall Progress: ${summary.overallProgress}%
`;

    navigator.clipboard.writeText(summaryText.trim());
    toast({
      title: "Summary copied to clipboard",
      description: "You can now paste it anywhere you need",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI Task Summary
            </span>
          </DialogTitle>
          <DialogDescription>
            {summary ? `Summary of ${summary.taskCount} tasks` : "Loading task data..."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground text-sm">
              AI is analyzing your tasks...
            </p>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Overall Progress</h3>
                <span className="text-sm font-medium">
                  {summary.overallProgress}%
                </span>
              </div>
              <Progress
                value={summary.overallProgress}
                className="h-2"
              />
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm leading-relaxed">{summary.summary}</p>
            </div>

            {/* Insights */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Insights
              </h3>
              <ul className="space-y-2">
                {summary.insights.map((insight, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm leading-relaxed"
                  >
                    <Badge variant="outline" className="mt-0.5">
                      {index + 1}
                    </Badge>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Items */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Action Items
              </h3>
              <ul className="space-y-2">
                {summary.actionItems.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm leading-relaxed bg-muted/30 p-2 rounded-md"
                  >
                    <ArrowRight className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground">
            No summary available
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="mt-2 sm:mt-0"
          >
            Close
          </Button>
          <Button
            onClick={handleCopyToClipboard}
            disabled={loading || !summary}
            className="mt-2 sm:mt-0"
          >
            Copy to Clipboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}