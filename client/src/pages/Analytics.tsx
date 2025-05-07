import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useQuery } from "@tanstack/react-query";
import { TaskBoard as TaskBoardType } from "@shared/schema";
import { useGamification } from "@/hooks/use-gamification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, Calendar, CheckCircle, Clock, Flag, TrendingUp } from "lucide-react";

export default function Analytics() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const { stats, loading: statsLoading } = useGamification();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Query to fetch boards
  const { data: boards = [] } = useQuery<TaskBoardType[]>({ 
    queryKey: ['/api/boards'],
    enabled: !!user
  });

  // Handle redirection
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  // Convert weekly stats to chart data
  const weeklyData = stats?.weeklyStats ? Object.entries(stats.weeklyStats).map(([week, data]) => ({
    name: `Week ${week}`,
    tasks: data.tasks || 0,
    points: data.points || 0,
    highPriority: data.highPriority || 0
  })) : [];

  // Task status distribution data for pie chart
  const statusData = [
    { name: 'To Do', value: 5, color: '#F87171' },
    { name: 'In Progress', value: 3, color: '#60A5FA' },
    { name: 'Completed', value: 8, color: '#34D399' }
  ];

  // Task priority distribution data for pie chart
  const priorityData = [
    { name: 'High', value: 4, color: '#EF4444' },
    { name: 'Medium', value: 7, color: '#F59E0B' },
    { name: 'Low', value: 5, color: '#10B981' }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
            <h1 className="text-2xl font-semibold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Track your productivity and task management metrics
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.tasksCompleted || 0}</div>
                <p className="text-xs text-muted-foreground">Completed tasks</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Productivity Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.points || 0}</div>
                <p className="text-xs text-muted-foreground">Total points earned</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Streak</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.daysStreak || 0} days</div>
                <p className="text-xs text-muted-foreground">Continuous activity</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="priority">Priority</TabsTrigger>
            </TabsList>
            
            <TabsContent value="activity" className="pt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Activity</CardTitle>
                  <CardDescription>Your task activity over the past weeks</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={weeklyData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="tasks" fill="#8884d8" name="Tasks Completed" />
                      <Bar dataKey="points" fill="#82ca9d" name="Points Earned" />
                      <Bar dataKey="highPriority" fill="#ffc658" name="High Priority Tasks" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="status" className="pt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Status Distribution</CardTitle>
                  <CardDescription>Breakdown of tasks by their current status</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="priority" className="pt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Priority Distribution</CardTitle>
                  <CardDescription>Breakdown of tasks by their priority level</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Detailed breakdown of your task management efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center p-4 bg-background rounded-lg shadow">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-500 mr-4">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg. Completion Time</p>
                      <p className="text-xl font-semibold">2.3 days</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-4 bg-background rounded-lg shadow">
                    <div className="p-3 rounded-full bg-green-100 text-green-500 mr-4">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                      <p className="text-xl font-semibold">78%</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-4 bg-background rounded-lg shadow">
                    <div className="p-3 rounded-full bg-yellow-100 text-yellow-500 mr-4">
                      <Flag className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Priority Focus</p>
                      <p className="text-xl font-semibold">{stats?.highPriorityCompleted || 0}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-4 bg-background rounded-lg shadow">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-500 mr-4">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Weekly Average</p>
                      <p className="text-xl font-semibold">4.5 tasks</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}