import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutomationTriggerConfig {
  frequency?: string;
  scheduled_time?: string;
  time?: string;
  day_of_week?: string;
  days?: string[];
  day_of_month?: number;
  custom_date?: string;
  every_x_days?: number;
}

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: AutomationTriggerConfig;
  is_active: boolean;
  last_run_at: string | null;
}

// Helper to get current time in a specific timezone (default EST)
function getCurrentTimeInTimezone(timezone = 'America/New_York'): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
}

// Check if automation should run now
function shouldRunNow(automation: Automation): boolean {
  const config = automation.trigger_config || {};
  const now = getCurrentTimeInTimezone();
  
  const scheduledTime = config.scheduled_time || config.time;
  if (!scheduledTime) {
    console.log(`⚠️ ${automation.name}: No scheduled time configured`);
    return false;
  }

  // Parse scheduled time (HH:MM format)
  const [schedHour, schedMinute] = scheduledTime.split(':').map(Number);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Check if within the same minute (cron runs every minute)
  if (currentHour !== schedHour || currentMinute !== schedMinute) {
    return false;
  }

  const frequency = config.frequency || 'daily';
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayOfMonth = now.getDate();

  switch (frequency) {
    case 'daily':
      return true;

    case 'weekly': {
      const configuredDays = config.days || (config.day_of_week ? [config.day_of_week] : []);
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayName = dayNames[dayOfWeek];
      return configuredDays.some(d => d.toLowerCase() === todayName);
    }

    case 'monthly': {
      const configuredDay = config.day_of_month;
      return configuredDay === dayOfMonth;
    }

    case 'one_time': {
      if (!config.custom_date) return false;
      const customDate = new Date(config.custom_date);
      return (
        customDate.getFullYear() === now.getFullYear() &&
        customDate.getMonth() === now.getMonth() &&
        customDate.getDate() === now.getDate()
      );
    }

    case 'every_x_days': {
      if (!config.every_x_days || !automation.last_run_at) {
        // If never run, run now
        return !automation.last_run_at;
      }
      const lastRun = new Date(automation.last_run_at);
      const daysSinceLastRun = Math.floor((now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceLastRun >= config.every_x_days;
    }

    default:
      return false;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = getCurrentTimeInTimezone();
  console.log(`⏰ Scheduler running at ${now.toISOString()} (EST)`);

  try {
    // Fetch all active scheduled automations
    const { data: automations, error: fetchError } = await supabase
      .from('automations')
      .select('id, name, trigger_type, trigger_config, is_active, last_run_at')
      .eq('is_active', true)
      .eq('trigger_type', 'schedule');

    if (fetchError) {
      console.error('Failed to fetch automations:', fetchError);
      throw fetchError;
    }

    if (!automations || automations.length === 0) {
      console.log('📭 No active scheduled automations found');
      return new Response(
        JSON.stringify({ message: 'No active scheduled automations', checked: 0, triggered: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${automations.length} active scheduled automations`);

    const triggered: string[] = [];
    const errors: string[] = [];

    for (const automation of automations as Automation[]) {
      console.log(`\n🔍 Checking: ${automation.name}`);
      console.log(`   Config: ${JSON.stringify(automation.trigger_config)}`);

      if (shouldRunNow(automation)) {
        console.log(`✅ ${automation.name} is due to run NOW`);

        try {
          // Invoke the execute-automation function
          const { data, error } = await supabase.functions.invoke('execute-automation', {
            body: {
              automationId: automation.id,
              inputData: { triggeredBy: 'scheduler', scheduledAt: now.toISOString() },
            },
          });

          if (error) {
            console.error(`❌ Failed to execute ${automation.name}:`, error);
            errors.push(`${automation.name}: ${error.message}`);
          } else {
            console.log(`🚀 Successfully triggered ${automation.name}`);
            triggered.push(automation.name);

            // Update last_run_at
            await supabase
              .from('automations')
              .update({ last_run_at: new Date().toISOString() })
              .eq('id', automation.id);
          }
        } catch (execError: unknown) {
          const errMsg = execError instanceof Error ? execError.message : String(execError);
          console.error(`❌ Exception executing ${automation.name}:`, execError);
          errors.push(`${automation.name}: ${errMsg}`);
        }
      } else {
        console.log(`⏳ ${automation.name} not due yet`);
      }
    }

    const summary = {
      message: 'Scheduler run complete',
      timestamp: now.toISOString(),
      checked: automations.length,
      triggered: triggered.length,
      triggeredAutomations: triggered,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log(`\n📊 Summary: Checked ${automations.length}, Triggered ${triggered.length}`);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Scheduler error:', error);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
