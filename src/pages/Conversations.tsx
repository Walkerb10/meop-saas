import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ChevronRight, ArrowLeft, Trash2, Loader2, User, Bot, Zap, Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { usePinMessage } from '@/hooks/usePinMessage';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  is_pinned?: boolean;
  session_id?: string;
}

interface ConversationAutomation {
  id: string;
  name: string;
  trigger_type: string;
}

interface ConversationGroup {
  conversation_id: string;
  messages: ConversationMessage[];
  lastMessage: string;
  lastTime: string;
  title?: string;
  automations?: ConversationAutomation[];
}

const Conversations = () => {
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { pinMessage, unpinMessage, pinning } = usePinMessage();
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchConversations();
  }, []);

  const analyzeConversation = async (conv: ConversationGroup): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-conversation', {
        body: { messages: conv.messages.map(m => ({ role: m.role, content: m.content })) }
      });
      if (error) throw error;
      return data?.title || 'Conversation';
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      return 'Conversation';
    }
  };

  const fetchConversations = async () => {
    try {
      // Fetch transcripts
      const { data: transcripts, error: transcriptError } = await supabase
        .from('conversation_transcripts')
        .select('*')
        .order('created_at', { ascending: false });

      if (transcriptError) throw transcriptError;

      // Fetch automations with conversation_id
      const { data: automations } = await supabase
        .from('automations')
        .select('id, name, trigger_type, conversation_id')
        .not('conversation_id', 'is', null);

      // Group automations by conversation_id
      const automationsByConv: Record<string, ConversationAutomation[]> = {};
      (automations || []).forEach((auto) => {
        const convId = (auto as any).conversation_id;
        if (convId) {
          if (!automationsByConv[convId]) automationsByConv[convId] = [];
          automationsByConv[convId].push({
            id: auto.id,
            name: auto.name,
            trigger_type: auto.trigger_type,
          });
        }
      });

      const grouped = (transcripts || []).reduce((acc, msg) => {
        const convId = msg.conversation_id || 'unknown';
        if (!acc[convId]) {
          acc[convId] = {
            conversation_id: convId,
            messages: [],
            lastMessage: '',
            lastTime: '',
            automations: automationsByConv[convId] || [],
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

      const conversationList = Object.values(grouped).map((conv) => {
        conv.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const last = conv.messages[conv.messages.length - 1];
        conv.lastMessage = last?.content || '';
        conv.lastTime = last?.created_at || '';
        return conv;
      });

      conversationList.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
      setConversations(conversationList);

      // Analyze each conversation for a title
      conversationList.forEach(async (conv) => {
        if (conv.messages.length > 0) {
          setAnalyzingIds(prev => new Set(prev).add(conv.conversation_id));
          const title = await analyzeConversation(conv);
          setConversations(prev => prev.map(c => 
            c.conversation_id === conv.conversation_id ? { ...c, title } : c
          ));
          setAnalyzingIds(prev => {
            const next = new Set(prev);
            next.delete(conv.conversation_id);
            return next;
          });
        }
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    setDeletingId(conversationId);
    try {
      const { error } = await supabase
        .from('conversation_transcripts')
        .delete()
        .eq('conversation_id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.conversation_id !== conversationId));
      if (selectedConversation?.conversation_id === conversationId) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    } finally {
      setDeletingId(null);
    }
  };

  // Helper to determine proper role display
  const getRoleDisplay = (role: string): { label: string; isUser: boolean } => {
    const lowerRole = role.toLowerCase();
    if (lowerRole === 'user') {
      return { label: 'You', isUser: true };
    }
    if (lowerRole === 'assistant' || lowerRole === 'agent' || lowerRole === 'ai') {
      return { label: 'Assistant', isUser: false };
    }
    // For 'unknown' or other roles, try to guess based on content patterns
    return { label: 'Assistant', isUser: false };
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {selectedConversation && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedConversation(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-semibold">
              {selectedConversation ? (selectedConversation.title || 'Conversation') : 'Conversations'}
            </h1>
            {!selectedConversation && (
              <p className="text-sm text-muted-foreground mt-1">
                View your conversation history
              </p>
            )}
          </div>
          {selectedConversation && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this conversation and all its messages.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteConversation(selectedConversation.conversation_id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

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
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No conversations yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start talking with the agent to see your conversations here
                  </p>
                </div>
              ) : (
                conversations.map((conv, index) => (
                  <motion.div
                    key={conv.conversation_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative group"
                  >
                    <button
                      onClick={() => setSelectedConversation(conv)}
                      className="w-full text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-card/80 transition-all pr-12"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                            {analyzingIds.has(conv.conversation_id) ? (
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Analyzing...
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-foreground truncate">
                                {conv.title || 'Conversation'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {conv.lastTime && format(new Date(conv.lastTime), 'MMM d, yyyy h:mm a')}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage.slice(0, 80)}{conv.lastMessage.length > 80 ? '...' : ''}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {conv.messages.length} messages
                            </span>
                            {conv.automations && conv.automations.length > 0 && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Zap className="w-3 h-3" />
                                {conv.automations.length} automation{conv.automations.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-4" />
                      </div>
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {deletingId === conv.conversation_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this conversation and all its messages.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteConversation(conv.conversation_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </motion.div>
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
              {/* Automations created in this conversation */}
              {selectedConversation.automations && selectedConversation.automations.length > 0 && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Automations created in this chat</span>
                  </div>
                  <div className="space-y-2">
                    {selectedConversation.automations.map((auto) => (
                      <div key={auto.id} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {auto.trigger_type}
                        </Badge>
                        <span className="text-foreground">{auto.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {selectedConversation.messages.map((msg) => {
                const { label, isUser } = getRoleDisplay(msg.role);
                const isPinned = msg.is_pinned || pinnedMessages.has(msg.id);
                
                const handlePin = async () => {
                  if (isPinned) {
                    const success = await unpinMessage(msg.id, msg.session_id || selectedConversation.conversation_id);
                    if (success) setPinnedMessages(prev => { const n = new Set(prev); n.delete(msg.id); return n; });
                  } else {
                    const success = await pinMessage(msg.id, msg.session_id || selectedConversation.conversation_id);
                    if (success) setPinnedMessages(prev => new Set(prev).add(msg.id));
                  }
                };
                
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 group ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Avatar for assistant */}
                    {!isUser && (
                      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    
                    <div className="relative">
                      {isPinned && (
                        <Badge variant="secondary" className="absolute -top-2 -left-2 text-[10px] px-1.5 py-0.5">
                          <Pin className="w-2.5 h-2.5 mr-0.5" />
                          Pinned
                        </Badge>
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                          isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-foreground border border-border'
                        } ${isPinned ? 'ring-2 ring-primary/30' : ''}`}
                      >
                        <div className={`text-xs mb-1 font-medium ${isUser ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {label}
                        </div>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <div className={`flex items-center justify-between mt-2 ${isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          <p className="text-xs">
                            {format(new Date(msg.created_at), 'h:mm a')}
                          </p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={handlePin}
                                disabled={pinning === msg.id}
                              >
                                {pinning === msg.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : isPinned ? (
                                  <PinOff className="w-3 h-3" />
                                ) : (
                                  <Pin className="w-3 h-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isPinned ? 'Unpin message' : 'Pin for AI context'}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                    
                    {/* Avatar for user */}
                    {isUser && (
                      <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default Conversations;