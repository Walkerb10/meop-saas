export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      automations: {
        Row: {
          conversation_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          n8n_webhook_url: string | null
          name: string
          steps: Json
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          n8n_webhook_url?: string | null
          name: string
          steps?: Json
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          n8n_webhook_url?: string | null
          name?: string
          steps?: Json
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          assigned_to: string | null
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          id: string
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          assigned_to?: string | null
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_time?: string | null
          id?: string
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          assigned_to?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string | null
          id?: string
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_time_blocks: {
        Row: {
          assigned_to: string | null
          calendar_id: string | null
          created_at: string
          created_by: string
          date: string
          description: string | null
          end_time: string
          id: string
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          calendar_id?: string | null
          created_at?: string
          created_by: string
          date: string
          description?: string | null
          end_time: string
          id?: string
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          calendar_id?: string | null
          created_at?: string
          created_by?: string
          date?: string
          description?: string | null
          end_time?: string
          id?: string
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_time_blocks_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "user_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_data_permissions: {
        Row: {
          can_add_knowledge: boolean | null
          can_view_all_automations: boolean | null
          can_view_all_conversations: boolean | null
          can_view_all_executions: boolean | null
          can_view_knowledge_base: boolean | null
          can_view_team_activity: boolean | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_add_knowledge?: boolean | null
          can_view_all_automations?: boolean | null
          can_view_all_conversations?: boolean | null
          can_view_all_executions?: boolean | null
          can_view_knowledge_base?: boolean | null
          can_view_team_activity?: boolean | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_add_knowledge?: boolean | null
          can_view_all_automations?: boolean | null
          can_view_all_conversations?: boolean | null
          can_view_all_executions?: boolean | null
          can_view_knowledge_base?: boolean | null
          can_view_team_activity?: boolean | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          context_used: Json | null
          created_at: string
          embedding: string | null
          id: string
          is_pinned: boolean | null
          pinned_by: string | null
          role: string
          session_id: string
          tool_calls: Json | null
          user_id: string | null
        }
        Insert: {
          content: string
          context_used?: Json | null
          created_at?: string
          embedding?: string | null
          id?: string
          is_pinned?: boolean | null
          pinned_by?: string | null
          role: string
          session_id: string
          tool_calls?: Json | null
          user_id?: string | null
        }
        Update: {
          content?: string
          context_used?: Json | null
          created_at?: string
          embedding?: string | null
          id?: string
          is_pinned?: boolean | null
          pinned_by?: string | null
          role?: string
          session_id?: string
          tool_calls?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          is_pinned: boolean | null
          is_summarized: boolean | null
          key_topics: string[] | null
          summary: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          is_summarized?: boolean | null
          key_topics?: string[] | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          is_summarized?: boolean | null
          key_topics?: string[] | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_group_members: {
        Row: {
          added_at: string
          contact_id: string
          group_id: string
          id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          group_id: string
          id?: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_group_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_groups: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          linkedin: string | null
          name: string
          notes: string | null
          phone: string | null
          pipeline_id: string | null
          pipeline_position: number | null
          pipeline_stage: string | null
          role: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          linkedin?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          pipeline_id?: string | null
          pipeline_position?: number | null
          pipeline_stage?: string | null
          role?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          linkedin?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          pipeline_id?: string | null
          pipeline_position?: number | null
          pipeline_stage?: string | null
          role?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_transcripts: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          embedding: string | null
          id: string
          raw_payload: Json | null
          role: string
          user_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          raw_payload?: Json | null
          role: string
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          raw_payload?: Json | null
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          pipeline_id: string | null
          position: number
          source: string | null
          stage: string
          updated_at: string
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          pipeline_id?: string | null
          position?: number
          source?: string | null
          stage?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          pipeline_id?: string | null
          position?: number
          source?: string | null
          stage?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      executions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          input_data: Json | null
          notification_sent: boolean | null
          output_data: Json | null
          requires_human_review: boolean | null
          sequence_name: string
          started_at: string
          status: string
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          notification_sent?: boolean | null
          output_data?: Json | null
          requires_human_review?: boolean | null
          sequence_name: string
          started_at?: string
          status?: string
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          notification_sent?: boolean | null
          output_data?: Json | null
          requires_human_review?: boolean | null
          sequence_name?: string
          started_at?: string
          status?: string
          workflow_id?: string | null
        }
        Relationships: []
      }
      feature_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          feature_key: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          feature_key: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_access?: boolean
          created_at?: string
          feature_key?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      feedback_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          priority: string | null
          status: string
          title: string
          topic: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          status?: string
          title: string
          topic?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          priority?: string | null
          status?: string
          title?: string
          topic?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          access_count: number | null
          allowed_roles: Database["public"]["Enums"]["app_role"][] | null
          category: string
          chunk_index: number | null
          content: string
          created_at: string
          created_by: string | null
          embedding: string | null
          expires_at: string | null
          file_name: string | null
          file_url: string | null
          id: string
          importance_score: number | null
          is_archived: boolean | null
          is_public: boolean
          is_shared: boolean | null
          last_accessed_at: string | null
          metadata: Json | null
          related_entries: string[] | null
          source_type: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          access_count?: number | null
          allowed_roles?: Database["public"]["Enums"]["app_role"][] | null
          category?: string
          chunk_index?: number | null
          content: string
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          expires_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          importance_score?: number | null
          is_archived?: boolean | null
          is_public?: boolean
          is_shared?: boolean | null
          last_accessed_at?: string | null
          metadata?: Json | null
          related_entries?: string[] | null
          source_type?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          access_count?: number | null
          allowed_roles?: Database["public"]["Enums"]["app_role"][] | null
          category?: string
          chunk_index?: number | null
          content?: string
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          expires_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          importance_score?: number | null
          is_archived?: boolean | null
          is_public?: boolean
          is_shared?: boolean | null
          last_accessed_at?: string | null
          metadata?: Json | null
          related_entries?: string[] | null
          source_type?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_emails: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          recipient_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          recipient_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          recipient_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      n8n_tools: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          webhook_url?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          name: string | null
          source: string | null
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          name?: string | null
          source?: string | null
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          name?: string | null
          source?: string | null
          subscribed_at?: string
        }
        Relationships: []
      }
      pipelines: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          stages: Json
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          stages?: Json
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          stages?: Json
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompt_analytics: {
        Row: {
          analysis_period_end: string
          analysis_period_start: string
          avg_clarity_score: number | null
          avg_context_score: number | null
          avg_effectiveness_score: number | null
          avg_specificity_score: number | null
          created_at: string
          id: string
          improvement_areas: string[] | null
          overall_score: number | null
          recommendations: string | null
          sample_prompts: Json | null
          strengths: string[] | null
          total_prompts: number | null
          user_id: string
        }
        Insert: {
          analysis_period_end: string
          analysis_period_start: string
          avg_clarity_score?: number | null
          avg_context_score?: number | null
          avg_effectiveness_score?: number | null
          avg_specificity_score?: number | null
          created_at?: string
          id?: string
          improvement_areas?: string[] | null
          overall_score?: number | null
          recommendations?: string | null
          sample_prompts?: Json | null
          strengths?: string[] | null
          total_prompts?: number | null
          user_id: string
        }
        Update: {
          analysis_period_end?: string
          analysis_period_start?: string
          avg_clarity_score?: number | null
          avg_context_score?: number | null
          avg_effectiveness_score?: number | null
          avg_specificity_score?: number | null
          created_at?: string
          id?: string
          improvement_areas?: string[] | null
          overall_score?: number | null
          recommendations?: string | null
          sample_prompts?: Json | null
          strengths?: string[] | null
          total_prompts?: number | null
          user_id?: string
        }
        Relationships: []
      }
      prompt_tracking: {
        Row: {
          clarity_score: number | null
          context_score: number | null
          created_at: string
          effectiveness_score: number | null
          feedback: string | null
          id: string
          prompt_text: string
          prompt_type: string | null
          session_id: string | null
          specificity_score: number | null
          user_id: string
        }
        Insert: {
          clarity_score?: number | null
          context_score?: number | null
          created_at?: string
          effectiveness_score?: number | null
          feedback?: string | null
          id?: string
          prompt_text: string
          prompt_type?: string | null
          session_id?: string | null
          specificity_score?: number | null
          user_id: string
        }
        Update: {
          clarity_score?: number | null
          context_score?: number | null
          created_at?: string
          effectiveness_score?: number | null
          feedback?: string | null
          id?: string
          prompt_text?: string
          prompt_type?: string | null
          session_id?: string | null
          specificity_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      sequence_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: number | null
          error_message: string | null
          id: string
          input_data: Json | null
          sequence_id: string
          started_at: string
          status: string
          step_results: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          sequence_id: string
          started_at?: string
          status?: string
          step_results?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          sequence_id?: string
          started_at?: string
          status?: string
          step_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_executions_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          steps: Json
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          steps?: Json
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          steps?: Json
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          invited_by: string | null
          is_active: boolean
          slack_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          slack_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          slack_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_tasks: {
        Row: {
          assigned_to: string | null
          calendar_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          estimated_minutes: number | null
          id: string
          is_pinned: boolean | null
          priority: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          calendar_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          is_pinned?: boolean | null
          priority?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          calendar_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          is_pinned?: boolean | null
          priority?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_tasks_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "user_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      user_calendars: {
        Row: {
          calendar_type: string
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          calendar_type?: string
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          calendar_type?: string
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_memories: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          memory_type: string
          source_conversation_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          memory_type?: string
          source_conversation_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          memory_type?: string
          source_conversation_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_sessions_needing_summary: {
        Args: never
        Returns: {
          last_message_at: string
          message_count: number
          session_id: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      match_chat_messages: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          target_user_id?: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          role: string
          session_id: string
          similarity: number
        }[]
      }
      match_conversations: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          target_user_id?: string
        }
        Returns: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          similarity: number
        }[]
      }
      match_knowledge_entries: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          title: string
        }[]
      }
      match_user_memories: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          target_user_id: string
        }
        Returns: {
          content: string
          id: string
          memory_type: string
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "manager" | "member" | "tester"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "manager", "member", "tester"],
    },
  },
} as const
