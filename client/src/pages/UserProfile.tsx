import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AchievementGallery from "@/components/gamification/AchievementGallery";
import UserStats from "@/components/gamification/UserStats";
import AchievementNotification from "@/components/gamification/AchievementNotification";
import { queryClient, GamificationAPI } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RocketIcon, AlertTriangle } from "lucide-react";

interface UserStatsData {
  userId: number;
  tasksCompleted: number;
  highPriorityCompleted: number;
  tasksCreated: number;
  aiTasksGenerated: number;
  daysStreak: number;
  points: number;
  level: number;
  weeklyStats?: Record<string, any>;
}

interface AchievementBadgeData {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: string;
  level: number;
  earned: boolean;
  earnedAt?: Date;
}

interface AchievementData {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: string;
  level: number;
  earnedAt: Date;
}

export default function UserProfile() {
  const { user } = useAuth();
  const [showAchievement, setShowAchievement] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<AchievementData | null>(null);
  
  // Get user stats
  const { 
    data: stats, 
    isLoading: statsLoading,
    error: statsError
  } = useQuery<UserStatsData>({
    queryKey: ['/api/gamification/stats'],
    enabled: !!user,
  });
  
  // Get all user badges
  const { 
    data: badges, 
    isLoading: badgesLoading,
    error: badgesError
  } = useQuery<AchievementBadgeData[]>({
    queryKey: ['/api/gamification/badges'],
    enabled: !!user,
  });
  
  // Get new achievements
  const { 
    data: newAchievements, 
    isLoading: newAchievementsLoading 
  } = useQuery<AchievementData[]>({
    queryKey: ['/api/gamification/new-achievements'],
    enabled: !!user,
    refetchOnWindowFocus: false,
  });
  
  // Show achievement notification for new achievements
  useEffect(() => {
    if (newAchievements && newAchievements.length > 0) {
      const achievement = newAchievements[0];
      setCurrentAchievement(achievement);
      setShowAchievement(true);
      
      // Mark as displayed
      const markDisplayed = async () => {
        try {
          await GamificationAPI.markAchievementsAsViewed([achievement.id]);
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['/api/gamification/new-achievements'] });
        } catch (error) {
          console.error('Failed to mark achievement as displayed:', error);
        }
      };
      
      markDisplayed();
    }
  }, [newAchievements]);
  
  // Handle closing the achievement notification
  const handleAchievementClose = () => {
    setShowAchievement(false);
    setCurrentAchievement(null);
    
    // If there are more achievements, show the next one after a short delay
    if (newAchievements && newAchievements.length > 1) {
      setTimeout(() => {
        const nextAchievement = newAchievements[1];
        setCurrentAchievement(nextAchievement);
        setShowAchievement(true);
      }, 500);
    }
  };
  
  // Handle error states
  if ((statsError || badgesError) && !statsLoading && !badgesLoading) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load profile data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Default stats if not loaded
  const defaultStats: UserStatsData = {
    userId: user?.id || 0,
    tasksCompleted: 0,
    highPriorityCompleted: 0,
    tasksCreated: 0,
    aiTasksGenerated: 0,
    daysStreak: 0,
    points: 0,
    level: 1,
  };
  
  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold tracking-tight">{user?.username}'s Profile</h1>
        <p className="text-muted-foreground">
          Track your productivity, achievements, and progress
        </p>
      </div>
      
      <Tabs defaultValue="achievements" className="w-full">
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="stats">Stats & Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="achievements" className="space-y-4 mt-6">
          <Alert>
            <RocketIcon className="h-4 w-4" />
            <AlertTitle>Gamify your productivity!</AlertTitle>
            <AlertDescription>
              Complete tasks, maintain streaks, and use AI features to earn badges and increase your productivity score.
            </AlertDescription>
          </Alert>
          
          <AchievementGallery 
            badges={badges || []} 
            loading={badgesLoading} 
          />
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-4 mt-6">
          <UserStats 
            stats={stats || defaultStats}
            loading={statsLoading}
          />
        </TabsContent>
      </Tabs>
      
      {/* Achievement notification */}
      <AchievementNotification 
        isOpen={showAchievement}
        onClose={handleAchievementClose}
        achievement={currentAchievement}
      />
    </div>
  );
}