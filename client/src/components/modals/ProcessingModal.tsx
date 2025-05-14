import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export interface ProcessingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  progress?: number;
}

export default function ProcessingModal({ isOpen, onClose, onCancel, progress = 33 }: ProcessingModalProps) {
  // Use onCancel if provided, otherwise fall back to onClose
  const handleClose = onCancel || onClose;
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogTitle>Processing Tasks</DialogTitle>
        <DialogDescription>Please wait while we process your request...</DialogDescription>
        <div className="py-4">
          <Progress value={progress} className="w-full" />
          <div className="text-xs text-center mt-2 text-muted-foreground">
            {Math.round(progress)}% complete
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
