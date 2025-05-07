import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface ProcessingModalProps {
  isOpen: boolean;
  progress: number;
  onCancel: () => void;
}

export default function ProcessingModal({ isOpen, progress, onCancel }: ProcessingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center">
          <div className="inline-block rounded-full bg-primary/10 p-4 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"></path>
              <path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"></path>
              <path d="M19 11h2m-1 -1v2"></path>
            </svg>
          </div>
          
          <h3 className="text-lg font-semibold text-foreground mb-2">Processing Email</h3>
          <p className="text-muted-foreground mb-4">AI is analyzing your email to extract tasks, deadlines, and assignees...</p>
          
          <div className="w-full mb-2">
            <Progress value={progress} className="h-2" />
          </div>
          
          <p className="text-xs text-muted-foreground mb-4">This usually takes 5-10 seconds</p>
          
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
