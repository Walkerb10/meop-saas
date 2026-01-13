import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebarState } from '@/hooks/useSidebarState';
import {
  User,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  Zap,
  Settings,
  MessageSquare,
  SquarePen,
  Shield,
  Bot,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { ExecutionsPopover } from '@/components/ExecutionsPopover';
import { useExecutions } from '@/hooks/useExecutions';

const mainNavItems = [
  { icon: Bot, label: 'Agent', path: '/agent' },
  { icon: Zap, label: 'Automations', path: '/automations' },
  { icon: MessageSquare, label: 'Conversations', path: '/conversations' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
];

const getBottomNavItems = (isAdmin: boolean) => {
  const items = [
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];
  
  if (isAdmin) {
    items.push({ icon: Shield, label: 'Admin', path: '/admin' });
  }
  
  return items;
};

interface AppLayoutProps {
  children: React.ReactNode;
  onNewChat?: () => void;
  showNewChatButton?: boolean;
}

export function AppLayout({ 
  children, 
  onNewChat,
  showNewChatButton = false,
}: AppLayoutProps) {
  const { runningCount } = useExecutions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { desktopSidebarOpen, setDesktopSidebarOpen } = useSidebarState();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserRole();

  const bottomNavItems = getBottomNavItems(isAdmin);
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex w-full">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-border z-50 p-4 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">MEOP OS</h2>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <nav className="flex flex-col gap-2 flex-1">
                {mainNavItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setSidebarOpen(false);
                      if (item.path) navigate(item.path);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                      isActive(item.path) 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="border-t border-border pt-4 mt-4 space-y-2">
                {bottomNavItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setSidebarOpen(false);
                      if (item.path) navigate(item.path);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left w-full ${
                      isActive(item.path) 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Left Sidebar - fixed position */}
      {!isMobile && (
        <aside 
          className={`fixed left-0 top-0 bottom-0 border-r border-border flex flex-col bg-background z-40 transition-[width] duration-200 ${
            desktopSidebarOpen ? 'w-[200px]' : 'w-14'
          }`}
        >
          <div className="p-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
              className="w-10 h-10"
            >
              {desktopSidebarOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeft className="w-5 h-5" />
              )}
            </Button>
          </div>

          <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
            {mainNavItems.map((item) => (
              <button
                key={item.label}
                onClick={() => item.path && navigate(item.path)}
                className={`flex items-center gap-3 w-full h-10 px-2 rounded-lg transition-colors text-left ${
                  isActive(item.path) 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                title={!desktopSidebarOpen ? item.label : undefined}
              >
                <div className="w-6 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5" />
                </div>
                {desktopSidebarOpen && (
                  <span className="text-sm whitespace-nowrap">{item.label}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="border-t border-border p-2 space-y-1">
            {bottomNavItems.map((item) => (
              <button
                key={item.label}
                onClick={() => item.path && navigate(item.path)}
                className={`flex items-center gap-3 w-full h-10 px-2 rounded-lg transition-colors text-left ${
                  isActive(item.path) 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                title={!desktopSidebarOpen ? item.label : undefined}
              >
                <div className="w-6 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5" />
                </div>
                {desktopSidebarOpen && (
                  <span className="text-sm whitespace-nowrap">{item.label}</span>
                )}
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Spacer for fixed sidebar */}
      {!isMobile && (
        <div className={`flex-shrink-0 transition-[width] duration-200 ${desktopSidebarOpen ? 'w-[200px]' : 'w-14'}`} />
      )}

      {/* Right side content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Bar - Fixed */}
        <header className="fixed top-0 right-0 z-30 h-14 px-4 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border"
          style={{ left: isMobile ? 0 : desktopSidebarOpen ? '200px' : '56px' }}
        >
          {/* Left side - hamburger on mobile, New Chat */}
          <div className="flex items-center gap-2">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-6 h-6" />
              </Button>
            )}
            
            {showNewChatButton && onNewChat && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onNewChat}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <SquarePen className="w-4 h-4" />
                <span>New Chat</span>
              </Button>
            )}
          </div>

          {/* Right side - Feedback and Executions */}
          <div className="flex items-center gap-2">
            {/* Feedback dialog */}
            <FeedbackDialog />
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-border text-foreground hover:bg-secondary relative"
                >
                  Executions
                  {runningCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-medium min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm">
                      {runningCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 md:w-96">
                <ExecutionsPopover />
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Spacer for fixed header */}
        <div className="h-14 flex-shrink-0" />

        {/* Main content - scrollable */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}