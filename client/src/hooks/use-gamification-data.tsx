import { useQuery, useMutation } from "@tanstack/react-query";
import { UserStatsData, AchievementBadgeData } from "@/hooks/use-gamification";
import { apiRequest, queryClient } from "@/lib/queryClient";

/**
 * Hook to fetch and manage user gamification data from the real database
 */
export function useGamificationData() {
  // Fetch user statistics
  const {
    data: userStats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['/api/gamification/stats'],
    enabled: true, // Only fetch when component mounts
  });

  // Fetch user badges
  const {
    data: userBadges,
    isLoading: isLoadingBadges,
    error: badgesError,
    refetch: refetchBadges
  } = useQuery({
    queryKey: ['/api/gamification/badges'],
    enabled: true, // Only fetch when component mounts
  });

  // Fetch new (unviewed) achievements
  const {
    data: newAchievements,
    isLoading: isLoadingNewAchievements,
    error: newAchievementsError,
    refetch: refetchNewAchievements
  } = useQuery({
    queryKey: ['/api/gamification/new-achievements'],
    enabled: true, // Only fetch when component mounts
  });

  // Function to mark achievements as viewed
  const markAchievementsAsViewed = useMutation({
    mutationFn: async (achievementIds: number[]) => {
      const response = await apiRequest('POST', '/api/gamification/mark-viewed', { achievementIds });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate cache for new achievements
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/new-achievements'] });
    }
  });

  // Loading state for all queries
  const isLoading = isLoadingStats || isLoadingBadges || isLoadingNewAchievements;

  // Combine errors
  const error = statsError || badgesError || newAchievementsError;

  // Function to refresh all data
  const refreshAllData = () => {
    refetchStats();
    refetchBadges();
    refetchNewAchievements();
  };

  return {
    userStats: userStats as UserStatsData | undefined,
    userBadges: userBadges as AchievementBadgeData[] | undefined,
    newAchievements,
    isLoading,
    error,
    refreshAllData,
    markAchievementsAsViewed
  };
}