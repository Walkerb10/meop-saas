import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CRMLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  stage: string;
  value: number | null;
  notes: string | null;
  source: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  position: number;
}

export const CRM_STAGES = [
  { id: 'new', label: 'New', color: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
  { id: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
  { id: 'proposal', label: 'Proposal', color: 'bg-orange-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-pink-500' },
  { id: 'won', label: 'Won', color: 'bg-green-500' },
  { id: 'lost', label: 'Lost', color: 'bg-red-500' },
];

export function useCRM() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      setLeads((data as CRMLead[]) || []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();

    const channel = supabase
      .channel('crm-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeads]);

  const createLead = async (lead: Partial<CRMLead>) => {
    if (!user) return;
    try {
      const maxPosition = leads.filter(l => l.stage === (lead.stage || 'new')).length;
      const { error } = await supabase
        .from('crm_leads')
        .insert({
          name: lead.name || 'New Lead',
          email: lead.email || null,
          phone: lead.phone || null,
          company: lead.company || null,
          stage: lead.stage || 'new',
          value: lead.value || null,
          notes: lead.notes || null,
          source: lead.source || null,
          assigned_to: lead.assigned_to || null,
          created_by: user.id,
          position: maxPosition,
        });

      if (error) throw error;
      toast.success('Lead created');
      await fetchLeads();
    } catch (err) {
      console.error('Failed to create lead:', err);
      toast.error('Failed to create lead');
    }
  };

  const updateLead = async (id: string, updates: Partial<CRMLead>) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchLeads();
    } catch (err) {
      console.error('Failed to update lead:', err);
      toast.error('Failed to update lead');
    }
  };

  const moveLead = async (leadId: string, newStage: string, newPosition: number) => {
    try {
      // Get current leads in the new stage
      const stageLeads = leads.filter(l => l.stage === newStage && l.id !== leadId);
      
      // Update positions for all leads in the stage
      const updates = stageLeads.map((lead, index) => ({
        id: lead.id,
        position: index >= newPosition ? index + 1 : index,
      }));

      // Update the moved lead
      await supabase
        .from('crm_leads')
        .update({ stage: newStage, position: newPosition, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      // Update other positions
      for (const update of updates) {
        await supabase
          .from('crm_leads')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      await fetchLeads();
    } catch (err) {
      console.error('Failed to move lead:', err);
      toast.error('Failed to move lead');
    }
  };

  const deleteLead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Lead deleted');
      await fetchLeads();
    } catch (err) {
      console.error('Failed to delete lead:', err);
      toast.error('Failed to delete lead');
    }
  };

  const getLeadsByStage = (stage: string) => {
    return leads.filter(l => l.stage === stage).sort((a, b) => a.position - b.position);
  };

  return {
    leads,
    loading,
    createLead,
    updateLead,
    moveLead,
    deleteLead,
    getLeadsByStage,
    refetch: fetchLeads,
  };
}
