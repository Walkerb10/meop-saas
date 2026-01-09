import { AIState } from '@/types/agent';

interface StatusIndicatorProps {
  state: AIState;
}

export function StatusIndicator({ state }: StatusIndicatorProps) {
  const getLabel = () => {
    switch (state) {
      case 'idle':
        return 'Ready';
      case 'listening':
        return 'Listening...';
      case 'thinking':
        return 'Processing...';
      case 'speaking':
        return 'Speaking...';
    }
  };

  return (
    <div className="flex items-center gap-2 glass px-4 py-2 rounded-full">
      <div className={`status-dot ${state}`} />
      <span className="text-sm font-medium text-foreground/80">{getLabel()}</span>
    </div>
  );
}
