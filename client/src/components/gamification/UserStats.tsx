import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Award, 
  CheckSquare, 
  Flame, 
  BadgeCheck, 
  Medal, 
  TrendingUp, 
  BarChart, 
  Target,
  AlarmClock,
  Bot,
  Star
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserStatsProps {
  stats: {
    userId: number;
    tasksCompleted: number;
    highPriorityCompleted: number;
    tasksCreated: number;
    aiTasksGenerated: number;
    daysStreak: number;
    points: number;
    level: number;
    weeklyStats?: Record<string, any>;
  };
  loading?: boolean;
}

export default function UserStats({ stats, loading = false }: UserStatsProps) {
  // Calculate next level progress
  const currentLevel = stats.level;
  const pointsForCurrentLevel = (currentLevel - 1) * 100;
  const pointsForNextLevel = currentLevel * 100;
  const currentLevelPoints = stats.points - pointsForCurrentLevel;
  const progressToNextLevel = Math.min(
    Math.floor((currentLevelPoints / (pointsForNextLevel - pointsForCurrentLevel)) * 100), 
    100
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  // Productivity score is a weighted calculation based on different metrics
  const productivityScore = Math.min(Math.floor(
    (stats.tasksCompleted * 5) + 
    (stats.highPriorityCompleted * 10) + 
    (stats.daysStreak * 15) + 
    (stats.level * 20)
  ) / 100, 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Level Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Medal className="mr-2 h-4 w-4 text-yellow-500" />
              Level {stats.level}
            </CardTitle>
            <CardDescription>
              {pointsForNextLevel - stats.points} points to next level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{stats.points} Points</div>
            <Progress value={progressToNextLevel} className="h-2" />
          </CardContent>
        </Card>

        {/* Streak Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Flame className="mr-2 h-4 w-4 text-orange-500" />
              Current Streak
            </CardTitle>
            <CardDescription>
              Days of consistent activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.daysStreak} {stats.daysStreak === 1 ? 'Day' : 'Days'}</div>
          </CardContent>
        </Card>

        {/* Tasks Completed Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckSquare className="mr-2 h-4 w-4 text-green-500" />
              Tasks Completed
            </CardTitle>
            <CardDescription>
              Total tasks finished
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasksCompleted}</div>
            <div className="text-sm text-muted-foreground">
              Including {stats.highPriorityCompleted} high priority
            </div>
          </CardContent>
        </Card>

        {/* Productivity Score Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="mr-2 h-4 w-4 text-blue-500" />
              Productivity Score
            </CardTitle>
            <CardDescription>
              Based on your activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productivityScore}</div>
            <Progress value={productivityScore} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Target className="h-4 w-4 text-purple-500" />}
          title="Tasks Created"
          value={stats.tasksCreated}
        />
        
        <StatCard 
          icon={<Bot className="h-4 w-4 text-cyan-500" />}
          title="AI Generated Tasks"
          value={stats.aiTasksGenerated}
        />
        
        <StatCard 
          icon={<BadgeCheck className="h-4 w-4 text-pink-500" />}
          title="Completion Rate"
          value={`${Math.round((stats.tasksCompleted / (stats.tasksCreated || 1)) * 100)}%`}
          subtitle={`${stats.tasksCompleted} of ${stats.tasksCreated}`}
        />
        
        <StatCard 
          icon={<Star className="h-4 w-4 text-yellow-500" />}
          title="High Priority Rate"
          value={`${Math.round((stats.highPriorityCompleted / (stats.tasksCompleted || 1)) * 100)}%`}
          subtitle={`${stats.highPriorityCompleted} of ${stats.tasksCompleted}`}
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
}

function StatCard({ icon, title, value, subtitle }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          {icon}
          <span className="ml-2">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <div className="text-sm text-muted-foreground">
            {subtitle}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-36 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}