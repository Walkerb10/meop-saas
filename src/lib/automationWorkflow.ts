import { WorkflowConnection, WorkflowNode, WorkflowNodeConfig, WorkflowNodeType } from "@/types/workflow";

type LegacyStep = {
  id?: string;
  type?: string;
  label?: string;
  config?: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeActionType(actionType: unknown): string {
  return typeof actionType === "string" ? actionType.toLowerCase().trim() : "";
}

function mapLegacyStepToNodeType(step: LegacyStep, triggerType?: string | null): WorkflowNodeType {
  const t = (step.type || "").toLowerCase();
  const config = step.config || {};

  if (t === "trigger") {
    const tt = (triggerType || "").toLowerCase();
    if (tt.includes("voice")) return "trigger_voice";
    if (tt.includes("webhook")) return "trigger_webhook";
    if (typeof (config as any).webhookUrl === "string") return "trigger_webhook";
    return "trigger_schedule";
  }

  if (t === "condition") return "condition";
  if (t === "transform") return "transform";

  // Actions
  const actionType = normalizeActionType((config as any).action_type);
  if (actionType === "research") return "action_research";
  if (actionType === "slack_message" || actionType === "send_slack") return "action_slack";
  if (actionType === "discord_message" || actionType === "send_discord") return "action_discord";
  if (actionType === "send_email") return "action_email";
  if (actionType === "send_text") return "action_text";

  // Fallback
  return "action_text";
}

function mapLegacyConfigToNodeConfig(nodeType: WorkflowNodeType, config: Record<string, unknown> = {}, triggerConfig?: Record<string, unknown> | null): WorkflowNodeConfig {
  if (nodeType === "trigger_schedule") {
    const frequency = (triggerConfig?.frequency as any) ?? (config.frequency as any);
    const time = (triggerConfig?.scheduled_time as any) ?? (triggerConfig?.time as any) ?? (config.time as any);
    const dayOfWeek = (triggerConfig?.day_of_week as any) ?? (triggerConfig?.dayOfWeek as any) ?? (config.dayOfWeek as any);
    const dayOfMonth = (triggerConfig?.day_of_month as any) ?? (triggerConfig?.dayOfMonth as any) ?? (config.dayOfMonth as any);

    return {
      frequency: (typeof frequency === "string" ? (frequency as any) : "daily"),
      time: typeof time === "string" ? time : undefined,
      dayOfWeek: typeof dayOfWeek === "string" ? dayOfWeek : undefined,
      dayOfMonth: typeof dayOfMonth === "string" ? dayOfMonth : undefined,
    };
  }

  if (nodeType === "action_research") {
    const query = (config.query as string) || (config.research_query as string) || (config.original_query as string);
    const outputFormat = (config.output_format as any) || (config.outputFormat as any);
    const outputLength = (config.output_length as any) || (config.outputLength as any);
    return {
      query: typeof query === "string" ? query : undefined,
      outputFormat: typeof outputFormat === "string" ? (outputFormat as any) : undefined,
      outputLength: typeof outputLength === "string" ? outputLength : undefined,
    };
  }

  if (nodeType === "action_slack") {
    const channel = (config.channel as string) || (config.slack_channel as string);
    return {
      channel: typeof channel === "string" ? channel.replace(/^#/, "") : undefined,
      message: typeof config.message === "string" ? (config.message as string) : undefined,
    };
  }

  if (nodeType === "action_discord") {
    const channel = (config.channel as string) || (config.discord_channel as string);
    return {
      channel: typeof channel === "string" ? channel.replace(/^#/, "") : undefined,
      message: typeof config.message === "string" ? (config.message as string) : undefined,
    };
  }

  if (nodeType === "action_email") {
    return {
      to: typeof config.to === "string" ? (config.to as string) : undefined,
      subject: typeof config.subject === "string" ? (config.subject as string) : undefined,
      message: typeof config.message === "string" ? (config.message as string) : undefined,
    };
  }

  if (nodeType === "action_text") {
    const phone = (config.phone as string) || (config.to as string);
    return {
      phone: typeof phone === "string" ? phone : undefined,
      message: typeof config.message === "string" ? (config.message as string) : undefined,
    };
  }

  return config as WorkflowNodeConfig;
}

export function coerceAutomationStepsToWorkflow(input: {
  steps: unknown;
  triggerConfig?: unknown;
  triggerType?: string | null;
}): { nodes: WorkflowNode[]; connections: WorkflowConnection[] } {
  const record = asRecord(input.steps);

  // New format: { nodes, connections }
  if (record && Array.isArray(record.nodes) && Array.isArray(record.connections)) {
    return {
      nodes: record.nodes as WorkflowNode[],
      connections: record.connections as WorkflowConnection[],
    };
  }

  const legacySteps = Array.isArray(input.steps) ? (input.steps as LegacyStep[]) : [];
  const triggerConfig = asRecord(input.triggerConfig);

  const nodes: WorkflowNode[] = [];
  const connections: WorkflowConnection[] = [];

  // If legacy steps has no explicit trigger, but we have trigger_config, create a schedule trigger.
  const hasTrigger = legacySteps.some((s) => (s.type || "").toLowerCase() === "trigger");
  if (!hasTrigger && triggerConfig) {
    nodes.push({
      id: crypto.randomUUID(),
      type: (String(input.triggerType || "").toLowerCase().includes("webhook") ? "trigger_webhook" : "trigger_schedule"),
      label: "Schedule",
      position: { x: 150, y: 100 },
      config: mapLegacyConfigToNodeConfig("trigger_schedule", {}, triggerConfig),
    });
  }

  legacySteps.forEach((step, idx) => {
    const nodeType = mapLegacyStepToNodeType(step, input.triggerType);
    const y = 100 + (nodes.length + idx) * 150;

    const cfg = mapLegacyConfigToNodeConfig(nodeType, step.config || {}, triggerConfig);

    const label = (() => {
      if (step.label) return step.label;
      if (nodeType === "trigger_schedule") return "Schedule";
      if (nodeType === "trigger_voice") return "Voice";
      if (nodeType === "trigger_webhook") return "Webhook";
      if (nodeType === "action_research") return "Research";
      if (nodeType === "action_slack") return "Slack";
      if (nodeType === "action_discord") return "Discord";
      if (nodeType === "action_email") return "Email";
      if (nodeType === "action_text") return "Text";
      return "Step";
    })();

    nodes.push({
      id: step.id || crypto.randomUUID(),
      type: nodeType,
      label,
      position: { x: 150, y },
      config: cfg,
    });
  });

  for (let i = 1; i < nodes.length; i++) {
    connections.push({
      id: crypto.randomUUID(),
      sourceId: nodes[i - 1].id,
      targetId: nodes[i].id,
    });
  }

  return { nodes, connections };
}
