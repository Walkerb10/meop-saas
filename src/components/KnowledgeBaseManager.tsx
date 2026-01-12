import { useState } from 'react';
import { useKnowledgeBase, KnowledgeEntry } from '@/hooks/useKnowledgeBase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, Book, Loader2 } from 'lucide-react';

const CATEGORIES = ['general', 'procedures', 'contacts', 'policies', 'technical', 'faq'];

export function KnowledgeBaseManager() {
  const { entries, isLoading, addEntry, updateEntry, deleteEntry } = useKnowledgeBase();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    is_public: true,
  });

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) return;

    if (editingEntry) {
      await updateEntry.mutateAsync({
        id: editingEntry.id,
        ...formData,
      });
      setEditingEntry(null);
    } else {
      await addEntry.mutateAsync(formData);
    }

    setFormData({ title: '', content: '', category: 'general', is_public: true });
    setIsAddOpen(false);
  };

  const openEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      is_public: entry.is_public,
    });
    setIsAddOpen(true);
  };

  const closeDialog = () => {
    setIsAddOpen(false);
    setEditingEntry(null);
    setFormData({ title: '', content: '', category: 'general', is_public: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Book className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Knowledge Base</h3>
          <Badge variant="secondary">{entries.length} entries</Badge>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => open ? setIsAddOpen(true) : closeDialog()}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEntry ? 'Edit Entry' : 'Add Knowledge Entry'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Team communication guidelines"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData(f => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
                  placeholder="Enter the knowledge content..."
                  rows={5}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="public">Public to all users</Label>
                <Switch
                  id="public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData(f => ({ ...f, is_public: checked }))}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!formData.title || !formData.content || addEntry.isPending || updateEntry.isPending}
                className="w-full"
              >
                {(addEntry.isPending || updateEntry.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingEntry ? 'Update Entry' : 'Add Entry'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Book className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No knowledge entries yet.</p>
            <p className="text-sm">Add entries to train the platform assistant.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{entry.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {entry.category}
                      </Badge>
                      {entry.is_public ? (
                        <Badge variant="secondary" className="text-xs">Public</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Restricted</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(entry)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEntry.mutate(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {entry.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
