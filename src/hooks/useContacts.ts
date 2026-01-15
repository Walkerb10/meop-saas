import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface Contact {
  id: string;
  created_by: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  linkedin: string | null;
  company: string | null;
  website: string | null;
  role: string | null;
  pipeline_id: string | null;
  pipeline_stage: string | null;
  pipeline_position: number | null;
  created_at: string;
  updated_at: string;
}

export const CONTACT_ROLES = [
  'CEO',
  'CTO',
  'Founder',
  'Co-Founder',
  'Manager',
  'Developer',
  'Designer',
  'Marketing',
  'Sales',
  'HR',
  'Investor',
  'Advisor',
  'Other',
] as const;

export interface ContactGroup {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface ContactGroupMember {
  id: string;
  contact_id: string;
  group_id: string;
  added_at: string;
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchContacts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      // Fetch groups with member count
      const { data: groupsData, error: groupsError } = await supabase
        .from('contact_groups')
        .select('*')
        .order('name', { ascending: true });

      if (groupsError) throw groupsError;

      // Get member counts
      const { data: membersData, error: membersError } = await supabase
        .from('contact_group_members')
        .select('group_id');

      if (membersError) throw membersError;

      // Count members per group
      const countMap = new Map<string, number>();
      membersData?.forEach(m => {
        countMap.set(m.group_id, (countMap.get(m.group_id) || 0) + 1);
      });

      const groupsWithCount = groupsData?.map(g => ({
        ...g,
        member_count: countMap.get(g.id) || 0,
      })) || [];

      setGroups(groupsWithCount);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchContacts(), fetchGroups()]);
    setLoading(false);
  }, [fetchContacts, fetchGroups]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createContact = async (contact: Omit<Contact, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('contacts')
        .insert({
          ...contact,
          created_by: user.id,
        });

      if (error) throw error;

      toast({ title: 'Contact created', description: `${contact.name} has been added.` });
      fetchContacts();
    } catch (err) {
      console.error('Failed to create contact:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create contact' });
    }
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Contact updated' });
      fetchContacts();
    } catch (err) {
      console.error('Failed to update contact:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update contact' });
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Contact deleted' });
      fetchContacts();
    } catch (err) {
      console.error('Failed to delete contact:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete contact' });
    }
  };

  const createGroup = async (group: { name: string; description?: string; color?: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('contact_groups')
        .insert({
          ...group,
          created_by: user.id,
        });

      if (error) throw error;

      toast({ title: 'Group created', description: `${group.name} has been added.` });
      fetchGroups();
    } catch (err) {
      console.error('Failed to create group:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create group' });
    }
  };

  const updateGroup = async (id: string, updates: Partial<ContactGroup>) => {
    try {
      const { error } = await supabase
        .from('contact_groups')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Group updated' });
      fetchGroups();
    } catch (err) {
      console.error('Failed to update group:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update group' });
    }
  };

  const deleteGroup = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contact_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Group deleted' });
      fetchGroups();
    } catch (err) {
      console.error('Failed to delete group:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete group' });
    }
  };

  const addContactToGroup = async (contactId: string, groupId: string) => {
    try {
      const { error } = await supabase
        .from('contact_group_members')
        .insert({ contact_id: contactId, group_id: groupId });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Already in group', description: 'Contact is already in this group.' });
          return;
        }
        throw error;
      }

      toast({ title: 'Contact added to group' });
      fetchGroups();
    } catch (err) {
      console.error('Failed to add contact to group:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add contact to group' });
    }
  };

  const removeContactFromGroup = async (contactId: string, groupId: string) => {
    try {
      const { error } = await supabase
        .from('contact_group_members')
        .delete()
        .eq('contact_id', contactId)
        .eq('group_id', groupId);

      if (error) throw error;

      toast({ title: 'Contact removed from group' });
      fetchGroups();
    } catch (err) {
      console.error('Failed to remove contact from group:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove contact from group' });
    }
  };

  const getGroupMembers = async (groupId: string): Promise<Contact[]> => {
    try {
      const { data, error } = await supabase
        .from('contact_group_members')
        .select('contact_id')
        .eq('group_id', groupId);

      if (error) throw error;

      const contactIds = data?.map(m => m.contact_id) || [];
      if (contactIds.length === 0) return [];

      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .in('id', contactIds);

      if (contactsError) throw contactsError;

      return contactsData || [];
    } catch (err) {
      console.error('Failed to fetch group members:', err);
      return [];
    }
  };

  const getContactGroups = async (contactId: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('contact_group_members')
        .select('group_id')
        .eq('contact_id', contactId);

      if (error) throw error;

      return data?.map(m => m.group_id) || [];
    } catch (err) {
      console.error('Failed to fetch contact groups:', err);
      return [];
    }
  };

  return {
    contacts,
    groups,
    loading,
    fetchAll,
    createContact,
    updateContact,
    deleteContact,
    createGroup,
    updateGroup,
    deleteGroup,
    addContactToGroup,
    removeContactFromGroup,
    getGroupMembers,
    getContactGroups,
  };
}
