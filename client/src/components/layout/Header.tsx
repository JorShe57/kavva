import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ui/theme-provider";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Medal, Bell, HelpCircle, User, LogOut, Menu, Sun, Moon, Laptop } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

// Theme toggle component
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground">
          {theme === "light" ? (
            <Sun className="h-6 w-6" />
          ) : theme === "dark" ? (
            <Moon className="h-6 w-6" />
          ) : (
            <Laptop className="h-6 w-6" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}>
          <DropdownMenuRadioItem value="light" className="cursor-pointer">
            <Sun className="h-4 w-4 mr-2" />
            <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="cursor-pointer">
            <Moon className="h-4 w-4 mr-2" />
            <span>Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className="cursor-pointer">
            <Laptop className="h-4 w-4 mr-2" />
            <span>System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  return (
    <header className="bg-background shadow-sm z-10 border-b">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Mobile menu button */}
        <button 
          className="md:hidden text-muted-foreground"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </button>
        
        {/* Search */}
        <div className="hidden md:flex items-center max-w-md w-full">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input 
              type="text" 
              className="bg-muted border-none rounded-lg py-2 pl-10 pr-4 w-full focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Search tasks..." 
            />
          </div>
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Notifications */}
          <button 
            className="text-muted-foreground hover:text-foreground relative"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-6 w-6" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-destructive"></span>
          </button>
          
          {/* Help */}
          <button 
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setShowHelpModal(!showHelpModal)}
          >
            <HelpCircle className="h-6 w-6" />
          </button>
          
          {/* User menu */}
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm cursor-pointer hover:opacity-90 transition-opacity">
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center cursor-pointer">
                    <Medal className="mr-2 h-4 w-4" />
                    <span>Achievements</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => logout()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
