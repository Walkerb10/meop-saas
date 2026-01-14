import { useState } from 'react';
import { Users, GitBranch, Contact, ChevronDown, Plus } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { CRMBoard } from '@/components/CRMBoard';
import { ContactsManager } from '@/components/ContactsManager';
import { PipelinesManager } from '@/components/PipelinesManager';
import { usePipelines, Pipeline } from '@/hooks/usePipelines';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'contacts'>('pipeline');
  const [showPipelinesManager, setShowPipelinesManager] = useState(false);
  const { pipelines, loading } = usePipelines();
  
  // Find the default sales pipeline or first pipeline
  const defaultPipeline = pipelines.find(p => p.type === 'sales' && p.is_default) 
    || pipelines.find(p => p.type === 'sales')
    || pipelines[0];
  
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  
  // Use selected or default
  const currentPipeline = selectedPipeline || defaultPipeline;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-full mx-auto min-h-full">
        {/* Header with Pipeline Selector */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 md:w-6 md:h-6" />
              CRM
            </h1>
            
            {activeTab === 'pipeline' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <GitBranch className="w-4 h-4" />
                    {currentPipeline?.name || 'Select Pipeline'}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {pipelines.map(pipeline => (
                    <DropdownMenuItem
                      key={pipeline.id}
                      onClick={() => setSelectedPipeline(pipeline)}
                      className="gap-2"
                    >
                      <GitBranch className="w-4 h-4" />
                      {pipeline.name}
                      {pipeline.type === 'sales' && (
                        <span className="text-xs text-muted-foreground ml-auto">Sales</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                  {pipelines.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={() => setShowPipelinesManager(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Manage Pipelines
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pipeline' | 'contacts')}>
          <TabsList className="bg-secondary/50 mb-6">
            <TabsTrigger value="pipeline" className="gap-2">
              <GitBranch className="w-4 h-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <Contact className="w-4 h-4" />
              Contacts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-0">
            <CRMBoard />
          </TabsContent>

          <TabsContent value="contacts" className="mt-0">
            <ContactsManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Pipelines Manager Dialog */}
      <Dialog open={showPipelinesManager} onOpenChange={setShowPipelinesManager}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Pipelines</DialogTitle>
          </DialogHeader>
          <PipelinesManager />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
