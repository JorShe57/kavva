import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers,
      'Content-Type': 'application/json'
    }
  });
  
  await throwIfResNotOk(response);
  return await response.json() as T;
}

// Gamification API endpoints
export const GamificationAPI = {
  getUserStats: () => fetchJson('/api/gamification/stats'),
  getUserBadges: () => fetchJson('/api/gamification/badges'),
  getAllBadges: () => fetchJson('/api/gamification/all-badges'),
  getNewAchievements: () => fetchJson('/api/gamification/new-achievements'),
  markAchievementsAsViewed: (achievementIds: number[]) => fetchJson(
    '/api/gamification/mark-viewed', 
    {
      method: 'POST',
      body: JSON.stringify({ achievementIds }),
    }
  ),
  getLeaderboard: () => fetchJson('/api/gamification/leaderboard'),
  triggerTaskCompleted: (taskId: string) => fetchJson(
    '/api/gamification/trigger-task-completed',
    {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    }
  ),
};

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
