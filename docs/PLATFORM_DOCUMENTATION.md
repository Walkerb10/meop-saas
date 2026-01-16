# Platform Documentation - Living Second Brain

> **Last Updated:** January 16, 2026  
> **Version:** 1.0.0

This document serves as the living documentation for the platform, updated as features are built and refined.

---

## 🎯 Platform Vision & Goals

### Mission
Build an AI-powered business operating system that acts as a **living second brain** - capturing knowledge, automating workflows, and providing intelligent assistance across all business operations.

### Core Principles
1. **Voice-First Interaction** - Natural conversation as the primary interface
2. **Automated Execution** - Set it and forget it scheduled automations
3. **Collective Memory** - RAG-powered knowledge base that learns from every interaction
4. **Role-Based Access** - Fine-grained permissions for team collaboration

---

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (Postgres, Auth, Edge Functions, Realtime)
- **AI:** Lovable AI (Gemini 2.5 Flash for embeddings and chat)
- **Voice:** VAPI for conversational AI
- **Automation:** n8n webhooks for external integrations

### Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `knowledge_base` | RAG entries with embeddings for semantic search |
| `automations` | Workflow definitions with nodes/connections |
| `sequences` | Legacy step-based automations |
| `executions` | Audit log of all automation runs |
| `chat_messages` | Platform chat history with embeddings |
| `chat_sessions` | Session management with summaries |
| `user_memories` | Personalized user context for AI |
| `team_members` | Team roster and Slack integration |
| `team_tasks` | Task management with assignments |
| `user_roles` | Role-based access control (owner/admin/manager/member/tester) |

---

## 🤖 AI & RAG System

### Knowledge Base Categories
The RAG system uses semantic categories for optimal retrieval:

| Category | Purpose | Auto-Ingested? |
|----------|---------|----------------|
| `business_context` | Core business information, goals, processes | Yes (from meaningful conversations) |
| `team_conversation` | Summarized chat sessions | Yes (after 10min inactivity) |
| `uploaded_document` | User-uploaded files | No (manual) |
| `image_description` | AI-generated descriptions of uploaded images | No (manual) |
| `manual_entry` | Manually added knowledge | No (manual) |
| `research_output` | Results from research automations | Yes (from automation results) |
| `contact_info` | CRM and contact data | Yes (from contact creation) |
| `workflow_knowledge` | Automation and workflow patterns | Yes (from workflow creation) |

### Embedding Pipeline
1. User message → Generate embedding via Lovable AI
2. Semantic search against `knowledge_base`, `chat_messages`, `user_memories`
3. Context injection into system prompt
4. AI response with grounded information

### Auto-Ingestion Rules
- Messages > 50 characters are auto-added to knowledge base
- Sessions summarized after 10 minutes of inactivity
- Research outputs automatically stored with category tagging

---

## 🔄 Automation System

### Trigger Types
| Type | Description | Scheduled? |
|------|-------------|-----------|
| `manual` | Triggered by user action | No |
| `schedule` | Time-based triggers | Yes |
| `webhook` | External webhook triggers | No |
| `voice` | Created via voice command | Depends on config |
| `one_time` | Single scheduled execution | Yes (once) |

### Action Types
| Action | Webhook | Purpose |
|--------|---------|---------|
| `action_research` | Internal Edge Function | AI-powered research |
| `action_text` | n8n → Twilio | Send SMS |
| `action_email` | n8n → Email | Send email |
| `action_slack` | n8n → Slack | Post to Slack |
| `action_discord` | n8n → Discord | Post to Discord |
| `action_delay` | Internal | Wait between steps |

### Scheduler
The `run-scheduled-automations` Edge Function runs every minute via pg_cron:
- Checks all active scheduled automations
- Compares current time (EST) with configured schedule
- Triggers matching automations via `execute-automation`
- Updates `last_run_at` timestamp
- Sends SMS alert to admin (+18434124009) on failures

