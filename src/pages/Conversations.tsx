import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ChevronRight, ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
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
  title?: string;
}

const Conversations = () => {
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      const { data, error } = await supabase
        .from('conversation_transcripts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

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
                          <p className="text-xs text-muted-foreground mt-1">
                            {conv.messages.length} messages
                          </p>
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
              {selectedConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default Conversations;
