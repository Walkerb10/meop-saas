import { useState, useEffect } from 'react';
import { Users, GitBranch, Contact } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { CRMBoard } from '@/components/CRMBoard';
import { ContactsManager } from '@/components/ContactsManager';
import { usePipelines } from '@/hooks/usePipelines';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState<'pipelines' | 'contacts'>('pipelines');
  const { pipelines, loading, createPipeline, DEFAULT_SALES_STAGES } = usePipelines();
  const { user } = useAuth();

  // Auto-create default sales pipeline if none exists
  useEffect(() => {
    if (!loading && pipelines.length === 0 && user) {
      createPipeline({
        name: 'Sales Pipeline',
        description: 'Default sales pipeline',
        type: 'sales',
        stages: DEFAULT_SALES_STAGES,
        is_default: true,
      });
    }
  }, [loading, pipelines.length, user, createPipeline, DEFAULT_SALES_STAGES]);
  
  // Find the default sales pipeline
  const salesPipeline = pipelines.find(p => p.type === 'sales' && p.is_default) 
    || pipelines.find(p => p.type === 'sales')
    || pipelines[0];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-full mx-auto min-h-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 md:w-6 md:h-6" />
              CRM
            </h1>
            
            {activeTab === 'pipelines' && salesPipeline && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <GitBranch className="w-4 h-4" />
                <span className="text-sm font-medium">{salesPipeline.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pipelines' | 'contacts')}>
          <TabsList className="bg-secondary/50 mb-6">
            <TabsTrigger value="pipelines" className="gap-2">
              <GitBranch className="w-4 h-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <Contact className="w-4 h-4" />
              Contacts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipelines" className="mt-0">
            <CRMBoard pipelineId={salesPipeline?.id} />
          </TabsContent>

          <TabsContent value="contacts" className="mt-0">
            <ContactsManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
