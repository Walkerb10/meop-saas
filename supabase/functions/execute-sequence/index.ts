import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// n8n webhook URLs for different platforms
const N8N_WEBHOOKS = {
  text: "https://walkerb.app.n8n.cloud/webhook/ca69f6f3-2405-45bc-9ad0-9ce78744fbe2",
  slack: "https://walkerb.app.n8n.cloud/webhook/067d7cbd-f49b-4641-aaab-6cb65617cb68",
  discord: "https://walkerb.app.n8n.cloud/webhook/de3262c9-cf10-4ba9-bf0f-87ba31a1144c",
  email: "https://walkerb.app.n8n.cloud/webhook/0bad5a52-1f17-4c90-9ca2-6d4aee1661f7",
};

const DEFAULT_CHANNELS = {
  slack: "all_bhva",
  discord: "admin",
};

interface SequenceStep {
  id: string;
  type: 'research' | 'text' | 'email' | 'slack' | 'discord' | 'delay';
  label: string;
  config: {
    query?: string;
    outputFormat?: string;
    outputLength?: string;
    message?: string;
    phone?: string;
    to?: string;
    subject?: string;
    channel?: string;
    delayMinutes?: number;
  };
  order: number;
}

interface Sequence {
  id: string;
  name: string;
  steps: SequenceStep[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { sequenceId, inputData } = body;

    if (!sequenceId) {
      return new Response(
        JSON.stringify({ error: "sequenceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the sequence
    const { data: sequence, error: seqError } = await supabase
      .from('sequences')
      .select('*')
      .eq('id', sequenceId)
      .single();

    if (seqError || !sequence) {
      return new Response(
        JSON.stringify({ error: "Sequence not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const steps = sequence.steps as SequenceStep[];

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('sequence_executions')
      .insert({
        sequence_id: sequenceId,
        status: 'running',
        input_data: inputData || {},
        step_results: [],
      })
      .select()
      .single();

    if (execError) {
      console.error("Failed to create execution:", execError);
      return new Response(
        JSON.stringify({ error: "Failed to create execution" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also create an entry in the main executions table for visibility
    await supabase.from('executions').insert({
      sequence_name: sequence.name,
      status: 'running',
      input_data: inputData || {},
      workflow_id: sequenceId,
    });

    console.log(`🚀 Starting sequence execution: ${sequence.name} (${execution.id})`);

    // Execute steps in order
    let lastResult: string | null = null;
    const stepResults: Array<{
      stepId: string;
      stepType: string;
      status: string;
      result?: string;
      error?: string;
      startedAt: string;
      completedAt?: string;
    }> = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepResult: typeof stepResults[0] = {
        stepId: step.id,
        stepType: step.type,
        status: 'running',
        startedAt: new Date().toISOString(),
      };

      // Update execution with current step
      await supabase
        .from('sequence_executions')
        .update({
          current_step: i,
          step_results: [...stepResults, stepResult],
        })
        .eq('id', execution.id);

      console.log(`📍 Step ${i + 1}/${steps.length}: ${step.type} - ${step.label}`);

      try {
        // Execute the step
        const result = await executeStep(supabase, step, lastResult, inputData);
        
        stepResult.status = 'completed';
        stepResult.result = result;
        stepResult.completedAt = new Date().toISOString();
        
        // Store result for next step
        if (step.type === 'research') {
          lastResult = result;
        }

        console.log(`✅ Step ${i + 1} completed`);
      } catch (error) {
        stepResult.status = 'failed';
        stepResult.error = error instanceof Error ? error.message : String(error);
        stepResult.completedAt = new Date().toISOString();
        
        console.error(`❌ Step ${i + 1} failed:`, error);
        
        // Update execution as failed
        await supabase
          .from('sequence_executions')
          .update({
            status: 'failed',
            error_message: stepResult.error,
            completed_at: new Date().toISOString(),
            step_results: [...stepResults, stepResult],
          })
          .eq('id', execution.id);

        return new Response(
          JSON.stringify({ 
            success: false, 
            executionId: execution.id,
            error: stepResult.error,
            stepResults: [...stepResults, stepResult],
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      stepResults.push(stepResult);
    }

    // Update execution as completed
    await supabase
      .from('sequence_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        step_results: stepResults,
      })
      .eq('id', execution.id);

    // Update the last_run_at on the sequence
    await supabase
      .from('sequences')
      .update({ last_run_at: new Date().toISOString() })
      .eq('id', sequenceId);

    console.log(`🎉 Sequence completed: ${sequence.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        executionId: execution.id,
        stepResults,
        finalResult: lastResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Sequence execution error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function executeStep(
  supabase: any,
  step: SequenceStep,
  previousResult: string | null,
  inputData?: Record<string, unknown>
): Promise<string> {
  const config = step.config;

  switch (step.type) {
    case 'research': {
      // Call the research webhook
      const query = config.query || inputData?.query as string || 'General research';
      const outputFormat = config.outputFormat || 'problem';
      const outputLength = config.outputLength || '500';

      const response = await supabase.functions.invoke('webhook-research', {
        body: {
          query,
          output_format: outputFormat,
          output_length: outputLength,
        },
      });

      if (response.error) {
        throw new Error(`Research failed: ${response.error.message}`);
      }

      return response.data?.result || response.data?.content || JSON.stringify(response.data);
    }

    case 'delay': {
      const minutes = config.delayMinutes || 1;
      await new Promise(resolve => setTimeout(resolve, minutes * 60 * 1000));
      return `Waited ${minutes} minutes`;
    }

    case 'text': {
      const message = replaceResultPlaceholder(config.message || '', previousResult);
      const phone = config.phone;

      if (!phone) {
        throw new Error('Phone number is required for text step');
      }

      const response = await fetch(N8N_WEBHOOKS.text, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'send_text',
          phone,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Text send failed: ${response.status}`);
      }

      return `Text sent to ${phone}`;
    }

    case 'email': {
      const message = replaceResultPlaceholder(config.message || '', previousResult);
      const to = config.to;
      const subject = config.subject || 'Sequence Result';

      if (!to) {
        throw new Error('Email recipient is required');
      }

      const response = await fetch(N8N_WEBHOOKS.email, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'send_email',
          to,
          subject,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email send failed: ${response.status}`);
      }

      return `Email sent to ${to}`;
    }

    case 'slack': {
      const message = replaceResultPlaceholder(config.message || '', previousResult);
      const channel = config.channel || DEFAULT_CHANNELS.slack;

      const response = await fetch(N8N_WEBHOOKS.slack, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'slack_message',
          channel,
          slack_channel: channel,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack send failed: ${response.status}`);
      }

      return `Slack message sent to #${channel}`;
    }

    case 'discord': {
      const message = replaceResultPlaceholder(config.message || '', previousResult);
      const channel = config.channel || DEFAULT_CHANNELS.discord;

      const response = await fetch(N8N_WEBHOOKS.discord, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'discord_message',
          discord_channel: channel,
          channel,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Discord send failed: ${response.status}`);
      }

      return `Discord message sent to #${channel}`;
    }

    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

function replaceResultPlaceholder(template: string, result: string | null): string {
  if (!result) return template;
  return template.replace(/\{\{result\}\}/gi, result);
}
