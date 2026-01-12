import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  template: 'assistant' | 'researcher' | 'scheduler' | 'custom';
  status: 'active' | 'inactive' | 'error';
  config: {
    model?: string;
    voice?: string;
    systemPrompt?: string;
    tools?: string[];
    temperature?: number;
    maxTokens?: number;
  };
  stats: {
    totalConversations: number;
    totalExecutions: number;
    lastActive: string | null;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Mock agents for demo - in production, this would come from a database table
const MOCK_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'MEOP Assistant',
    description: 'General purpose AI assistant for conversations and tasks',
    template: 'assistant',
    status: 'active',
    config: {
      model: 'gpt-5',
      voice: 'alloy',
      systemPrompt: 'You are a helpful AI assistant.',
      tools: ['research', 'calendar', 'tasks'],
      temperature: 0.7,
    },
    stats: {
      totalConversations: 156,
      totalExecutions: 423,
      lastActive: new Date().toISOString(),
    },
    created_by: 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Research Agent',
    description: 'Specialized agent for deep research and analysis',
    template: 'researcher',
    status: 'active',
    config: {
      model: 'google/gemini-2.5-pro',
      systemPrompt: 'You are a research specialist focused on finding accurate information.',
      tools: ['research', 'web_search'],
      temperature: 0.3,
    },
    stats: {
      totalConversations: 45,
      totalExecutions: 189,
      lastActive: new Date(Date.now() - 3600000).toISOString(),
    },
    created_by: 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const AGENT_TEMPLATES = {
  assistant: {
    name: 'General Assistant',
    description: 'Versatile AI for conversations and general tasks',
    icon: '🤖',
    defaultConfig: {
      model: 'gpt-5',
      temperature: 0.7,
      tools: ['research', 'calendar', 'tasks'],
    },
  },
  researcher: {
    name: 'Research Specialist',
    description: 'Deep research and analysis expert',
    icon: '🔍',
    defaultConfig: {
      model: 'google/gemini-2.5-pro',
      temperature: 0.3,
      tools: ['research', 'web_search'],
    },
  },
  scheduler: {
    name: 'Scheduler',
    description: 'Calendar and automation manager',
    icon: '📅',
    defaultConfig: {
      model: 'gpt-5-mini',
      temperature: 0.5,
      tools: ['calendar', 'tasks', 'notifications'],
    },
  },
  custom: {
    name: 'Custom Agent',
    description: 'Build from scratch with full customization',
    icon: '⚙️',
    defaultConfig: {
      model: 'gpt-5',
      temperature: 0.7,
      tools: [],
    },
  },
};

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const createAgent = useCallback(async (agent: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'stats'>) => {
    const newAgent: Agent = {
      ...agent,
      id: crypto.randomUUID(),
      stats: {
        totalConversations: 0,
        totalExecutions: 0,
        lastActive: null,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setAgents(prev => [...prev, newAgent]);
    toast({ title: 'Agent created successfully!' });
    return newAgent;
  }, [toast]);

  const updateAgent = useCallback(async (id: string, updates: Partial<Agent>) => {
    setAgents(prev => 
      prev.map(a => a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a)
    );
    toast({ title: 'Agent updated' });
  }, [toast]);

  const deleteAgent = useCallback(async (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id));
    toast({ title: 'Agent deleted' });
  }, [toast]);

  const toggleAgentStatus = useCallback(async (id: string) => {
    setAgents(prev => 
      prev.map(a => 
        a.id === id 
          ? { ...a, status: a.status === 'active' ? 'inactive' : 'active', updated_at: new Date().toISOString() }
          : a
      )
    );
  }, []);

  return {
    agents,
    loading,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgentStatus,
  };
}
