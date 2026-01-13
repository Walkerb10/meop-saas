import { useState, useEffect } from 'react';
import { useContacts, Contact, ContactGroup } from '@/hooks/useContacts';
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
  // Strip all non-digits
  const digits = phone.replace(/\D/g, '');
  // If it starts with 1, assume US and add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }
  // If 10 digits, assume US and add +1
  if (digits.length === 10) {
    return '+1' + digits;
  }
  // Otherwise just add + if not present
  return phone.startsWith('+') ? phone : '+' + digits;
}

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
  const { toast } = useToast();

  const [showCreateContact, setShowCreateContact] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ContactGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<Contact[]>([]);
  const [showAddToGroup, setShowAddToGroup] = useState<string | null>(null);
  const [selectedContactGroups, setSelectedContactGroups] = useState<string[]>([]);

  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    color: 'blue',
  });

  const handleCreateContact = async () => {
    if (!newContact.name.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Name is required' });
      return;
    }

    await createContact({
      name: newContact.name,
      email: newContact.email || null,
      phone: newContact.phone ? formatPhoneE164(newContact.phone) : null,
      notes: newContact.notes || null,
    });

    setNewContact({ name: '', email: '', phone: '', notes: '' });
    setShowCreateContact(false);
  };

  const handleUpdateContact = async () => {
    if (!editingContact) return;

    await updateContact(editingContact.id, {
      name: editingContact.name,
      email: editingContact.email,
      phone: editingContact.phone ? formatPhoneE164(editingContact.phone) : null,
      notes: editingContact.notes,
    });

    setEditingContact(null);
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
            Groups ({groups.length})
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
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
                  <p className="text-xs text-muted-foreground">Will be formatted to E.164 (+1XXXXXXXXXX)</p>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newContact.notes}
                    onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                    placeholder="Any notes about this contact..."
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Contact</DialogTitle>
              </DialogHeader>
              {editingContact && (
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={editingContact.name}
                      onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                    />
                  </div>
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
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={editingContact.notes || ''}
                      onChange={(e) => setEditingContact({ ...editingContact, notes: e.target.value })}
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
                <DialogTitle>Manage Groups</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-4">
                {groups.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No groups yet. Create one first.</p>
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

          {/* Contacts List */}
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Contacts
              </CardTitle>
              <CardDescription>
                Your saved contacts for automations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {contact.name[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{contact.name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddToGroup(contact.id)}
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
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Group Name <span className="text-destructive">*</span></Label>
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
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Group Dialog */}
          <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Group</DialogTitle>
              </DialogHeader>
              {editingGroup && (
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Group Name</Label>
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
                        No contacts in this group yet.
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
                Contact Groups
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
                      No groups yet. Create one to organize your contacts.
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
