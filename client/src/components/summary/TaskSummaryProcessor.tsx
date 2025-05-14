import { useState } from "react";
import { TaskBoard, Task } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";

interface TaskSummaryProcessorProps {
  onSubmit: (boardId: string) => void;
  boards: TaskBoard[];
  disabled?: boolean;
}

export default function TaskSummaryProcessor({ onSubmit, boards, disabled = false }: TaskSummaryProcessorProps) {
  const [selectedBoard, setSelectedBoard] = useState("");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBoard) {
      alert("Please select a board");
      return;
    }
    
    onSubmit(selectedBoard);
  };
  
  return (
    <Card className="bg-white rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle>Generate AI Task Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <Label htmlFor="summary-board-select" className="block text-sm font-medium text-muted-foreground mb-2">
              Select Board to Summarize
            </Label>
            <Select
              value={selectedBoard}
              onValueChange={setSelectedBoard}
            >
              <SelectTrigger id="summary-board-select">
                <SelectValue placeholder="Select a board" />
              </SelectTrigger>
              <SelectContent>
                {boards.map((board) => (
                  <SelectItem key={board.id} value={board.id.toString()}>
                    {board.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Button 
              type="submit" 
              variant="default" 
              className="inline-flex items-center bg-gradient-to-br from-purple-600 to-blue-500 hover:opacity-90"
              disabled={disabled || !selectedBoard}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              <span>Generate Summary</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
