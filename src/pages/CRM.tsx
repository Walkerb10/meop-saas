import { useState, useEffect } from 'react';
import { Users, GitBranch, Contact, Plus, Edit, ChevronDown } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { CRMBoard } from '@/components/CRMBoard';
import { ContactsManager } from '@/components/ContactsManager';
import { PipelinesManager } from '@/components/PipelinesManager';
import { usePipelines, Pipeline } from '@/hooks/usePipelines';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState<'pipelines' | 'contacts'>('pipelines');
  const [showPipelinesManager, setShowPipelinesManager] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const { pipelines, loading, createPipeline, updatePipeline, DEFAULT_SALES_STAGES } = usePipelines();
  const { user } = useAuth();
  
  // Selected pipeline ID
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

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

  // Set selected pipeline when pipelines load
  useEffect(() => {
    if (!selectedPipelineId && pipelines.length > 0) {
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [pipelines, selectedPipelineId]);
  
  // Find the selected pipeline
  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId) || pipelines[0];

  const handleEditPipeline = () => {
    if (selectedPipeline) {
      setEditingPipeline(selectedPipeline);
    }
  };

  const handleSaveEditedPipeline = async () => {
    if (!editingPipeline) return;
    await updatePipeline(editingPipeline.id, {
      name: editingPipeline.name,
      description: editingPipeline.description,
      stages: editingPipeline.stages,
    });
    setEditingPipeline(null);
  };

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
          </div>
          
          {/* Pipeline Selector Dropdown */}
          {activeTab === 'pipelines' && (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <GitBranch className="w-4 h-4" />
                    {selectedPipeline?.name || 'Select Pipeline'}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  {pipelines.map(pipeline => (
                    <DropdownMenuItem
                      key={pipeline.id}
                      onClick={() => setSelectedPipelineId(pipeline.id)}
                      className={selectedPipelineId === pipeline.id ? 'bg-accent' : ''}
                    >
                      <GitBranch className="w-4 h-4 mr-2" />
                      {pipeline.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowPipelinesManager(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Pipeline
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Edit Button */}
              <Button variant="ghost" size="icon" onClick={handleEditPipeline} disabled={!selectedPipeline}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          )}
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
            <CRMBoard pipelineId={selectedPipeline?.id} pipelineStages={selectedPipeline?.stages} />
          </TabsContent>

          <TabsContent value="contacts" className="mt-0">
            <ContactsManager />
          </TabsContent>
        </Tabs>

        {/* Pipelines Manager Dialog */}
        <Dialog open={showPipelinesManager} onOpenChange={setShowPipelinesManager}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Pipelines</DialogTitle>
            </DialogHeader>
            <PipelinesManager />
          </DialogContent>
        </Dialog>

        {/* Edit Pipeline Dialog */}
        <Dialog open={!!editingPipeline} onOpenChange={(open) => !open && setEditingPipeline(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Pipeline</DialogTitle>
            </DialogHeader>
            {editingPipeline && (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <input
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    value={editingPipeline.name}
                    onChange={(e) => setEditingPipeline({ ...editingPipeline, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    value={editingPipeline.description || ''}
                    onChange={(e) => setEditingPipeline({ ...editingPipeline, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Stages</label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newId = `stage_${Date.now()}`;
                        setEditingPipeline({
                          ...editingPipeline,
                          stages: [...editingPipeline.stages, { id: newId, name: 'New Stage', color: 'blue', order: editingPipeline.stages.length }],
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {editingPipeline.stages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center gap-2 p-2 rounded-lg border">
                        <input
                          value={stage.name}
                          onChange={(e) => {
                            const newStages = [...editingPipeline.stages];
                            newStages[index] = { ...newStages[index], name: e.target.value };
                            setEditingPipeline({ ...editingPipeline, stages: newStages });
                          }}
                          className="flex-1 h-8 px-2 border rounded bg-background"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingPipeline({
                              ...editingPipeline,
                              stages: editingPipeline.stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })),
                            });
                          }}
                          disabled={editingPipeline.stages.length <= 2}
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={handleSaveEditedPipeline} className="w-full">
                  Save Changes
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
