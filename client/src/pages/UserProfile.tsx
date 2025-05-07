import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AchievementGallery from "@/components/gamification/AchievementGallery";
import UserStats from "@/components/gamification/UserStats";
import AchievementNotification from "@/components/gamification/AchievementNotification";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RocketIcon, AlertTriangle } from "lucide-react";
import { useGamification, AchievementData } from "@/hooks/use-gamification";

export default function UserProfile() {
  const { user } = useAuth();
  const [showAchievement, setShowAchievement] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<AchievementData | null>(null);
  
  const {
    // Data
    stats,
    allBadges,
    newAchievements,
    
    // Loading states
    statsLoading,
    allBadgesLoading,
    
    // Error states
    statsError,
    allBadgesError,
    
    // Actions
    markAchievementsAsViewed
  } = useGamification();
  
  // Show achievement notification for new achievements
  useEffect(() => {
    if (newAchievements && newAchievements.length > 0) {
      const achievement = newAchievements[0];
      setCurrentAchievement(achievement);
      setShowAchievement(true);
      
      // Mark as displayed
      const handleView = async () => {
        try {
          await markAchievementsAsViewed([achievement.id]);
        } catch (error) {
          console.error('Failed to mark achievement as displayed:', error);
        }
      };
      
      handleView();
    }
  }, [newAchievements, markAchievementsAsViewed]);
  
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
  if ((statsError || allBadgesError) && !statsLoading && !allBadgesLoading) {
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
            badges={allBadges || []} 
            loading={allBadgesLoading} 
          />
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-4 mt-6">
          <UserStats 
            stats={stats}
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