import { useState, useEffect } from 'react';
import { Plus, Send, Trash2, Edit2, Clock, CheckCircle, FileText, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MarketingEmail {
  id: string;
  subject: string;
  content: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface NewsletterSubscriber {
  id: string;
  email: string;
  name: string | null;
  subscribed_at: string;
  is_active: boolean;
  source: string | null;
}

export function MarketingEmailsManager() {
  const { user } = useAuth();
  const [emails, setEmails] = useState<MarketingEmail[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingEmail, setEditingEmail] = useState<MarketingEmail | null>(null);
  const [viewSubscribers, setViewSubscribers] = useState(false);
  const [newEmail, setNewEmail] = useState({
    subject: '',
    content: '',
    scheduled_for: '',
  });

  const fetchData = async () => {
    try {
      const [emailsRes, subscribersRes] = await Promise.all([
        supabase.from('marketing_emails').select('*').order('created_at', { ascending: false }),
        supabase.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false }),
      ]);

      if (emailsRes.error) throw emailsRes.error;
      if (subscribersRes.error) throw subscribersRes.error;

      setEmails((emailsRes.data as MarketingEmail[]) || []);
      setSubscribers((subscribersRes.data as NewsletterSubscriber[]) || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load marketing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!user || !newEmail.subject.trim()) return;
    try {
      const { error } = await supabase.from('marketing_emails').insert({
        subject: newEmail.subject,
        content: newEmail.content,
        scheduled_for: newEmail.scheduled_for || null,
        created_by: user.id,
        status: newEmail.scheduled_for ? 'scheduled' : 'draft',
      });

      if (error) throw error;
      toast.success('Email created');
      setNewEmail({ subject: '', content: '', scheduled_for: '' });
      setShowCreate(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to create email:', err);
      toast.error('Failed to create email');
    }
  };

  const handleUpdate = async () => {
    if (!editingEmail) return;
    try {
      const { error } = await supabase
        .from('marketing_emails')
        .update({
          subject: editingEmail.subject,
          content: editingEmail.content,
          scheduled_for: editingEmail.scheduled_for,
          status: editingEmail.scheduled_for ? 'scheduled' : 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingEmail.id);

      if (error) throw error;
      toast.success('Email updated');
      setEditingEmail(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to update email:', err);
      toast.error('Failed to update email');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('marketing_emails').delete().eq('id', id);
      if (error) throw error;
      toast.success('Email deleted');
      await fetchData();
    } catch (err) {
      console.error('Failed to delete email:', err);
      toast.error('Failed to delete email');
    }
  };

  const handleRemoveSubscriber = async (id: string) => {
    try {
      const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', id);
      if (error) throw error;
      toast.success('Subscriber removed');
      await fetchData();
    } catch (err) {
      console.error('Failed to remove subscriber:', err);
      toast.error('Failed to remove subscriber');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><FileText className="w-3 h-3 mr-1" />Draft</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Marketing Emails</h2>
          <p className="text-sm text-muted-foreground">{subscribers.filter(s => s.is_active).length} active subscribers</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={viewSubscribers} onOpenChange={setViewSubscribers}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Users className="w-4 h-4" />
                Subscribers
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Newsletter Subscribers ({subscribers.length})</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[400px] mt-4">
                <div className="space-y-2">
                  {subscribers.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border">
                      <div>
                        <p className="font-medium text-sm">{sub.email}</p>
                        {sub.name && <p className="text-xs text-muted-foreground">{sub.name}</p>}
                        <p className="text-xs text-muted-foreground">
                          Joined {format(new Date(sub.subscribed_at), 'MMM d, yyyy')}
                          {sub.source && ` via ${sub.source}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={sub.is_active ? 'default' : 'secondary'}>
                          {sub.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSubscriber(sub.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {subscribers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No subscribers yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                New Email
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Marketing Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Input
                    value={newEmail.subject}
                    onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                    placeholder="Email subject line"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={newEmail.content}
                    onChange={(e) => setNewEmail({ ...newEmail, content: e.target.value })}
                    placeholder="Email body content..."
                    rows={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Schedule For (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={newEmail.scheduled_for}
                    onChange={(e) => setNewEmail({ ...newEmail, scheduled_for: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">Create Email</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingEmail} onOpenChange={(open) => !open && setEditingEmail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Email</DialogTitle>
          </DialogHeader>
          {editingEmail && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={editingEmail.subject}
                  onChange={(e) => setEditingEmail({ ...editingEmail, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={editingEmail.content}
                  onChange={(e) => setEditingEmail({ ...editingEmail, content: e.target.value })}
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <Label>Schedule For</Label>
                <Input
                  type="datetime-local"
                  value={editingEmail.scheduled_for || ''}
                  onChange={(e) => setEditingEmail({ ...editingEmail, scheduled_for: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdate} className="flex-1">Save Changes</Button>
                <Button variant="destructive" size="icon" onClick={() => { handleDelete(editingEmail.id); setEditingEmail(null); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Emails List */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Emails ({emails.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="p-4 rounded-lg bg-secondary/30 border cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setEditingEmail(email)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{email.subject}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{email.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(email.status)}
                        {email.scheduled_for && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(email.scheduled_for), 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleDelete(email.id); }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {emails.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No emails yet. Create one to get started.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
