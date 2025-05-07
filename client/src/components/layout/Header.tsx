import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Mobile menu button */}
        <button 
          className="md:hidden text-muted-foreground"
          onClick={onMenuClick}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
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
          <button 
            className="text-muted-foreground hover:text-foreground relative"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-destructive"></span>
          </button>
          
          <button 
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setShowHelpModal(!showHelpModal)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          
          <div className="hidden md:block">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
