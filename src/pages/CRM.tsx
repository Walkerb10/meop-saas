import { Users } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { CRMBoard } from '@/components/CRMBoard';

export default function CRMPage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-full mx-auto min-h-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 md:w-6 md:h-6" />
            CRM
          </h1>
        </div>

        {/* CRM Board */}
        <CRMBoard />
      </div>
    </AppLayout>
  );
}
