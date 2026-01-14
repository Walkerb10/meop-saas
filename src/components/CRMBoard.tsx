import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, GripVertical, Trash2, Edit2, User, Mail, Phone, Building2, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useCRM, CRM_STAGES, CRMLead } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';

interface CRMBoardProps {
  pipelineId?: string;
}

export function CRMBoard({ pipelineId }: CRMBoardProps) {
  const { leads, loading, createLead, updateLead, moveLead, deleteLead, getLeadsByStage } = useCRM();
  const [showCreate, setShowCreate] = useState(false);
  const [editingLead, setEditingLead] = useState<CRMLead | null>(null);
  const [draggedLead, setDraggedLead] = useState<CRMLead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    stage: 'new',
    value: '',
    notes: '',
    source: '',
  });

  const handleCreate = async () => {
    if (!newLead.name.trim()) return;
    await createLead({
      name: newLead.name,
      email: newLead.email || null,
      phone: newLead.phone || null,
      company: newLead.company || null,
      stage: newLead.stage,
      value: newLead.value ? parseFloat(newLead.value) : null,
      notes: newLead.notes || null,
      source: newLead.source || null,
    });
    setNewLead({ name: '', email: '', phone: '', company: '', stage: 'new', value: '', notes: '', source: '' });
    setShowCreate(false);
  };

  const handleUpdate = async () => {
    if (!editingLead) return;
    await updateLead(editingLead.id, editingLead);
    setEditingLead(null);
  };

  const handleDragStart = (e: React.DragEvent, lead: CRMLead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(null);
    
    if (draggedLead && draggedLead.stage !== stageId) {
      const stageLeads = getLeadsByStage(stageId);
      await moveLead(draggedLead.id, stageId, stageLeads.length);
    }
    setDraggedLead(null);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sales Pipeline</h2>
          <p className="text-sm text-muted-foreground">{leads.length} total leads</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    placeholder="Contact name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={newLead.company}
                    onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={newLead.stage} onValueChange={(v) => setNewLead({ ...newLead, stage: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_STAGES.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deal Value</Label>
                  <Input
                    type="number"
                    value={newLead.value}
                    onChange={(e) => setNewLead({ ...newLead, value: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Input
                  value={newLead.source}
                  onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                  placeholder="e.g., Website, Referral, LinkedIn"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>
              <Button onClick={handleCreate} className="w-full">Create Lead</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editingLead.name}
                    onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={editingLead.company || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, company: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={editingLead.email || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={editingLead.phone || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={editingLead.stage} onValueChange={(v) => setEditingLead({ ...editingLead, stage: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_STAGES.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deal Value</Label>
                  <Input
                    type="number"
                    value={editingLead.value || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, value: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editingLead.notes || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdate} className="flex-1">Save Changes</Button>
                <Button variant="destructive" size="icon" onClick={() => { deleteLead(editingLead.id); setEditingLead(null); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
          {CRM_STAGES.map((stage) => {
            const stageLeads = getLeadsByStage(stage.id);
            const stageValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0);
            
            return (
              <div
                key={stage.id}
                className={cn(
                  'w-[280px] flex-shrink-0 rounded-lg border bg-card/50 transition-colors',
                  dragOverStage === stage.id && 'border-primary bg-primary/5'
                )}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="p-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                    <span className="font-medium text-sm">{stage.label}</span>
                    <Badge variant="secondary" className="ml-auto">{stageLeads.length}</Badge>
                  </div>
                  {stageValue > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(stageValue)}
                    </p>
                  )}
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="p-2 space-y-2">
                    <AnimatePresence>
                      {stageLeads.map((lead) => (
                        <motion.div
                          key={lead.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          draggable
                          onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, lead)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            'p-3 rounded-md border bg-background cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors',
                            draggedLead?.id === lead.id && 'opacity-50'
                          )}
                          onClick={() => setEditingLead(lead)}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{lead.name}</p>
                              {lead.company && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <Building2 className="w-3 h-3" />
                                  {lead.company}
                                </p>
                              )}
                              {lead.email && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                  <Mail className="w-3 h-3 shrink-0" />
                                  {lead.email}
                                </p>
                              )}
                              {lead.value && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  <DollarSign className="w-3 h-3 mr-0.5" />
                                  {formatCurrency(lead.value)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {stageLeads.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Drop leads here
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
