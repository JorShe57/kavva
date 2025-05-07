import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { TaskBoard } from "@shared/schema";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Award, Activity, Link2, LogOut, Trophy, Bot } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  boards: TaskBoard[];
  activeBoard: string | null;
  onBoardSelect: (id: string) => void;
}

export default function Sidebar({ 
  isOpen, 
  onClose,
  boards,
  activeBoard,
  onBoardSelect
}: SidebarProps) {
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  const sidebarClass = cn(
    "bg-sidebar text-sidebar-foreground h-screen flex-shrink-0 transition-all duration-300",
    {
      "md:w-64 w-full fixed md:relative z-40": true,
      "translate-x-0": isOpen || !isMobile,
      "-translate-x-full md:translate-x-0": !isOpen && isMobile,
    }
  );

  return (
    <>
      {/* Sidebar Backdrop for Mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={onClose}
        />
      )}
      
      <div className={sidebarClass}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 flex items-center border-b border-sidebar-border">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-sidebar-primary rounded-md flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sidebar-primary-foreground" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.144V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xl font-semibold">AutoTrackAI</span>
            </div>
            
            {/* Close button (mobile only) */}
            {isMobile && (
              <button
                className="ml-auto text-sidebar-foreground p-2"
                onClick={onClose}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Navigation */}
          <div className="py-4 flex-1 overflow-y-auto">
            <ul>
              <li>
                <Link href="/" className={cn(
                  "flex items-center space-x-3 px-4 py-3",
                  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  (location === "/" && activeBoard === null) ? "bg-sidebar-accent text-sidebar-accent-foreground border-r-4 border-sidebar-primary" : ""
                )}>
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Dashboard</span>
                </Link>
              </li>
              
              <li>
                <Link 
                  href="/profile" 
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    location === "/profile" ? "bg-sidebar-accent text-sidebar-accent-foreground border-r-4 border-sidebar-primary" : ""
                  )}
                >
                  <Award className="w-5 h-5" />
                  <span>Achievements</span>
                </Link>
              </li>
              
              <li>
                <Link 
                  href="/analytics" 
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    location === "/analytics" ? "bg-sidebar-accent text-sidebar-accent-foreground border-r-4 border-sidebar-primary" : ""
                  )}
                >
                  <Activity className="w-5 h-5" />
                  <span>Analytics</span>
                </Link>
              </li>
              
              <li>
                <Link 
                  href="/integrations" 
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    location === "/integrations" ? "bg-sidebar-accent text-sidebar-accent-foreground border-r-4 border-sidebar-primary" : ""
                  )}
                >
                  <Link2 className="w-5 h-5" />
                  <span>Integrations</span>
                </Link>
              </li>
              
              <li>
                <Link 
                  href="/ai-assistant" 
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    location.startsWith("/ai-assistant") ? "bg-sidebar-accent text-sidebar-accent-foreground border-r-4 border-sidebar-primary" : ""
                  )}
                >
                  <Bot className="w-5 h-5" />
                  <span>AI Assistant</span>
                </Link>
              </li>
            </ul>
            
            <div className="px-4 pt-6 pb-2">
              <h3 className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">Recent Boards</h3>
            </div>
            
            <ul>
              {boards.map((board) => {
                // Convert board.id to string for comparison
                const boardIdString = String(board.id);
                return (
                  <li key={boardIdString}>
                    <Link 
                      href={`/board/${boardIdString}`}
                      className={cn(
                        "flex items-center space-x-3 px-4 py-2 text-sm",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        activeBoard === boardIdString ? "bg-sidebar-accent text-sidebar-accent-foreground border-r-4 border-sidebar-primary" : "text-sidebar-foreground"
                      )}
                      onClick={() => {
                        onBoardSelect(boardIdString);
                        if (isMobile) onClose();
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                      </svg>
                      <span>{board.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          
          {/* User Profile */}
          <div className="border-t border-sidebar-border p-4">
            <Link 
              href="/profile"
              className="flex items-center space-x-3 p-2 rounded-lg transition-colors hover:bg-sidebar-accent"
              onClick={isMobile ? onClose : undefined}
            >
              <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              
              <div className="flex-1">
                <h3 className="text-sm font-medium">{user?.username || "User"}</h3>
                <div className="flex items-center text-xs text-sidebar-foreground/70">
                  <Trophy className="h-3 w-3 mr-1" /> 
                  <span>View achievements</span>
                </div>
              </div>
              
              <button 
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground p-1"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  logout();
                }}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
