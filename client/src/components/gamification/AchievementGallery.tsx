import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AchievementBadge from "./AchievementBadge";
import { Skeleton } from "@/components/ui/skeleton";

interface AchievementGalleryProps {
  badges: {
    id: number;
    name: string;
    description: string;
    icon: string;
    type: string;
    level: number;
    earned: boolean;
    earnedAt?: Date;
  }[];
  loading?: boolean;
}

export default function AchievementGallery({ badges, loading = false }: AchievementGalleryProps) {
  // Group badges by type
  const groupedBadges = badges.reduce((groups, badge) => {
    const group = groups[badge.type] || [];
    group.push(badge);
    groups[badge.type] = group;
    return groups;
  }, {} as Record<string, typeof badges>);

  // Get all unique badge types
  const badgeTypes = Object.keys(groupedBadges);

  // Get user's earned badges
  const earnedBadges = badges.filter(badge => badge.earned);
  const earnedCount = earnedBadges.length;
  const totalCount = badges.length;
  const percentage = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  // Type labels for user-friendly display
  const typeLabels: Record<string, string> = {
    task: "Task Completion",
    priority: "Priority Management",
    streak: "Consistency",
    ai: "AI Usage",
    level: "Experience"
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted p-6 rounded-lg">
        <h3 className="font-semibold text-xl mb-2">Achievements Progress</h3>
        <div className="flex items-center space-x-4">
          <div className="flex-grow space-y-2">
            <div className="flex justify-between text-sm">
              <span>{earnedCount} earned</span>
              <span>{totalCount} total</span>
            </div>
            <div className="h-2 w-full bg-muted-foreground/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full" 
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <span className="text-2xl font-bold">{percentage}%</span>
            <span className="block text-xs text-muted-foreground">Complete</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap">
          <TabsTrigger value="all">All Badges</TabsTrigger>
          <TabsTrigger value="earned" className="relative">
            Earned
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
              {earnedCount}
            </span>
          </TabsTrigger>
          
          {badgeTypes.map(type => (
            <TabsTrigger key={type} value={type}>
              {typeLabels[type] || type}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="pt-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {badges.map(badge => (
              <div key={badge.id} className="flex flex-col items-center">
                <AchievementBadge badge={badge} />
                <span className="mt-2 text-xs text-center font-medium truncate max-w-full">{badge.name}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="earned" className="pt-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {earnedBadges.length > 0 ? (
              earnedBadges.map(badge => (
                <div key={badge.id} className="flex flex-col items-center">
                  <AchievementBadge badge={badge} />
                  <span className="mt-2 text-xs text-center font-medium truncate max-w-full">{badge.name}</span>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-6 text-muted-foreground">
                <p>You haven't earned any badges yet. Complete tasks to earn achievements!</p>
              </div>
            )}
          </div>
        </TabsContent>

        {badgeTypes.map(type => (
          <TabsContent key={type} value={type} className="pt-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {groupedBadges[type].map(badge => (
                <div key={badge.id} className="flex flex-col items-center">
                  <AchievementBadge badge={badge} />
                  <span className="mt-2 text-xs text-center font-medium truncate max-w-full">{badge.name}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-muted p-6 rounded-lg">
        <Skeleton className="h-7 w-44 mb-2" />
        <div className="flex items-center space-x-4">
          <div className="flex-grow space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          <Skeleton className="h-10 w-16" />
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center">
              <Skeleton className="w-12 h-12 rounded-full" />
              <Skeleton className="mt-2 h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}