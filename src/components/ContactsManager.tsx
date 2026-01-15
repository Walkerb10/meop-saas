import { useState, useEffect } from 'react';
import { useContacts, Contact, ContactGroup, CONTACT_ROLES } from '@/hooks/useContacts';
import { usePipelines, Pipeline, PipelineStage } from '@/hooks/usePipelines';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  Trash2,
  Edit,
  Loader2,
  Plus,
  FolderPlus,
  Tag,
  Copy,
  Linkedin,
  Building2,
  Globe,
  Briefcase,
  GitBranch,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const GROUP_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'green', label: 'Green', class: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'red', label: 'Red', class: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
];

function getColorClass(color: string): string {
  return GROUP_COLORS.find(c => c.value === color)?.class || GROUP_COLORS[0].class;
}

function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }
  if (digits.length === 10) {
    return '+1' + digits;
  }
  return phone.startsWith('+') ? phone : '+' + digits;
}

interface NewContactForm {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  company: string;
  website: string;
  role: string;
  notes: string;
  pipeline_id: string;
  pipeline_stage: string;
}

const emptyContactForm: NewContactForm = {
  name: '',
  email: '',
  phone: '',
  linkedin: '',
  company: '',
  website: '',
  role: '',
  notes: '',
  pipeline_id: '',
  pipeline_stage: '',
};

