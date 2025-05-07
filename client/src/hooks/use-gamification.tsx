import { useQuery, useMutation } from "@tanstack/react-query";
import { GamificationAPI, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export interface UserStatsData {
  userId: number;
  tasksCompleted: number;
  highPriorityCompleted: number;
  tasksCreated: number;
  aiTasksGenerated: number;
  daysStreak: number;
  points: number;
  level: number;
  lastActive?: Date;
  weeklyStats?: Record<string, any>;
}

export interface AchievementBadgeData {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: string;
  level: number;
  earned: boolean;
  earnedAt?: Date;
}

export interface AchievementData {
  id: number;
  badgeId: number;
  earnedAt: Date;
  name: string;
  description: string;
  icon: string;
  type: string;
  level: number;
}

export interface LeaderboardEntry {
  userId: number;
  points: number;
  level: number;
  tasksCompleted: number;
  daysStreak: number;
  username?: string;
}

export function useGamification() {
  const { user } = useAuth();
  
  // Get user stats
  const { 
    data: stats, 
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useQuery<UserStatsData>({
    queryKey: ['/api/gamification/stats'],
    enabled: !!user,
  });
  
  // Get all user badges (earned badges)
  const { 
    data: userBadges, 
    isLoading: userBadgesLoading,
    error: userBadgesError,
    refetch: refetchUserBadges
  } = useQuery<AchievementData[]>({
    queryKey: ['/api/gamification/badges'],
    enabled: !!user,
  });
  
  // Get all available badges (including unearned)
  const { 
    data: allBadges, 
    isLoading: allBadgesLoading,
    error: allBadgesError,
    refetch: refetchAllBadges
  } = useQuery<AchievementBadgeData[]>({
    queryKey: ['/api/gamification/all-badges'],
    enabled: !!user,
  });
  
  // Get new achievements
  const { 
    data: newAchievements, 
    isLoading: newAchievementsLoading,
    error: newAchievementsError,
    refetch: refetchNewAchievements
  } = useQuery<AchievementData[]>({
    queryKey: ['/api/gamification/new-achievements'],
    enabled: !!user,
    refetchOnWindowFocus: false,
  });
  
  // Get leaderboard
  const { 
    data: leaderboard, 
    isLoading: leaderboardLoading,
    error: leaderboardError,
    refetch: refetchLeaderboard
  } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/gamification/leaderboard'],
    enabled: !!user,
  });
  
  // Mark achievements as viewed
  const { mutateAsync: markAchievementsAsViewed } = useMutation({
    mutationFn: (achievementIds: number[]) => 
      GamificationAPI.markAchievementsAsViewed(achievementIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/new-achievements'] });
    }
  });
  
  // Trigger task completion (for testing)
  const { mutateAsync: triggerTaskCompleted } = useMutation({
    mutationFn: (taskId: string) => 
      GamificationAPI.triggerTaskCompleted(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/badges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/all-badges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/new-achievements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/leaderboard'] });
    }
  });
  
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
  
  const refetchAll = () => {
    refetchStats();
    refetchUserBadges();
    refetchAllBadges();
    refetchNewAchievements();
    refetchLeaderboard();
  };
  
  return {
    // Data
    stats: stats || defaultStats,
    userBadges: userBadges || [],
    allBadges: allBadges || [],
    newAchievements: newAchievements || [],
    leaderboard: leaderboard || [],
    
    // Loading states
    statsLoading,
    userBadgesLoading,
    allBadgesLoading,
    newAchievementsLoading,
    leaderboardLoading,
    
    // Error states
    statsError,
    userBadgesError,
    allBadgesError,
    newAchievementsError,
    leaderboardError,
    
    // Actions
    markAchievementsAsViewed,
    triggerTaskCompleted,
    refetchAll,
    
    // Individual refetch functions
    refetchStats,
    refetchUserBadges,
    refetchAllBadges,
    refetchNewAchievements,
    refetchLeaderboard,
  };
}