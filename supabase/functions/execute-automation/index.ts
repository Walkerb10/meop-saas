import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// n8n webhook URLs for different platforms
const N8N_WEBHOOKS = {
  text: "https://n8n-n8n.swm5hc.easypanel.host/webhook/067d7cbd-f49b-4641-aaab-6cb65617cb68",
  slack: "https://n8n-n8n.swm5hc.easypanel.host/webhook/067d7cbd-f49b-4641-aaab-6cb65617cb68",
  discord: "https://n8n-n8n.swm5hc.easypanel.host/webhook/de3262c9-cf10-4ba9-bf0f-87ba31a1144c",
  email: "https://n8n-n8n.swm5hc.easypanel.host/webhook/0bad5a52-1f17-4c90-9ca2-6d4aee1661f7",
};

const DEFAULT_CHANNELS = {
  slack: "all_bhva",
  discord: "admin",
};

interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

interface WorkflowConnection {
  id: string;
  sourceId: string;
  targetId: string;
}

interface StepResult {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  webhookUrl?: string;
  webhookPayload?: Record<string, unknown>;
  webhookResponse?: unknown;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
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
    const { automationId, inputData } = body;

    if (!automationId) {
      return new Response(
        JSON.stringify({ error: "automationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the automation
    const { data: automation, error: autoError } = await supabase
      .from('automations')
      .select('*')
      .eq('id', automationId)
      .single();

    if (autoError || !automation) {
      console.error("Automation fetch error:", autoError);
      return new Response(
        JSON.stringify({ error: "Automation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse steps (nodes and connections)
    const stepsData = automation.steps as { nodes?: WorkflowNode[]; connections?: WorkflowConnection[] } | null;
    const nodes = stepsData?.nodes || [];
    const connections = stepsData?.connections || [];

    if (nodes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Automation has no steps" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('executions')
      .insert({
        sequence_name: automation.name,
        status: 'running',
        input_data: { automationId, inputData, nodes: nodes.length },
        workflow_id: automationId,
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

    console.log(`🚀 Starting automation execution: ${automation.name} (${execution.id})`);
    console.log(`📊 Nodes: ${nodes.length}, Connections: ${connections.length}`);

    // Sort nodes by Y position (top to bottom execution order)
    const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
    
    // Execute steps in order
    let lastResult: string | null = null;
    const stepResults: StepResult[] = [];

    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i];
      const startTime = Date.now();
      
      const stepResult: StepResult = {
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.label,
        status: 'running',
        startedAt: new Date().toISOString(),
      };

      console.log(`📍 Step ${i + 1}/${sortedNodes.length}: ${node.type} - ${node.label}`);

      try {
        // Skip trigger nodes - they just initiate the flow
        if (node.type.startsWith('trigger_')) {
          stepResult.status = 'completed';
          stepResult.result = `Trigger: ${node.label}`;
          stepResult.completedAt = new Date().toISOString();
          stepResult.durationMs = Date.now() - startTime;
          stepResults.push(stepResult);
          console.log(`⏭️ Trigger node skipped (triggers are entry points)`);
          continue;
        }

        // Execute the node
        const result = await executeNode(supabase, node, lastResult, inputData, stepResult);
        
        stepResult.status = 'completed';
        stepResult.result = result;
        stepResult.completedAt = new Date().toISOString();
        stepResult.durationMs = Date.now() - startTime;
        
        // Store result for next step if it's a research node
        if (node.type === 'action_research') {
          lastResult = result;
        }

        console.log(`✅ Step ${i + 1} completed in ${stepResult.durationMs}ms`);
        
      } catch (error) {
        stepResult.status = 'failed';
        stepResult.error = error instanceof Error ? error.message : String(error);
        stepResult.completedAt = new Date().toISOString();
        stepResult.durationMs = Date.now() - startTime;
        
        console.error(`❌ Step ${i + 1} failed:`, error);
        
        // Update execution as failed
        await supabase
          .from('executions')
          .update({
            status: 'failed',
            error_message: stepResult.error,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - new Date(execution.started_at).getTime(),
            output_data: { stepResults: [...stepResults, stepResult] },
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
    const endTime = new Date();
    await supabase
      .from('executions')
      .update({
        status: 'completed',
        completed_at: endTime.toISOString(),
        duration_ms: endTime.getTime() - new Date(execution.started_at).getTime(),
        output_data: { 
          stepResults,
          finalResult: lastResult,
        },
      })
      .eq('id', execution.id);

    // Update the last_run_at on the automation
    await supabase
      .from('automations')
      .update({ last_run_at: endTime.toISOString() })
      .eq('id', automationId);

    console.log(`🎉 Automation completed: ${automation.name}`);

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
    console.error("Automation execution error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function executeNode(
  supabase: any,
  node: WorkflowNode,
  previousResult: string | null,
  inputData?: Record<string, unknown>,
  stepResult?: StepResult
): Promise<string> {
  const config = node.config || {};

  switch (node.type) {
    case 'action_research': {
      const query = (config.query as string) || (inputData?.query as string) || 'General research';
      const outputFormat = (config.outputFormat as string) || 'problem';
      const outputLength = (config.outputLength as string) || '500';

      console.log(`🔍 Research: "${query}" (format: ${outputFormat}, length: ${outputLength})`);

      const response = await supabase.functions.invoke('webhook-research', {
        body: {
          query,
          output_format: outputFormat,
          output_length: outputLength,
        },
      });

      if (stepResult) {
        stepResult.webhookUrl = 'supabase/functions/webhook-research';
        stepResult.webhookPayload = { query, output_format: outputFormat, output_length: outputLength };
        stepResult.webhookResponse = response.data;
      }

      if (response.error) {
        throw new Error(`Research failed: ${response.error.message}`);
      }

      return response.data?.result || response.data?.content || JSON.stringify(response.data);
    }

    case 'action_delay': {
      const minutes = (config.delayMinutes as number) || 1;
      console.log(`⏰ Delay: ${minutes} minute(s)`);
      // For now, skip actual delay in execution to avoid timeout
      // await new Promise(resolve => setTimeout(resolve, minutes * 60 * 1000));
      return `Delay: ${minutes} minute(s) (skipped in manual execution)`;
    }

    case 'action_text': {
      const message = replaceResultPlaceholder((config.message as string) || '', previousResult);
      const phone = (config.phone as string) || '';

      if (!phone) {
        throw new Error('Phone number is required for text step');
      }

      // Format phone number to E.164
      const formattedPhone = formatPhoneE164(phone);
      
      console.log(`📱 Text to ${formattedPhone}: "${message.substring(0, 50)}..."`);

      const payload = {
        action_type: 'send_text',
        phone: formattedPhone,
        message,
      };

      const response = await fetch(N8N_WEBHOOKS.text, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.text();

      if (stepResult) {
        stepResult.webhookUrl = N8N_WEBHOOKS.text;
        stepResult.webhookPayload = payload;
        stepResult.webhookResponse = responseData;
      }

      if (!response.ok) {
        throw new Error(`Text send failed: ${response.status} - ${responseData}`);
      }

      return `Text sent to ${formattedPhone}`;
    }

    case 'action_email': {
      const message = replaceResultPlaceholder((config.message as string) || '', previousResult);
      const to = (config.to as string) || '';
      const subject = (config.subject as string) || 'Automation Result';

      if (!to) {
        throw new Error('Email recipient is required');
      }

      console.log(`📧 Email to ${to}: "${subject}"`);

      const payload = {
        action_type: 'send_email',
        to,
        subject,
        message,
      };

      const response = await fetch(N8N_WEBHOOKS.email, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.text();

      if (stepResult) {
        stepResult.webhookUrl = N8N_WEBHOOKS.email;
        stepResult.webhookPayload = payload;
        stepResult.webhookResponse = responseData;
      }

      if (!response.ok) {
        throw new Error(`Email send failed: ${response.status} - ${responseData}`);
      }

      return `Email sent to ${to}`;
    }

    case 'action_slack': {
      const message = replaceResultPlaceholder((config.message as string) || '', previousResult);
      const channel = (config.channel as string) || DEFAULT_CHANNELS.slack;

      console.log(`💬 Slack #${channel}: "${message.substring(0, 50)}..."`);

      const payload = {
        action_type: 'slack_message',
        channel,
        slack_channel: channel,
        message,
      };

      const response = await fetch(N8N_WEBHOOKS.slack, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.text();

      if (stepResult) {
        stepResult.webhookUrl = N8N_WEBHOOKS.slack;
        stepResult.webhookPayload = payload;
        stepResult.webhookResponse = responseData;
      }

      if (!response.ok) {
        throw new Error(`Slack send failed: ${response.status} - ${responseData}`);
      }

      return `Slack message sent to #${channel}`;
    }

    case 'action_discord': {
      const message = replaceResultPlaceholder((config.message as string) || '', previousResult);
      const channel = (config.channel as string) || DEFAULT_CHANNELS.discord;

      console.log(`🎮 Discord #${channel}: "${message.substring(0, 50)}..."`);

      const payload = {
        action_type: 'discord_message',
        discord_channel: channel,
        channel,
        message,
      };

      const response = await fetch(N8N_WEBHOOKS.discord, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.text();

      if (stepResult) {
        stepResult.webhookUrl = N8N_WEBHOOKS.discord;
        stepResult.webhookPayload = payload;
        stepResult.webhookResponse = responseData;
      }

      if (!response.ok) {
        throw new Error(`Discord send failed: ${response.status} - ${responseData}`);
      }

      return `Discord message sent to #${channel}`;
    }

    case 'condition': {
      const condition = (config.condition as string) || '';
      // For now, conditions always pass in manual execution
      console.log(`🔀 Condition: "${condition}" - passed`);
      return `Condition evaluated: ${condition}`;
    }

    case 'transform': {
      const transform = (config.transform as string) || '';
      console.log(`🔄 Transform: "${transform}"`);
      return previousResult || 'No data to transform';
    }

    default:
      console.log(`⚠️ Unknown node type: ${node.type}`);
      return `Unknown node type: ${node.type}`;
  }
}

function replaceResultPlaceholder(template: string, result: string | null): string {
  if (!result) return template;
  return template.replace(/\{\{result\}\}/gi, result);
}

function formatPhoneE164(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it starts with 1 and has 11 digits, format as +1XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it has 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // Otherwise return with + prefix if not present
  return phone.startsWith('+') ? phone : `+${digits}`;
}