export function ContactsManager() {
  const {
    contacts,
    groups,
    loading,
    createContact,
    updateContact,
    deleteContact,
    createGroup,
    updateGroup,
    deleteGroup,
    addContactToGroup,
    removeContactFromGroup,
    getGroupMembers,
    getContactGroups,
  } = useContacts();
  
  const { pipelines, loading: pipelinesLoading } = usePipelines();
  const { toast } = useToast();

  const [showCreateContact, setShowCreateContact] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ContactGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<Contact[]>([]);
  const [showAddToGroup, setShowAddToGroup] = useState<string | null>(null);
  const [selectedContactGroups, setSelectedContactGroups] = useState<string[]>([]);
  const [showAddToPipeline, setShowAddToPipeline] = useState<Contact | null>(null);

  const [newContact, setNewContact] = useState<NewContactForm>(emptyContactForm);

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    color: 'blue',
  });

  const getSelectedPipelineStages = (pipelineId: string): PipelineStage[] => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    return pipeline?.stages || [];
  };

  const handleCreateContact = async () => {
    if (!newContact.name.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Name is required' });
      return;
    }

    await createContact({
      name: newContact.name,
      email: newContact.email || null,
      phone: newContact.phone ? formatPhoneE164(newContact.phone) : null,
      linkedin: newContact.linkedin || null,
      company: newContact.company || null,
      website: newContact.website || null,
      role: newContact.role || null,
      notes: newContact.notes || null,
      pipeline_id: newContact.pipeline_id || null,
      pipeline_stage: newContact.pipeline_stage || null,
      pipeline_position: 0,
    });

    setNewContact(emptyContactForm);
    setShowCreateContact(false);
  };

  const handleUpdateContact = async () => {
    if (!editingContact) return;

    await updateContact(editingContact.id, {
      name: editingContact.name,
      email: editingContact.email,
      phone: editingContact.phone ? formatPhoneE164(editingContact.phone) : null,
      linkedin: editingContact.linkedin,
      company: editingContact.company,
      website: editingContact.website,
      role: editingContact.role,
      notes: editingContact.notes,
      pipeline_id: editingContact.pipeline_id,
      pipeline_stage: editingContact.pipeline_stage,
    });

    setEditingContact(null);
  };

  const handleAssignToPipeline = async (pipelineId: string, stage: string) => {
    if (!showAddToPipeline) return;

    await updateContact(showAddToPipeline.id, {
      pipeline_id: pipelineId || null,
      pipeline_stage: stage || null,
      pipeline_position: 0,
    });

    setShowAddToPipeline(null);
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Group name is required' });
      return;
    }

    await createGroup(newGroup);
    setNewGroup({ name: '', description: '', color: 'blue' });
    setShowCreateGroup(false);
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;

    await updateGroup(editingGroup.id, {
      name: editingGroup.name,
      description: editingGroup.description,
      color: editingGroup.color,
    });

    setEditingGroup(null);
  };

  const handleViewGroup = async (group: ContactGroup) => {
    setSelectedGroup(group);
    const members = await getGroupMembers(group.id);
    setGroupMembers(members);
  };

  const handleAddToGroup = async (contactId: string) => {
    setShowAddToGroup(contactId);
    const groups = await getContactGroups(contactId);
    setSelectedContactGroups(groups);
  };

  const toggleGroupMembership = async (contactId: string, groupId: string, isCurrentlyMember: boolean) => {
    if (isCurrentlyMember) {
      await removeContactFromGroup(contactId, groupId);
      setSelectedContactGroups(prev => prev.filter(g => g !== groupId));
    } else {
      await addContactToGroup(contactId, groupId);
      setSelectedContactGroups(prev => [...prev, groupId]);
    }
  };

  const copyEmailList = async (group: ContactGroup) => {
    const members = await getGroupMembers(group.id);
    const emails = members.filter(m => m.email).map(m => m.email).join(', ');
    if (emails) {
      navigator.clipboard.writeText(emails);
      toast({ title: 'Copied!', description: 'Email list copied to clipboard' });
    } else {
      toast({ variant: 'destructive', title: 'No emails', description: 'No emails in this group' });
    }
  };

  const copyPhoneList = async (group: ContactGroup) => {
    const members = await getGroupMembers(group.id);
    const phones = members.filter(m => m.phone).map(m => m.phone).join(', ');
    if (phones) {
      navigator.clipboard.writeText(phones);
      toast({ title: 'Copied!', description: 'Phone list copied to clipboard' });
    } else {
      toast({ variant: 'destructive', title: 'No phones', description: 'No phone numbers in this group' });
    }
  };

  const getPipelineName = (pipelineId: string | null) => {
    if (!pipelineId) return null;
    return pipelines.find(p => p.id === pipelineId)?.name || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="contacts">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="w-4 h-4" />
            Contacts ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <Tag className="w-4 h-4" />
            Lists ({groups.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-4 space-y-4">
          {/* Create Contact Dialog */}
          <Dialog open={showCreateContact} onOpenChange={setShowCreateContact}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name <span className="text-destructive">*</span></Label>
                    <Input
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={newContact.role} onValueChange={(v) => setNewContact({ ...newContact, role: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      placeholder="+18885551234"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={newContact.company}
                      onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                      placeholder="Acme Inc"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      value={newContact.website}
                      onChange={(e) => setNewContact({ ...newContact, website: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input
                    value={newContact.linkedin}
                    onChange={(e) => setNewContact({ ...newContact, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pipeline</Label>
                    <Select 
                      value={newContact.pipeline_id} 
                      onValueChange={(v) => setNewContact({ ...newContact, pipeline_id: v, pipeline_stage: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pipeline..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {pipelines.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {newContact.pipeline_id && (
                    <div className="space-y-2">
                      <Label>Stage</Label>
                      <Select 
                        value={newContact.pipeline_stage} 
                        onValueChange={(v) => setNewContact({ ...newContact, pipeline_stage: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getSelectedPipelineStages(newContact.pipeline_id).map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newContact.notes}
                    onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                    placeholder="Any notes about this contact..."
                    rows={2}
                  />
                </div>
                <Button onClick={handleCreateContact} className="w-full">
                  Create Contact
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Contact Dialog */}
          <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Contact</DialogTitle>
              </DialogHeader>
              {editingContact && (
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={editingContact.name}
                        onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select 
                        value={editingContact.role || ''} 
                        onValueChange={(v) => setEditingContact({ ...editingContact, role: v || null })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {CONTACT_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={editingContact.email || ''}
                        onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={editingContact.phone || ''}
                        onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input
                        value={editingContact.company || ''}
                        onChange={(e) => setEditingContact({ ...editingContact, company: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input
                        value={editingContact.website || ''}
                        onChange={(e) => setEditingContact({ ...editingContact, website: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input
                      value={editingContact.linkedin || ''}
                      onChange={(e) => setEditingContact({ ...editingContact, linkedin: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pipeline</Label>
                      <Select 
                        value={editingContact.pipeline_id || ''} 
                        onValueChange={(v) => setEditingContact({ 
                          ...editingContact, 
                          pipeline_id: v || null, 
                          pipeline_stage: null 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select pipeline..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {pipelines.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {editingContact.pipeline_id && (
                      <div className="space-y-2">
                        <Label>Stage</Label>
                        <Select 
                          value={editingContact.pipeline_stage || ''} 
                          onValueChange={(v) => setEditingContact({ ...editingContact, pipeline_stage: v || null })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getSelectedPipelineStages(editingContact.pipeline_id).map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={editingContact.notes || ''}
                      onChange={(e) => setEditingContact({ ...editingContact, notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <Button onClick={handleUpdateContact} className="w-full">
                    Save Changes
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Add to Group Dialog */}
          <Dialog open={!!showAddToGroup} onOpenChange={(open) => !open && setShowAddToGroup(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Lists</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-4">
                {groups.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No lists yet. Create one first.</p>
                ) : (
                  groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border"
                    >
                      <Checkbox
                        checked={selectedContactGroups.includes(group.id)}
                        onCheckedChange={(checked) => {
                          if (showAddToGroup) {
                            toggleGroupMembership(showAddToGroup, group.id, !checked);
                          }
                        }}
                      />
                      <Badge className={getColorClass(group.color)}>{group.name}</Badge>
                      {group.description && (
                        <span className="text-sm text-muted-foreground">{group.description}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Add to Pipeline Dialog */}
          <Dialog open={!!showAddToPipeline} onOpenChange={(open) => !open && setShowAddToPipeline(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to Pipeline</DialogTitle>
              </DialogHeader>
              {showAddToPipeline && (
                <div className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Adding <strong>{showAddToPipeline.name}</strong> to a pipeline
                  </p>
                  {pipelines.map((pipeline) => (
                    <div key={pipeline.id} className="space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        {pipeline.name}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {pipeline.stages.map((stage) => (
                          <Button
                            key={stage.id}
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleAssignToPipeline(pipeline.id, stage.id)}
                          >
                            <div className={`w-2 h-2 rounded-full bg-${stage.color}-500`} />
                            {stage.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {pipelines.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No pipelines yet. Create one in the CRM section.
                    </p>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Contacts List */}
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Contacts
              </CardTitle>
              <CardDescription>
                Your saved contacts for automations and pipelines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-start justify-between p-4 rounded-lg bg-secondary/30 border border-border"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-medium text-primary">
                            {contact.name[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{contact.name}</p>
                            {contact.role && (
                              <Badge variant="outline" className="text-xs">
                                <Briefcase className="w-3 h-3 mr-1" />
                                {contact.role}
                              </Badge>
                            )}
                          </div>
                          {contact.company && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {contact.company}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            {contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {contact.email}
                              </span>
                            )}
                            {contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {contact.phone}
                              </span>
                            )}
                            {contact.linkedin && (
                              <a 
                                href={contact.linkedin} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-400 hover:underline"
                              >
                                <Linkedin className="w-3 h-3" />
                                LinkedIn
                              </a>
                            )}
                            {contact.website && (
                              <a 
                                href={contact.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-400 hover:underline"
                              >
                                <Globe className="w-3 h-3" />
                                Website
                              </a>
                            )}
                          </div>
                          {contact.pipeline_id && (
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs gap-1">
                                <GitBranch className="w-3 h-3" />
                                {getPipelineName(contact.pipeline_id)}
                                {contact.pipeline_stage && ` → ${
                                  getSelectedPipelineStages(contact.pipeline_id).find(s => s.id === contact.pipeline_stage)?.name || contact.pipeline_stage
                                }`}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddToPipeline(contact)}
                          title="Add to Pipeline"
                        >
                          <GitBranch className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddToGroup(contact.id)}
                          title="Add to List"
                        >
                          <Tag className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingContact(contact)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => deleteContact(contact.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {contacts.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      No contacts yet. Add one to get started.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="mt-4 space-y-4">
          {/* Create Group Dialog */}
          <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <FolderPlus className="w-4 h-4" />
                Create List
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New List</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>List Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    placeholder="Marketing Team"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    placeholder="Contacts for marketing campaigns"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select value={newGroup.color} onValueChange={(v) => setNewGroup({ ...newGroup, color: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${color.class.split(' ')[0]}`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateGroup} className="w-full">
                  Create List
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Group Dialog */}
          <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit List</DialogTitle>
              </DialogHeader>
              {editingGroup && (
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>List Name</Label>
                    <Input
                      value={editingGroup.name}
                      onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editingGroup.description || ''}
                      onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Select
                      value={editingGroup.color}
                      onValueChange={(v) => setEditingGroup({ ...editingGroup, color: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GROUP_COLORS.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${color.class.split(' ')[0]}`} />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleUpdateGroup} className="w-full">
                    Save Changes
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* View Group Members Dialog */}
          <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge className={getColorClass(selectedGroup?.color || 'blue')}>
                    {selectedGroup?.name}
                  </Badge>
                  <span className="text-muted-foreground font-normal">
                    ({groupMembers.length} members)
                  </span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => selectedGroup && copyEmailList(selectedGroup)}
                  >
                    <Copy className="w-3 h-3" />
                    Copy Emails
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => selectedGroup && copyPhoneList(selectedGroup)}
                  >
                    <Copy className="w-3 h-3" />
                    Copy Phones
                  </Button>
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {groupMembers.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border"
                      >
                        <div>
                          <p className="font-medium text-sm">{contact.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {contact.email && <span>{contact.email}</span>}
                            {contact.phone && <span>{contact.phone}</span>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            if (selectedGroup) {
                              await removeContactFromGroup(contact.id, selectedGroup.id);
                              setGroupMembers(prev => prev.filter(m => m.id !== contact.id));
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {groupMembers.length === 0 && (
                      <p className="text-center py-8 text-muted-foreground">
                        No contacts in this list yet.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          {/* Groups List */}
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Contact Lists
              </CardTitle>
              <CardDescription>
                Organize contacts into lists for bulk operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
                    >
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => handleViewGroup(group)}
                      >
                        <Badge className={getColorClass(group.color)}>
                          {group.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {group.member_count || 0} contacts
                        </span>
                        {group.description && (
                          <span className="text-sm text-muted-foreground hidden sm:inline">
                            • {group.description}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingGroup(group)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => deleteGroup(group.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      No lists yet. Create one to organize your contacts.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}