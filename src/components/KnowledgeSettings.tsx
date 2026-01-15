import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Image, Loader2, Check, X, Plus, Book, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useKnowledgeBase, KnowledgeEntry } from '@/hooks/useKnowledgeBase';

const CATEGORIES = ['general', 'procedures', 'contacts', 'policies', 'technical', 'faq'];

interface UploadedItem {
  id: string;
  name: string;
  type: 'text' | 'image';
  status: 'uploading' | 'processing' | 'done' | 'error';
  content?: string;
}

export function KnowledgeSettings() {
  const { entries, isLoading, addEntry, updateEntry, deleteEntry } = useKnowledgeBase();
  const [uploads, setUploads] = useState<UploadedItem[]>([]);
  const [manualText, setManualText] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState('general');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    is_public: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const uploadId = crypto.randomUUID();
      const isImage = file.type.startsWith('image/');
      const isText = file.type.startsWith('text/') || 
                     file.name.endsWith('.md') || 
                     file.name.endsWith('.txt') ||
                     file.name.endsWith('.csv');

      if (!isImage && !isText) {
        toast.error(`Unsupported file type: ${file.name}`);
        continue;
      }

      setUploads(prev => [...prev, {
        id: uploadId,
        name: file.name,
        type: isImage ? 'image' : 'text',
        status: 'uploading',
      }]);

      try {
        if (isText) {
          const content = await readFileAsText(file);
          await processTextContent(uploadId, file.name, content);
        } else if (isImage) {
          const content = await processImage(file);
          await processTextContent(uploadId, file.name, content, 'image_analysis');
        }
      } catch (error) {
        console.error('Upload error:', error);
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, status: 'error' } : u
        ));
        toast.error(`Failed to process ${file.name}`);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const processImage = async (file: File): Promise<string> => {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    });

    const response = await supabase.functions.invoke('chat', {
      body: {
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this image in detail for a knowledge base. Include all relevant information, text visible, objects, context, and any data shown.',
              },
              {
                type: 'image_url',
                image_url: { url: `data:${file.type};base64,${base64}` },
              },
            ],
          },
        ],
      },
    });

    if (response.error) {
      throw new Error('Failed to analyze image');
    }

    return response.data?.content || `Image: ${file.name}`;
  };

  const processTextContent = async (
    uploadId: string, 
    fileName: string, 
    content: string,
    category: string = 'uploaded_document'
  ) => {
    setUploads(prev => prev.map(u => 
      u.id === uploadId ? { ...u, status: 'processing', content } : u
    ));

    const chunks = chunkText(content, 2000);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const title = chunks.length > 1 
        ? `${fileName} (Part ${i + 1}/${chunks.length})`
        : fileName;

      const { data: entry, error: insertError } = await supabase
        .from('knowledge_base')
        .insert({
          title,
          content: chunk,
          category,
          is_public: true,
          is_shared: true,
          chunk_index: i,
          file_name: fileName,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      await supabase.functions.invoke('generate-embedding', {
        body: {
          content: `${title}\n\n${chunk}`,
          knowledgeId: entry.id,
          action: 'generate',
        },
      });
    }

    setUploads(prev => prev.map(u => 
      u.id === uploadId ? { ...u, status: 'done' } : u
    ));
    
    toast.success(`Added ${fileName} to knowledge base`);
  };

  const chunkText = (text: string, maxLength: number): string[] => {
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';

    for (const para of paragraphs) {
      if (currentChunk.length + para.length > maxLength && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  };

  const handleManualSubmit = async () => {
    if (!manualText.trim()) return;

    setIsSubmitting(true);
    const title = manualTitle.trim() || `Manual Entry - ${new Date().toLocaleDateString()}`;

    try {
      await addEntry.mutateAsync({
        title,
        content: manualText.trim(),
        category: manualCategory,
        is_public: isPublic,
      });
      setManualText('');
      setManualTitle('');
      setManualCategory('general');
      setIsPublic(true);
      toast.success('Entry added to knowledge base');
    } catch (error) {
      console.error('Manual entry error:', error);
      toast.error('Failed to add entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const openEditDialog = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setEditFormData({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      is_public: entry.is_public,
    });
    setIsAddOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingEntry || !editFormData.title || !editFormData.content) return;

    await updateEntry.mutateAsync({
      id: editingEntry.id,
      ...editFormData,
    });
    
    setEditingEntry(null);
    setEditFormData({ title: '', content: '', category: 'general', is_public: true });
    setIsAddOpen(false);
  };

  const closeEditDialog = () => {
    setIsAddOpen(false);
    setEditingEntry(null);
    setEditFormData({ title: '', content: '', category: 'general', is_public: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-lg font-semibold mb-2">Business Knowledge Base</h2>
        <p className="text-sm text-muted-foreground">
          Add content to train the AI with your business knowledge. Upload files or add text directly.
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.csv,text/*,image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div 
            className="flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-muted/50 rounded-lg border-2 border-dashed transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="p-3 rounded-full bg-primary/10 mb-3">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium">Drop files here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports text files (.txt, .md, .csv) and images
            </p>
          </div>

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <div className="space-y-2 mt-4">
              {uploads.map(upload => (
                <div 
                  key={upload.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg border",
                    upload.status === 'done' && "bg-green-500/10 border-green-500/30",
                    upload.status === 'error' && "bg-destructive/10 border-destructive/30"
                  )}
                >
                  {upload.type === 'image' ? (
                    <Image className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="flex-1 text-sm truncate">{upload.name}</span>
                  {upload.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {upload.status === 'processing' && (
                    <Badge variant="secondary" className="text-xs">
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Processing
                    </Badge>
                  )}
                  {upload.status === 'done' && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                  {upload.status === 'error' && (
                    <X className="w-4 h-4 text-destructive" />
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => removeUpload(upload.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Text Entry */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Text Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Title</Label>
              <Input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="e.g., Company policies"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={manualCategory} onValueChange={setManualCategory}>
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
          </div>
          <div>
            <Label>Content</Label>
            <Textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Enter knowledge content..."
              className="min-h-[120px]"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="public" className="text-sm">Public to all users</Label>
            </div>
            <Button 
              onClick={handleManualSubmit}
              disabled={!manualText.trim() || isSubmitting || addEntry.isPending}
            >
              {(isSubmitting || addEntry.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Add Entry
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Entries */}
      <Card>
        <CardHeader className="py-3 flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Book className="h-4 w-4" />
            Knowledge Entries
            <Badge variant="secondary">{entries.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Book className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No knowledge entries yet.</p>
              <p className="text-sm">Upload files or add text to train the AI.</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{entry.title}</p>
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
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {entry.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(entry)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteEntry.mutate(entry.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => open ? setIsAddOpen(true) : closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Title</Label>
              <Input
                value={editFormData.title}
                onChange={(e) => setEditFormData(f => ({ ...f, title: e.target.value }))}
                placeholder="Entry title"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={editFormData.category}
                onValueChange={(v) => setEditFormData(f => ({ ...f, category: v }))}
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
              <Label>Content</Label>
              <Textarea
                value={editFormData.content}
                onChange={(e) => setEditFormData(f => ({ ...f, content: e.target.value }))}
                placeholder="Enter content..."
                rows={5}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Public to all users</Label>
              <Switch
                checked={editFormData.is_public}
                onCheckedChange={(checked) => setEditFormData(f => ({ ...f, is_public: checked }))}
              />
            </div>
            <Button
              onClick={handleEditSubmit}
              disabled={!editFormData.title || !editFormData.content || updateEntry.isPending}
              className="w-full"
            >
              {updateEntry.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Update Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
