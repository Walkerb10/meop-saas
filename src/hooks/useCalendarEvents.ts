import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  color: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load calendar events',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (event: {
    title: string;
    description?: string;
    start_time: string;
    end_time?: string;
    all_day?: boolean;
    color?: string;
    assigned_to?: string;
  }) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          title: event.title,
          description: event.description || null,
          start_time: event.start_time,
          end_time: event.end_time || null,
          all_day: event.all_day || false,
          color: event.color || 'primary',
          created_by: user.id,
          assigned_to: event.assigned_to || null,
        });

      if (error) throw error;

      toast({
        title: 'Event created',
        description: 'Calendar event has been added.',
      });
      
      fetchEvents();
    } catch (err) {
      console.error('Failed to create event:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create event',
      });
    }
  };

  const updateEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: 'Event updated',
        description: 'Calendar event has been updated.',
      });
      
      fetchEvents();
    } catch (err) {
      console.error('Failed to update event:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update event',
      });
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: 'Event deleted',
        description: 'Calendar event has been removed.',
      });
      
      fetchEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete event',
      });
    }
  };

  return {
    events,
    loading,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
