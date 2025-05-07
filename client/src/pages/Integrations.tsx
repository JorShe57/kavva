import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useQuery } from "@tanstack/react-query";
import { TaskBoard as TaskBoardType } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Github, Mail, MessageCircle, Slack, Smartphone, ExternalLink } from "lucide-react";
import { SiTrello, SiAsana, SiGooglecalendar, SiNotion, SiGoogle } from "react-icons/si";

export default function Integrations() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  
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

  // Function to handle integration connection
  const handleConnectIntegration = (integration: string) => {
    setSelectedIntegration(integration);
    setShowConnectDialog(true);
  };

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
            <h1 className="text-2xl font-semibold text-foreground">Integrations</h1>
            <p className="text-muted-foreground mt-1">
              Connect your AutoTrackAI with other tools and services
            </p>
          </div>

          <Tabs defaultValue="productivity" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="productivity">Productivity</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="productivity" className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <IntegrationCard 
                  title="Trello"
                  description="Connect your Trello boards to sync tasks and cards."
                  icon={<SiTrello className="w-8 h-8 text-[#0079BF]" />}
                  status="available"
                  onConnect={() => handleConnectIntegration('Trello')}
                />
                
                <IntegrationCard 
                  title="Asana"
                  description="Sync your Asana tasks with AutoTrackAI."
                  icon={<SiAsana className="w-8 h-8 text-[#FC636B]" />}
                  status="available"
                  onConnect={() => handleConnectIntegration('Asana')}
                />
                
                <IntegrationCard 
                  title="GitHub"
                  description="Link GitHub issues directly to your tasks."
                  icon={<Github className="w-8 h-8" />}
                  status="available"
                  onConnect={() => handleConnectIntegration('GitHub')}
                />
                
                <IntegrationCard 
                  title="Notion"
                  description="Integrate with Notion databases and pages."
                  icon={<SiNotion className="w-8 h-8 text-black" />}
                  status="coming_soon"
                  onConnect={() => {}}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="communication" className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <IntegrationCard 
                  title="Slack"
                  description="Create tasks from Slack messages and get notifications."
                  icon={<Slack className="w-8 h-8 text-[#4A154B]" />}
                  status="available"
                  onConnect={() => handleConnectIntegration('Slack')}
                />
                
                <IntegrationCard 
                  title="Email Integration"
                  description="Forward emails to create tasks automatically."
                  icon={<Mail className="w-8 h-8 text-blue-500" />}
                  status="connected"
                  onConnect={() => handleConnectIntegration('Email')}
                />
                
                <IntegrationCard 
                  title="Microsoft Teams"
                  description="Create tasks from Teams messages and chats."
                  icon={<MessageCircle className="w-8 h-8 text-[#6264A7]" />}
                  status="coming_soon"
                  onConnect={() => {}}
                />
                
                <IntegrationCard 
                  title="SMS Notifications"
                  description="Get task reminders via text message."
                  icon={<Smartphone className="w-8 h-8 text-green-500" />}
                  status="available"
                  onConnect={() => handleConnectIntegration('SMS')}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="calendar" className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <IntegrationCard 
                  title="Google Calendar"
                  description="Sync task due dates with Google Calendar."
                  icon={<SiGooglecalendar className="w-8 h-8 text-[#4285F4]" />}
                  status="available"
                  onConnect={() => handleConnectIntegration('Google Calendar')}
                />
                
                <IntegrationCard 
                  title="Outlook Calendar"
                  description="Add task deadlines to your Outlook calendar."
                  icon={<Calendar className="w-8 h-8 text-[#0078D4]" />}
                  status="available"
                  onConnect={() => handleConnectIntegration('Outlook')}
                />
                
                <IntegrationCard 
                  title="Apple Calendar"
                  description="Sync with Apple Calendar on your devices."
                  icon={<Calendar className="w-8 h-8 text-red-500" />}
                  status="coming_soon"
                  onConnect={() => {}}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>API Access</CardTitle>
                <CardDescription>Manage your API access for custom integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-md font-medium">API Key</h3>
                      <p className="text-sm text-muted-foreground">Use for custom integrations</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input 
                        className="w-64" 
                        value="••••••••••••••••••••••••••"
                        readOnly
                      />
                      <Button variant="outline">View</Button>
                      <Button variant="outline">Regenerate</Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-md font-medium">Webhook URL</h3>
                      <p className="text-sm text-muted-foreground">For receiving external events</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input 
                        className="w-64" 
                        value="https://autotrack.ai/api/webhooks/user/123456"
                        readOnly
                      />
                      <Button variant="outline">Copy</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t p-6">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="api-access" />
                      <Label htmlFor="api-access">Enable API access</Label>
                    </div>
                    <Badge variant="outline">Developer</Badge>
                  </div>
                  <Button variant="default">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    API Documentation
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
      
      {/* Integration Connection Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Connect to {selectedIntegration}</DialogTitle>
            <DialogDescription>
              Enter your {selectedIntegration} credentials to establish the connection.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedIntegration === 'Email' ? (
              <div className="space-y-4">
                <p className="text-sm">
                  Your email integration is already set up! Use the email address below to forward emails that should be converted to tasks:
                </p>
                <Input 
                  className="font-mono"
                  value="tasks@autotrackAI.com"
                  readOnly
                />
                <div className="flex justify-between items-center">
                  <Label>Email notifications</Label>
                  <Switch id="email-notifications" defaultChecked />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="api-key" className="text-right">
                    API Key
                  </Label>
                  <Input
                    id="api-key"
                    placeholder="Enter API key"
                    className="col-span-3"
                  />
                </div>
                {(selectedIntegration === 'Slack' || selectedIntegration === 'Trello') && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="workspace-id" className="text-right">
                      Workspace ID
                    </Label>
                    <Input
                      id="workspace-id"
                      placeholder="Enter workspace ID"
                      className="col-span-3"
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Switch id="sync-both-ways" />
                  <Label htmlFor="sync-both-ways">Enable two-way sync</Label>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={() => setShowConnectDialog(false)}>
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Integration Card Component
interface IntegrationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "available" | "connected" | "coming_soon";
  onConnect: () => void;
}

function IntegrationCard({ title, description, icon, status, onConnect }: IntegrationCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex flex-col space-y-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div>{icon}</div>
      </CardHeader>
      <CardContent className="mt-2">
        <div className="flex items-center">
          {status === "connected" ? (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Connected</Badge>
          ) : status === "coming_soon" ? (
            <Badge variant="outline" className="text-muted-foreground">Coming Soon</Badge>
          ) : (
            <Badge variant="outline" className="text-blue-600">Available</Badge>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {status === "connected" ? (
          <div className="flex space-x-2 w-full">
            <Button variant="outline" className="w-full">Configure</Button>
            <Button variant="outline" className="w-full" color="destructive">Disconnect</Button>
          </div>
        ) : status === "coming_soon" ? (
          <Button disabled className="w-full">Coming Soon</Button>
        ) : (
          <Button onClick={onConnect} className="w-full">Connect</Button>
        )}
      </CardFooter>
    </Card>
  );
}