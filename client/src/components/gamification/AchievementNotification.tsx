import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AchievementBadge from "./AchievementBadge";
import { 
  Award, 
  Check, 
  Star, 
  Zap, 
  Trophy, 
  Target, 
  Medal, 
  Flame, 
  Sparkles,
  Bot,
  Calendar
} from "lucide-react";
import confetti from "canvas-confetti";

interface AchievementNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: {
    id: number;
    name: string;
    description: string;
    icon: string;
    type: string;
    level: number;
    earnedAt: Date;
  } | null;
}

export default function AchievementNotification({
  isOpen,
  onClose,
  achievement,
}: AchievementNotificationProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && achievement && dialogRef.current) {
      // Show celebration animation
      const rect = dialogRef.current.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x, y },
        colors: ['#5E35B1', '#3F51B5', '#2196F3', '#00BCD4', '#009688'],
      });
    }
  }, [isOpen, achievement]);

  if (!achievement) return null;
    
  // Set badge level styles
  const levelLabel = {
    1: "Bronze",
    2: "Silver",
    3: "Gold",
  }[achievement.level] || "Bronze";

  // Get points icon based on achievement icon name
  const renderPointsIcon = () => {
    const iconName = achievement?.icon || "";
    const iconClass = "mr-2 h-4 w-4 text-primary";
    
    switch (iconName) {
      case "Check":
        return <Check className={iconClass} />;
      case "Star":
        return <Star className={iconClass} />;
      case "Zap":
        return <Zap className={iconClass} />;
      case "Trophy":
        return <Trophy className={iconClass} />;
      case "Target":
        return <Target className={iconClass} />;
      case "Medal":
        return <Medal className={iconClass} />;
      case "Flame":
        return <Flame className={iconClass} />;
      case "Sparkles":
        return <Sparkles className={iconClass} />;
      case "Bot":
        return <Bot className={iconClass} />;
      case "Calendar":
        return <Calendar className={iconClass} />;
      default:
        return <Award className={iconClass} />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={dialogRef}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Achievement Unlocked!
          </DialogTitle>
          <DialogDescription className="text-center">
            You've earned a new achievement badge.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-24 h-24">
            <AchievementBadge 
              badge={{...achievement, earned: true}} 
              size="lg" 
              showTooltip={false} 
            />
          </div>
          <h3 className="mt-4 text-xl font-bold">{achievement.name}</h3>
          <span className="text-sm text-muted-foreground">
            {levelLabel} Badge
          </span>
          <p className="mt-2 text-center text-sm">
            {achievement.description}
          </p>
          
          <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-muted">
            {renderPointsIcon()}
            <span className="text-sm">+25 points</span>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}