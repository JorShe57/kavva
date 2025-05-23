import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import UserProfile from "@/pages/UserProfile";
import Analytics from "@/pages/Analytics";
import Integrations from "@/pages/Integrations";
import AIAssistant from "@/pages/AIAssistant";
import { AuthProvider } from "@/hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/profile" component={UserProfile} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/ai-assistant" component={AIAssistant} />
      <Route path="/ai-assistant/:taskId" component={AIAssistant} />
      <Route path="/board/:id" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="intellitrack-theme">
        <AuthProvider>
          <TooltipProvider delayDuration={200}>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
