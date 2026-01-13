import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Lightbulb, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TOPICS = [
  { value: 'general', label: 'General' },
  { value: 'automations', label: 'Automations' },
  { value: 'ui', label: 'UI/Design' },
  { value: 'meop-ai', label: 'MEOP AI' },
  { value: 'voice', label: 'Voice Agent' },
  { value: 'webhooks', label: 'Webhooks' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
];

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('general');
  const [description, setDescription] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase.from('feedback_items').insert({
        title: `${TOPICS.find(t => t.value === topic)?.label || 'General'} Feedback`,
        description,
        topic,
        user_id: user.id,
        priority: 'medium',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-items'] });
      queryClient.invalidateQueries({ queryKey: ['user-feedback'] });
      setDescription('');
      setTopic('general');
      setOpen(false);
      toast({ title: 'Feedback submitted!', description: 'Thank you for your input.' });
    },
    onError: (error) => {
      console.error('Failed to submit feedback:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Failed to submit', 
        description: 'Please try again.' 
      });
    },
  });

  const handleSubmit = () => {
    if (!description.trim()) return;
    submitMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="border-border text-foreground hover:bg-secondary"
          title="Feedback"
        >
          <Lightbulb className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Share Feedback
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Topic</label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger>
                <SelectValue placeholder="Select topic" />
              </SelectTrigger>
              <SelectContent>
                {TOPICS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Your feedback</label>
            <Textarea
              placeholder="Describe your feedback, suggestion, or bug..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={!description.trim() || submitMutation.isPending}
            className="w-full gap-2"
          >
            {submitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
