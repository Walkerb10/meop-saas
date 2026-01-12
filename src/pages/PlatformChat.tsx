import { useState, useRef, useEffect } from 'react';
// MEOP AI - Platform Assistant trained on conversations, knowledge base, and platform data
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { useRAGChat } from '@/hooks/useRAGChat';
import { Send, Bot, User, Loader2, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
export default function PlatformChat() {
  const [input, setInput] = useState('');
  const {
    messages,
    isLoading,
    sendMessage,
    clearMessages
  } = useRAGChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };
  return <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          
          {messages.length > 0 && <Button variant="outline" size="sm" onClick={clearMessages}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Chat
            </Button>}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-6">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg">
                {["What tasks are due this week?", "Show me recent automations", "Who's on the team?", "What executions failed recently?"].map(suggestion => <Button key={suggestion} variant="outline" className="text-sm" onClick={() => sendMessage(suggestion)}>
                    {suggestion}
                  </Button>)}
              </div>
            </div> : <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map(message => <Card key={message.id} className={cn("transition-all", message.role === 'user' ? "ml-auto max-w-[80%] bg-primary text-primary-foreground" : "mr-auto max-w-[80%] bg-muted")}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-1.5 rounded-full shrink-0", message.role === 'user' ? "bg-primary-foreground/20" : "bg-background")}>
                        {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content || <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Thinking...
                            </span>}
                        </p>
                        <p className={cn("text-xs mt-1", message.role === 'user' ? "text-primary-foreground/60" : "text-muted-foreground")}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>)}
            </div>}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about your platform..." disabled={isLoading} className="flex-1" />
            <Button type="submit" disabled={!input.trim() || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>;
}