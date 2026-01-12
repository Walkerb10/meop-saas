import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

export function usePinMessage() {
  const [pinning, setPinning] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const pinMessage = async (messageId: string, sessionId: string) => {
    if (!user) return false;
    
    setPinning(messageId);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ 
          is_pinned: true, 
          pinned_by: user.id 
        })
        .eq('id', messageId)
        .eq('session_id', sessionId);

      if (error) throw error;

      toast({
        title: 'Message pinned',
        description: 'This message will be prioritized in AI context.',
      });
      return true;
    } catch (err) {
      console.error('Failed to pin message:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to pin message',
      });
      return false;
    } finally {
      setPinning(null);
    }
  };

  const unpinMessage = async (messageId: string, sessionId: string) => {
    setPinning(messageId);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ 
          is_pinned: false, 
          pinned_by: null 
        })
        .eq('id', messageId)
        .eq('session_id', sessionId);

      if (error) throw error;

      toast({
        title: 'Message unpinned',
        description: 'Message removed from priority context.',
      });
      return true;
    } catch (err) {
      console.error('Failed to unpin message:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to unpin message',
      });
      return false;
    } finally {
      setPinning(null);
    }
  };

  return {
    pinMessage,
    unpinMessage,
    pinning,
  };
}
