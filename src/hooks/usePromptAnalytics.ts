import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PromptAnalysis {
  clarity_score: number;
  specificity_score: number;
  context_score: number;
  effectiveness_score: number;
  feedback: string;
}

interface WeeklyAnalytics {
  id: string;
  user_id: string;
  analysis_period_start: string;
  analysis_period_end: string;
  total_prompts: number;
  avg_clarity_score: number;
  avg_specificity_score: number;
  avg_context_score: number;
  avg_effectiveness_score: number;
  overall_score: number;
  strengths: string[];
  improvement_areas: string[];
  recommendations: string;
  sample_prompts: { prompt: string; score: number }[];
  created_at: string;
}

export function usePromptAnalytics() {
  const { user } = useAuth();
  const [weeklyAnalytics, setWeeklyAnalytics] = useState<WeeklyAnalytics[]>([]);
  const [latestAnalysis, setLatestAnalysis] = useState<WeeklyAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompt_analytics')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        analysis_period_start: row.analysis_period_start,
        analysis_period_end: row.analysis_period_end,
        total_prompts: row.total_prompts,
        avg_clarity_score: Number(row.avg_clarity_score),
        avg_specificity_score: Number(row.avg_specificity_score),
        avg_context_score: Number(row.avg_context_score),
        avg_effectiveness_score: Number(row.avg_effectiveness_score),
        overall_score: Number(row.overall_score),
        strengths: row.strengths || [],
        improvement_areas: row.improvement_areas || [],
        recommendations: row.recommendations || '',
        sample_prompts: row.sample_prompts || [],
        created_at: row.created_at,
      }));

      setWeeklyAnalytics(mapped);
      if (mapped.length > 0) {
        setLatestAnalysis(mapped[0]);
      }
    } catch (err) {
      console.error('Failed to fetch prompt analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const analyzeSinglePrompt = useCallback(async (prompt: string, sessionId?: string): Promise<PromptAnalysis | null> => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase.functions.invoke('analyze-prompts', {
        body: {
          action: 'analyze_single',
          userId: user.id,
          prompt,
          sessionId,
        },
      });

      if (error) throw error;
      return data as PromptAnalysis;
    } catch (err) {
      console.error('Failed to analyze prompt:', err);
      return null;
    }
  }, [user?.id]);

  const generateWeeklyAnalysis = useCallback(async () => {
    if (!user?.id) return null;

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-prompts', {
        body: {
          action: 'weekly_analysis',
          userId: user.id,
        },
      });

      if (error) throw error;

      // Refresh analytics after generation
      await fetchAnalytics();
      return data;
    } catch (err) {
      console.error('Failed to generate weekly analysis:', err);
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, [user?.id, fetchAnalytics]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    fetchAnalytics();

    const channel = supabase
      .channel('prompt-analytics-changes')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'prompt_analytics',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchAnalytics]);

  return {
    weeklyAnalytics,
    latestAnalysis,
    loading,
    analyzing,
    analyzeSinglePrompt,
    generateWeeklyAnalysis,
    refetch: fetchAnalytics,
  };
}
