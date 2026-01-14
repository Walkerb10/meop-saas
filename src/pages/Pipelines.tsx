import { useState } from 'react';
import { GitBranch, Plus, Trash2, Edit, GripVertical, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { usePipelines, Pipeline, PipelineStage } from '@/hooks/usePipelines';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const STAGE_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
];

function getStageColorClass(color: string) {
  return STAGE_COLORS.find(c => c.value === color)?.class || 'bg-gray-500';
}

export default function PipelinesPage() {
  const { pipelines, loading, createPipeline, updatePipeline, deletePipeline, DEFAULT_SALES_STAGES } = usePipelines();
  const [showCreate, setShowCreate] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'custom' as Pipeline['type'],
  });

  const [stages, setStages] = useState<PipelineStage[]>([
    { id: 'stage_1', name: 'New', color: 'blue', order: 0 },
    { id: 'stage_2', name: 'In Progress', color: 'yellow', order: 1 },
    { id: 'stage_3', name: 'Done', color: 'green', order: 2 },
  ]);

  const handleCreate = async () => {
    if (!form.name) return;

    await createPipeline({
      name: form.name,
      description: form.description,
      type: form.type,
      stages: form.type === 'sales' ? DEFAULT_SALES_STAGES : stages,
    });

    setForm({ name: '', description: '', type: 'custom' });
    setStages([
      { id: 'stage_1', name: 'New', color: 'blue', order: 0 },
      { id: 'stage_2', name: 'In Progress', color: 'yellow', order: 1 },
      { id: 'stage_3', name: 'Done', color: 'green', order: 2 },
    ]);
    setShowCreate(false);
  };

  const handleUpdate = async () => {
    if (!editingPipeline) return;

    await updatePipeline(editingPipeline.id, {
      name: editingPipeline.name,
      description: editingPipeline.description,
      stages: editingPipeline.stages,
    });

    setEditingPipeline(null);
  };

  const addStage = () => {
    const newId = `stage_${Date.now()}`;
    setStages([...stages, { id: newId, name: 'New Stage', color: 'blue', order: stages.length }]);
  };

  const updateStage = (index: number, updates: Partial<PipelineStage>) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], ...updates };
    setStages(newStages);
  };

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })));
  };

  const addEditingStage = () => {
    if (!editingPipeline) return;
    const newId = `stage_${Date.now()}`;
    setEditingPipeline({
      ...editingPipeline,
      stages: [...editingPipeline.stages, { id: newId, name: 'New Stage', color: 'blue', order: editingPipeline.stages.length }],
    });
  };

  const updateEditingStage = (index: number, updates: Partial<PipelineStage>) => {
    if (!editingPipeline) return;
    const newStages = [...editingPipeline.stages];
    newStages[index] = { ...newStages[index], ...updates };
    setEditingPipeline({ ...editingPipeline, stages: newStages });
  };

  const removeEditingStage = (index: number) => {
    if (!editingPipeline) return;
    setEditingPipeline({
      ...editingPipeline,
      stages: editingPipeline.stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })),
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <GitBranch className="w-5 h-5 md:w-6 md:h-6" />
            Pipelines
          </h1>

          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Pipeline
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Pipeline</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Sales Pipeline"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Pipeline['type'] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.type !== 'sales' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Stages</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={addStage}>
                        <Plus className="w-4 h-4 mr-1" /> Add
                      </Button>
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2 pr-2">
                        {stages.map((stage, index) => (
                          <div key={stage.id} className="flex items-center gap-2 p-2 rounded-lg border">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <Input
                              value={stage.name}
                              onChange={(e) => updateStage(index, { name: e.target.value })}
                              className="flex-1 h-8"
                            />
                            <Select value={stage.color} onValueChange={(v) => updateStage(index, { color: v })}>
                              <SelectTrigger className="w-24 h-8">
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${getStageColorClass(stage.color)}`} />
                                  <span className="text-xs capitalize">{stage.color}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {STAGE_COLORS.map(c => (
                                  <SelectItem key={c.value} value={c.value}>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded-full ${c.class}`} />
                                      {c.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeStage(index)}
                              disabled={stages.length <= 2}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <Button onClick={handleCreate} disabled={!form.name} className="w-full">
                  Create Pipeline
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pipelines List */}
        <div className="grid gap-4 md:grid-cols-2">
          {pipelines.map(pipeline => (
            <Card key={pipeline.id} className="bg-card/50">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {pipeline.name}
                      <Badge variant="outline" className="text-xs capitalize">
                        {pipeline.type.replace('_', ' ')}
                      </Badge>
                    </CardTitle>
                    {pipeline.description && (
                      <CardDescription className="mt-1">{pipeline.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingPipeline(pipeline)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deletePipeline(pipeline.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {pipeline.stages.map(stage => (
                    <Badge
                      key={stage.id}
                      variant="outline"
                      className="gap-1.5"
                    >
                      <div className={`w-2 h-2 rounded-full ${getStageColorClass(stage.color)}`} />
                      {stage.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {pipelines.length === 0 && (
            <div className="col-span-2 text-center py-12 text-muted-foreground">
              No pipelines yet. Create one to get started.
            </div>
          )}
        </div>

        {/* Edit Pipeline Dialog */}
        <Dialog open={!!editingPipeline} onOpenChange={(open) => !open && setEditingPipeline(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Pipeline</DialogTitle>
            </DialogHeader>
            {editingPipeline && (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editingPipeline.name}
                    onChange={(e) => setEditingPipeline({ ...editingPipeline, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingPipeline.description || ''}
                    onChange={(e) => setEditingPipeline({ ...editingPipeline, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Stages</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addEditingStage}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 pr-2">
                      {editingPipeline.stages.map((stage, index) => (
                        <div key={stage.id} className="flex items-center gap-2 p-2 rounded-lg border">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <Input
                            value={stage.name}
                            onChange={(e) => updateEditingStage(index, { name: e.target.value })}
                            className="flex-1 h-8"
                          />
                          <Select value={stage.color} onValueChange={(v) => updateEditingStage(index, { color: v })}>
                            <SelectTrigger className="w-24 h-8">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${getStageColorClass(stage.color)}`} />
                                <span className="text-xs capitalize">{stage.color}</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {STAGE_COLORS.map(c => (
                                <SelectItem key={c.value} value={c.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${c.class}`} />
                                    {c.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeEditingStage(index)}
                            disabled={editingPipeline.stages.length <= 2}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Button onClick={handleUpdate} className="w-full">
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
