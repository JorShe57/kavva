import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AchievementGallery from "@/components/gamification/AchievementGallery";
import UserStats from "@/components/gamification/UserStats";
import AchievementNotification from "@/components/gamification/AchievementNotification";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RocketIcon, AlertTriangle } from "lucide-react";
import { useGamification, AchievementData } from "@/hooks/use-gamification";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { TaskBoard as TaskBoardType } from "@shared/schema";

export default function UserProfile() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<AchievementData | null>(null);
  
  // Query to fetch boards (needed for sidebar)
  const { data: boards = [] } = useQuery<TaskBoardType[]>({
    queryKey: ['/api/boards'],
    enabled: !!user
  });
  
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
  
  // Redirect to login if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Handle error states
  if ((statsError || allBadgesError) && !statsLoading && !allBadgesLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          boards={boards}
          activeBoard={null}
          onBoardSelect={() => {}}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="flex-1 overflow-y-auto p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load profile data. Please try again later.
              </AlertDescription>
            </Alert>
          </main>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        boards={boards}
        activeBoard={null}
        onBoardSelect={() => {}}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground">{user?.username}'s Profile</h1>
            <p className="text-muted-foreground mt-1">
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
        </main>
      </div>
    </div>
  );
}