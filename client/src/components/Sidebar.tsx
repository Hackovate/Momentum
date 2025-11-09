import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  GraduationCap, 
  Lightbulb, 
  Wallet, 
  Heart, 
  BookOpen, 
  BarChart3,
  Sparkles,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { cn } from './ui/utils';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isMobileOpen?: boolean;
  onMobileToggle?: () => void;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

export function Sidebar({ activeSection, onSectionChange, isMobileOpen = false, onMobileToggle, onCollapseChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
    onCollapseChange?.(isCollapsed);
  }, [isCollapsed, onCollapseChange]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assistant', label: 'Assistant', icon: Sparkles },
    { id: 'planner', label: 'Daily Planner', icon: Calendar },
    { id: 'academics', label: 'Academics', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Lightbulb },
    { id: 'finances', label: 'Finances', icon: Wallet },
    { id: 'lifestyle', label: 'Habit', icon: Heart },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const footerItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'logout', label: 'Logout', icon: LogOut },
  ];

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 shadow-lg transition-all duration-300 z-50",
        sidebarWidth,
        "md:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo and Toggle Button */}
        <div className={cn(
          "border-b border-sidebar-border bg-card/50 flex items-center transition-all relative",
          isCollapsed ? "p-4 justify-center" : "p-6 justify-between"
        )}>
          {isCollapsed ? (
            <>
              <img 
                src="/Icon black.png" 
                alt="Momentum Icon" 
                className="h-8 w-8 object-contain transition-all dark:brightness-0 dark:invert" 
              />
              {/* Collapse toggle button when collapsed - positioned at bottom */}
              <button
                onClick={toggleCollapse}
                className="absolute bottom-2 right-2 p-1 rounded-lg hover:bg-sidebar-accent/50 transition-colors hidden md:flex"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4 text-sidebar-foreground" />
              </button>
            </>
          ) : (
            <>
              <img 
                src="/Full Logo.svg" 
                alt="Momentum Logo" 
                className="h-20 w-auto object-contain transition-all dark:brightness-0 dark:invert" 
              />
              <div className="flex items-center gap-2">
                {/* Mobile Close Button */}
                <button
                  onClick={onMobileToggle}
                  className="p-1.5 rounded-lg hover:bg-sidebar-accent/50 transition-colors md:hidden"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5 text-sidebar-foreground" />
                </button>
                {/* Desktop Collapse Toggle */}
                <button
                  onClick={toggleCollapse}
                  className="p-1.5 rounded-lg hover:bg-sidebar-accent/50 transition-colors hidden md:flex"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="w-5 h-5 text-sidebar-foreground" />
                </button>
              </div>
            </>
          )}
        </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSectionChange(item.id);
                  onMobileToggle?.();
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0",
                  isActive ? "text-primary-foreground" : "text-sidebar-foreground group-hover:text-sidebar-primary"
                )} />
                {!isCollapsed && (
                  <>
                    <span className={cn(
                      "font-medium",
                      isActive ? "text-primary-foreground" : "text-sidebar-foreground group-hover:text-sidebar-primary"
                    )}>
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-primary-foreground animate-pulse"></div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border bg-card/50">
        <div className="space-y-2">
          {footerItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSectionChange(item.id);
                  onMobileToggle?.();
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary transition-all duration-200 group",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium group-hover:text-sidebar-primary">{item.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      </div>
    </>
  );
}
