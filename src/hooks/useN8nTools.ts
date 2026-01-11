import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface N8nTool {
  id: string;
  title: string;
  webhookUrl: string;
  description: string;
}

interface DbN8nTool {
  id: string;
  user_id: string;
  title: string;
  webhook_url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const useN8nTools = () => {
  const { user } = useAuth();
  const [tools, setTools] = useState<N8nTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTools = async () => {
    if (!user) {
      setTools([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('n8n_tools')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching n8n tools:', fetchError);
      setError(fetchError.message);
    } else {
      setTools(
        (data as DbN8nTool[]).map((tool) => ({
          id: tool.id,
          title: tool.title,
          webhookUrl: tool.webhook_url,
          description: tool.description || '',
        }))
      );
    }

    setLoading(false);
  };

  const addTool = async (tool: Omit<N8nTool, 'id'>): Promise<boolean> => {
    if (!user) return false;

    const { data, error: insertError } = await supabase
      .from('n8n_tools')
      .insert({
        user_id: user.id,
        title: tool.title,
        webhook_url: tool.webhookUrl,
        description: tool.description || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding n8n tool:', insertError);
      setError(insertError.message);
      return false;
    }

    const dbTool = data as DbN8nTool;
    setTools((prev) => [
      {
        id: dbTool.id,
        title: dbTool.title,
        webhookUrl: dbTool.webhook_url,
        description: dbTool.description || '',
      },
      ...prev,
    ]);

    return true;
  };

  const updateTool = async (id: string, updates: Partial<Omit<N8nTool, 'id'>>): Promise<boolean> => {
    if (!user) return false;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.webhookUrl !== undefined) dbUpdates.webhook_url = updates.webhookUrl;
    if (updates.description !== undefined) dbUpdates.description = updates.description || null;

    const { error: updateError } = await supabase
      .from('n8n_tools')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating n8n tool:', updateError);
      setError(updateError.message);
      return false;
    }

    setTools((prev) =>
      prev.map((tool) =>
        tool.id === id
          ? { ...tool, ...updates }
          : tool
      )
    );

    return true;
  };

  const deleteTool = async (id: string): Promise<boolean> => {
    if (!user) return false;

    const { error: deleteError } = await supabase
      .from('n8n_tools')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting n8n tool:', deleteError);
      setError(deleteError.message);
      return false;
    }

    setTools((prev) => prev.filter((tool) => tool.id !== id));
    return true;
  };

  useEffect(() => {
    fetchTools();
  }, [user]);

  return {
    tools,
    loading,
    error,
    addTool,
    updateTool,
    deleteTool,
    refetch: fetchTools,
  };
};
