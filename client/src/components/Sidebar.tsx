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

  const [sidebarBgColor, setSidebarBgColor] = useState(() => {
    // Initialize with light mode color, will update on mount
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      return isDark ? '#1e293b' : '#e0f2fe';
    }
    return '#e0f2fe';
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
    onCollapseChange?.(isCollapsed);
  }, [isCollapsed, onCollapseChange]);

  useEffect(() => {
    // Update sidebar color and dark mode state when theme changes
    const updateColor = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setSidebarBgColor(isDark ? '#1e293b' : '#e0f2fe');
      setIsDarkMode(isDark);
    };

    // Check on mount
    updateColor();

    // Watch for theme changes
    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

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
      <div 
        className={cn(
          "h-screen border-r border-sidebar-border flex flex-col fixed left-0 top-0 shadow-lg transition-all duration-300 z-50",
          "backdrop-blur-none",
          sidebarWidth,
          "md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ 
          backgroundColor: sidebarBgColor,
          opacity: 1
        }}
      >
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
                    ? "shadow-md" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  isCollapsed && "justify-center"
                )}
                style={isActive ? {
                  backgroundColor: isDarkMode ? '#0f172a' : '#1a202c',
                  color: '#ffffff'
                } : undefined}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon 
                  className={cn(
                    "w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0",
                    !isActive && "text-sidebar-foreground group-hover:text-sidebar-foreground"
                  )}
                  style={isActive ? { color: '#ffffff' } : undefined}
                />
                {!isCollapsed && (
                  <>
                    <span 
                      className={cn(
                        "font-medium",
                        !isActive && "text-sidebar-foreground group-hover:text-sidebar-foreground"
                      )}
                      style={isActive ? { color: '#ffffff' } : undefined}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <div 
                        className="ml-auto w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: '#ffffff' }}
                      ></div>
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
