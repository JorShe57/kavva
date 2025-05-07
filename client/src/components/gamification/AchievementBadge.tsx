import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Award, 
  Check, 
  Star, 
  Zap, 
  Trophy, 
  Target, 
  Badge, 
  Flame, 
  Sparkles,
  Bot,
  Calendar
} from "lucide-react";

interface AchievementBadgeProps {
  badge: {
    id: number;
    name: string;
    description: string;
    icon: string;
    type: string;
    level: number;
    earned?: boolean;
    earnedAt?: Date;
  };
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

export default function AchievementBadge({ 
  badge, 
  size = "md", 
  showTooltip = true 
}: AchievementBadgeProps) {
  // Get icon component based on icon name
  const renderIcon = () => {
    const iconName = badge.icon;
    const iconClass = "text-white w-full h-full";
    
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
      case "Badge":
        return <Badge className={iconClass} />;
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
  
  // Set badge level styles
  const levelStyles = {
    1: "bg-gradient-to-r from-amber-700 to-amber-500 border-amber-400", // Bronze
    2: "bg-gradient-to-r from-slate-400 to-slate-300 border-slate-200", // Silver
    3: "bg-gradient-to-r from-amber-500 to-yellow-300 border-yellow-200", // Gold
  };

  const sizeClasses = {
    sm: "w-8 h-8 p-1.5",
    md: "w-12 h-12 p-2",
    lg: "w-16 h-16 p-3",
  };
  
  const badge_style = badge.earned 
    ? levelStyles[badge.level as keyof typeof levelStyles] || levelStyles[1]
    : "bg-gray-200 dark:bg-gray-700 opacity-40 grayscale";

  const badgeContent = (
    <div 
      className={`rounded-full flex items-center justify-center ${sizeClasses[size]} border-2 ${badge_style} transition-all`}
      aria-label={`${badge.name} achievement badge`}
    >
      {renderIcon()}
    </div>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badgeContent}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-semibold">{badge.name}</p>
          <p className="text-xs opacity-90">{badge.description}</p>
          {badge.earned && badge.earnedAt && (
            <p className="text-xs opacity-75">
              Earned: {new Date(badge.earnedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}