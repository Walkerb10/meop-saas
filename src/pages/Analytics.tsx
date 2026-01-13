import { AppLayout } from '@/components/AppLayout';
import { PromptAnalyticsDashboard } from '@/components/PromptAnalyticsDashboard';

export default function Analytics() {
  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <PromptAnalyticsDashboard />
      </div>
    </AppLayout>
  );
}
