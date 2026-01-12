import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Brain, 
  Upload, 
  Plus, 
  FileText, 
  Loader2, 
  Check, 
  AlertCircle,
  Trash2,
  RefreshCw,
  Database
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useKnowledgeBase, KnowledgeEntry } from '@/hooks/useKnowledgeBase';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = [
  'SOPs',
  'Instructions',
  'Company Info',
  'Product Knowledge',
  'FAQ',
  'Training Materials',
  'General',
];

export function AITrainingManager() {
  const { entries, isLoading, addEntry, updateEntry, deleteEntry } = useKnowledgeBase();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
  });

  const handleAddEntry = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill in title and content' });
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Adding entry...');
    setProcessingProgress(30);

    try {
      await addEntry.mutateAsync({
        title: formData.title,
        content: formData.content,
        category: formData.category,
        is_public: true,
      });

      setProcessingProgress(60);
      setProcessingStatus('Generating embedding...');

      // Generate embedding for the new entry
      const { data: newEntries } = await supabase
        .from('knowledge_base')
        .select('id')
        .eq('title', formData.title)
        .order('created_at', { ascending: false })
        .limit(1);

      if (newEntries && newEntries[0]) {
        await supabase.functions.invoke('generate-embedding', {
          body: { 
            content: `${formData.title}\n\n${formData.content}`,
            knowledgeId: newEntries[0].id,
            action: 'generate'
          }
        });
      }

      setProcessingProgress(100);
      setProcessingStatus('Complete!');
      
      setTimeout(() => {
        setIsAddOpen(false);
        setFormData({ title: '', content: '', category: 'General' });
        setProcessingProgress(0);
        setProcessingStatus('');
      }, 500);
    } catch (error) {
      console.error('Error adding entry:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add training data' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const totalFiles = files.length;
    let processed = 0;

    for (const file of Array.from(files)) {
      setProcessingStatus(`Processing ${file.name}...`);
      setProcessingProgress((processed / totalFiles) * 100);

      try {
        const text = await readFileAsText(file);
        
        // Split large files into chunks
        const chunks = chunkText(text, 4000);
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const title = chunks.length > 1 
            ? `${file.name} (Part ${i + 1}/${chunks.length})`
            : file.name.replace(/\.[^/.]+$/, '');

          await addEntry.mutateAsync({
            title,
            content: chunk,
            category: 'Training Materials',
            is_public: true,
          });

          // Generate embedding
          const { data: newEntries } = await supabase
            .from('knowledge_base')
            .select('id')
            .eq('title', title)
            .order('created_at', { ascending: false })
            .limit(1);

          if (newEntries && newEntries[0]) {
            await supabase.functions.invoke('generate-embedding', {
              body: { 
                content: `${title}\n\n${chunk}`,
                knowledgeId: newEntries[0].id,
                action: 'generate'
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        toast({ 
          variant: 'destructive', 
          title: 'Error', 
          description: `Failed to process ${file.name}` 
        });
      }

      processed++;
    }

    setProcessingProgress(100);
    setProcessingStatus('All files processed!');
    
    setTimeout(() => {
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 1500);
  };

  const regenerateEmbedding = async (entry: KnowledgeEntry) => {
    setRegeneratingId(entry.id);
    try {
      await supabase.functions.invoke('generate-embedding', {
        body: { 
          content: `${entry.title}\n\n${entry.content}`,
          knowledgeId: entry.id,
          action: 'generate'
        }
      });
      toast({ title: 'Embedding regenerated' });
    } catch (error) {
      console.error('Error regenerating embedding:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to regenerate embedding' });
    } finally {
      setRegeneratingId(null);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const chunkText = (text: string, maxLength: number): string[] => {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxLength && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += sentence + ' ';
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SOPs': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Instructions': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Company Info': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Product Knowledge': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'FAQ': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Training Materials': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{entries.length}</p>
                <p className="text-sm text-muted-foreground">Knowledge Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Check className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {entries.filter(e => (e as any).embedding).length}
                </p>
                <p className="text-sm text-muted-foreground">With Embeddings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Brain className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">Active</p>
                <p className="text-sm text-muted-foreground">MEOP AI Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Train MEOP AI
          </CardTitle>
          <CardDescription>
            Upload documents or add text entries to train MEOP AI. The AI will use this knowledge to answer questions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* File Upload */}
            <div className="flex-1">
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".txt,.md,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                className="w-full h-24 flex flex-col gap-2 border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                <Upload className="w-6 h-6" />
                <span>Upload Files (.txt, .md, .csv)</span>
              </Button>
            </div>

            {/* Manual Entry */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-24 flex flex-col gap-2 sm:w-48">
                  <Plus className="w-6 h-6" />
                  <span>Add Entry</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Training Data</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Entry title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(v) => setFormData({ ...formData, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Enter the knowledge content here. This can be SOPs, instructions, FAQs, or any information you want the AI to know..."
                      rows={10}
                    />
                  </div>
                  <Button 
                    onClick={handleAddEntry} 
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {processingStatus}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add & Generate Embedding
                      </>
                    )}
                  </Button>
                  {isProcessing && (
                    <Progress value={processingProgress} className="mt-2" />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="mt-4 p-4 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">{processingStatus}</span>
              </div>
              <Progress value={processingProgress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Knowledge Entries */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Training Data ({entries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {entries.map((entry) => (
                <div 
                  key={entry.id} 
                  className="p-4 rounded-lg bg-secondary/30 border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground">{entry.title}</h3>
                        <Badge className={getCategoryColor(entry.category)}>
                          {entry.category}
                        </Badge>
                        {(entry as any).embedding ? (
                          <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
                            <Check className="w-3 h-3" />
                            Embedded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-yellow-500 border-yellow-500/30">
                            <AlertCircle className="w-3 h-3" />
                            No Embedding
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {entry.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Added {new Date(entry.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => regenerateEmbedding(entry)}
                        disabled={regeneratingId === entry.id}
                      >
                        {regeneratingId === entry.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => deleteEntry.mutate(entry.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {entries.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No training data yet. Upload files or add entries to train MEOP AI.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
