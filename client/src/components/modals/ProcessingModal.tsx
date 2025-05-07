import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface ProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProcessingModal({ isOpen, onClose }: ProcessingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Processing Tasks</DialogTitle>
        <DialogDescription>Please wait while we process your request...</DialogDescription>
        <div className="py-4">
          <Progress value={33} className="w-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
}