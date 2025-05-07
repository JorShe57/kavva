
import { useState, DragEvent } from "react";
import { TaskBoard } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EmailProcessorProps {
  onSubmit: (emailContent: string, boardId: string, assignmentOption: string) => void;
  boards: TaskBoard[];
}

export default function EmailProcessor({ onSubmit, boards }: EmailProcessorProps) {
  const [emailContent, setEmailContent] = useState("");
  const [selectedBoard, setSelectedBoard] = useState("");
  const [assignmentOption, setAssignmentOption] = useState("assignToMe");
  const [isDragging, setIsDragging] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailContent.trim()) {
      alert("Please enter email content");
      return;
    }
    
    if (!selectedBoard) {
      alert("Please select a board");
      return;
    }
    
    if (selectedBoard === "new") {
      alert("Create new board feature is coming soon. Please select an existing board.");
      return;
    }
    
    onSubmit(emailContent, selectedBoard, assignmentOption);
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    // Handle both dragged text and files
    if (e.dataTransfer.types.includes('text/plain')) {
      const text = e.dataTransfer.getData('text/plain');
      setEmailContent(text);
    } else if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/plain' || file.type === 'message/rfc822') {
        const text = await file.text();
        setEmailContent(text);
      }
    }
  };
  
  const handleClear = () => {
    setEmailContent("");
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle>Process Email for Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <Label htmlFor="email-content" className="block text-sm font-medium text-muted-foreground mb-2">
              Drag and drop email here
            </Label>
            <div 
              className={`min-h-[200px] border-2 border-dashed rounded-lg p-4 transition-colors ${
                isDragging ? 'border-primary bg-primary/10' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <textarea 
                id="email-content" 
                rows={6} 
                className="w-full h-full font-mono text-sm bg-transparent resize-none focus:outline-none" 
                placeholder="Drag and drop your email here or click to paste..."
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
              />
            </div>
          </div>
          
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="board-select" className="block text-sm font-medium text-muted-foreground mb-2">
                Add to Task Board
              </Label>
              <Select
                value={selectedBoard}
                onValueChange={setSelectedBoard}
              >
                <SelectTrigger id="board-select">
                  <SelectValue placeholder="Select a board" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id.toString()}>
                      {board.title}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">Create New Board</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="task-settings" className="block text-sm font-medium text-muted-foreground mb-2">
                Default Task Settings
              </Label>
              <Select
                value={assignmentOption}
                onValueChange={setAssignmentOption}
              >
                <SelectTrigger id="task-settings">
                  <SelectValue placeholder="Select assignment option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignToMe">Assign to me</SelectItem>
                  <SelectItem value="leaveUnassigned">Leave unassigned</SelectItem>
                  <SelectItem value="smartAssignment">Smart assignment (AI suggested)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClear}
            >
              Clear
            </Button>
            
            <Button 
              type="submit" 
              variant="default" 
              className="inline-flex items-center"
            >
              <span>Process with AI</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a1 1 0 0 1 .996.93l.018.188.001 2.688L15.293 3.3a1 1 0 0 1 1.403 0h.001a1 1 0 0 1 0 1.403h-.001l-3.276 3.276.114.012a7.5 7.5 0 0 1 6.286 6.177L20 14.998a1 1 0 1 1-2 .16l-.005-.16a5.487 5.487 0 0 0-4.825-4.994l-.169-.01L16.293 13.3a1 1 0 0 1 0 1.403l-.083.094a1 1 0 0 1-1.32.083l-2.889-2.3v2.229a1 1 0 0 1-1.993.117L10 14.811v-2.725l-3.293 3.29a1 1 0 0 1-1.403-1.404L8.58 10.7a5.5 5.5 0 0 0-4.066 3.939 1 1 0 0 1-1.934-.502A7.5 7.5 0 0 1 8.82 7.222l-3.114-3.116a1 1 0 0 1 1.403-1.419l.094.083 2.796 2.796V3a1 1 0 0 1 1-1z" />
              </svg>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