### Schedule Configurations
```json
{
  "frequency": "daily" | "weekly" | "monthly" | "one_time" | "every_x_days",
  "scheduled_time": "HH:MM",
  "day_of_week": "monday" | "tuesday" | ...,
  "days": ["monday", "friday"],
  "day_of_month": 15,
  "custom_date": "2026-01-20",
  "every_x_days": 3
}
```

---

## 👥 Role-Based Access Control

### Roles (Hierarchical)
1. **Owner** - Full platform access, billing, user management
2. **Admin** - All features except billing
3. **Manager** - Team management, automations, CRM
4. **Member** - Standard access, personal automations
5. **Tester** - Limited access, agent and basic automations only

### Permission Matrix

| Feature | Owner | Admin | Manager | Member | Tester |
|---------|-------|-------|---------|--------|--------|
| Admin Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ |
| User Management | ✅ | ✅ | ❌ | ❌ | ❌ |
| View All Conversations | ✅ | ✅ | ✅ | ❌ | ❌ |
| Analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| CRM Full Access | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create Automations | ✅ | ✅ | ✅ | ✅ | ✅ |
| Agent Access | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🎤 Voice Interface

### VAPI Integration
- Real-time voice conversations via VAPI SDK
- Tool calling for automation creation, research, messaging
- Transcript storage with embeddings for RAG

### Voice Commands
- "Research [topic]" → Triggers research automation
- "Send a text to [person] saying [message]" → SMS via n8n
- "Create an automation that [description]" → Workflow creation
- "Set a reminder for [time]" → Scheduled notification

---

## 📊 Key Edge Functions

| Function | Purpose |
|----------|---------|
| `rag-chat` | Main AI chat with semantic search |
| `vapi-webhook` | Voice command processing |
| `execute-automation` | Run workflow nodes |
| `execute-sequence` | Run legacy sequences |
| `run-scheduled-automations` | Cron scheduler (runs every minute) |
| `webhook-research` | AI research via Perplexity |
| `generate-embedding` | Create vector embeddings |
| `summarize-session` | Summarize chat sessions |

---

## 🔧 n8n Webhooks

| Purpose | Webhook URL |
|---------|-------------|
| SMS | `https://walkerb.app.n8n.cloud/webhook/ca69f6f3-2405-45bc-9ad0-9ce78744fbe2` |
| Slack | `https://walkerb.app.n8n.cloud/webhook/067d7cbd-f49b-4641-aaab-6cb65617cb68` |
| Discord | `https://walkerb.app.n8n.cloud/webhook/de3262c9-cf10-4ba9-bf0f-87ba31a1144c` |
| Email | `https://walkerb.app.n8n.cloud/webhook/0bad5a52-1f17-4c90-9ca2-6d4aee1661f7` |

---

## 📝 Recent Updates

### January 16, 2026
- ✅ Created `run-scheduled-automations` Edge Function for cron-based execution
- ✅ Added living documentation system
- ✅ Enhanced RAG database structure with semantic categories
- ✅ Implemented voice/text mode context preservation
- ✅ Disabled dictation mic during active voice calls

### Previous Updates
- Voice orb animation with instant-dock behavior
- Admin dashboard with user management
- Webhook payload inspection in admin
- Multi-step visual workflow builder
- Research output formatting (500 words, 5th-grade reading level)

---

## 🚀 Roadmap

### In Progress
- [ ] Text reminder notification system
- [ ] Enhanced team permissions UI
- [ ] Calendar integration with time blocks

### Planned
- [ ] Mobile-responsive workflow builder
- [ ] Email template library
- [ ] Slack bot for direct commands
- [ ] Analytics dashboard improvements
- [ ] Custom knowledge base training interface

---

## 📌 Admin Contact
- **Admin Phone:** +18434124009 (receives error SMS alerts)
- **Default Slack Channel:** #team-updates
- **Default Discord Channel:** #bot-updates

---

*This document is automatically referenced by the RAG system and should be kept up to date as the platform evolves.*
