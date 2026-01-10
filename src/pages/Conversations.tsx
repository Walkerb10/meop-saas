import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Menu, X, LayoutDashboard, CalendarClock, Settings, PanelLeftClose, PanelLeft, User, MessageSquare, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const mainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: CalendarClock, label: 'Automations', path: '/scheduled-actions' },
  { icon: Clock, label: 'Executions', path: '/executions' },
  { icon: MessageSquare, label: 'Conversations', path: '/conversations' },
];

const bottomNavItems = [
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

interface ConversationGroup {
  conversation_id: string;
  messages: {
    id: string;
    role: string;
    content: string;
    created_at: string;
  }[];
  lastMessage: string;
  lastTime: string;
}

const Conversations = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_transcripts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by conversation_id
      const grouped = (data || []).reduce((acc, msg) => {
        const convId = msg.conversation_id || 'unknown';
        if (!acc[convId]) {
          acc[convId] = {
            conversation_id: convId,
            messages: [],
            lastMessage: '',
            lastTime: '',
          };
        }
        acc[convId].messages.push({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
        });
        return acc;
      }, {} as Record<string, ConversationGroup>);

      // Sort messages within each group and set last message
      const conversationList = Object.values(grouped).map((conv) => {
        conv.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const last = conv.messages[conv.messages.length - 1];
        conv.lastMessage = last?.content || '';
        conv.lastTime = last?.created_at || '';
        return conv;
      });

      // Sort conversations by most recent
      conversationList.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());

      setConversations(conversationList);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">
            {selectedConversation ? 'Conversation' : 'Conversations'}
          </h1>
          <div className="w-10" />
        </header>
      )}

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
                <h2 className="text-lg font-semibold">Menu</h2>
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
                      item.path === '/conversations'
                        ? 'bg-secondary text-foreground'
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
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left w-full"
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

      {/* Desktop Sidebar */}
      {!isMobile && (
        <motion.aside
          initial={false}
          animate={{ width: desktopSidebarOpen ? 192 : 56 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="border-r border-border p-3 flex flex-col gap-2 overflow-hidden flex-shrink-0 h-screen"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
            className="mb-4 self-end"
          >
            {desktopSidebarOpen ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <PanelLeft className="w-5 h-5" />
            )}
          </Button>

          {mainNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() => item.path && navigate(item.path)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left whitespace-nowrap ${
                item.path === '/conversations'
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {desktopSidebarOpen && <span className="text-sm">{item.label}</span>}
            </button>
          ))}

          <div className="mt-auto border-t border-border pt-3 space-y-2">
            {bottomNavItems.map((item) => (
              <button
                key={item.label}
                onClick={() => item.path && navigate(item.path)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left whitespace-nowrap w-full"
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {desktopSidebarOpen && <span className="text-sm">{item.label}</span>}
              </button>
            ))}
          </div>
        </motion.aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${isMobile ? 'pt-20' : ''} pb-8 px-4 overflow-y-auto`}>
        <div className="max-w-3xl mx-auto">
          {!isMobile && (
            <div className="flex items-center gap-3 py-6">
              {selectedConversation && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </Button>
              )}
              <h1 className="text-2xl font-bold text-foreground">
                {selectedConversation ? 'Conversation' : 'Conversations'}
              </h1>
            </div>
          )}

          {isMobile && selectedConversation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedConversation(null)}
              className="mb-4 gap-2"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back
            </Button>
          )}

          <AnimatePresence mode="wait">
            {!selectedConversation ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Loading conversations...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No conversations yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start talking with the agent to see your conversations here
                    </p>
                  </div>
                ) : (
                  conversations.map((conv, index) => (
                    <motion.button
                      key={conv.conversation_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedConversation(conv)}
                      className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-card/80 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">
                              {conv.lastTime && format(new Date(conv.lastTime), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm text-foreground truncate">
                            {conv.lastMessage.slice(0, 100)}{conv.lastMessage.length > 100 ? '...' : ''}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {conv.messages.length} messages
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-4" />
                      </div>
                    </motion.button>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {selectedConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-secondary text-foreground'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {format(new Date(msg.created_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Conversations;
