import { useState, useRef } from 'react';
import { Upload, FileText, Image, Loader2, Check, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

interface UploadedItem {
  id: string;
  name: string;
  type: 'text' | 'image';
  status: 'uploading' | 'processing' | 'done' | 'error';
  content?: string;
}

export function RAGUploader() {
  const [isOpen, setIsOpen] = useState(false);
  const [uploads, setUploads] = useState<UploadedItem[]>([]);
  const [manualText, setManualText] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    // Reset file input
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
    // Convert image to base64 and send to AI for description
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data URL prefix
      };
      reader.readAsDataURL(file);
    });

    // Use AI to describe the image
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

    // Chunk content if too large
    const chunks = chunkText(content, 2000);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const title = chunks.length > 1 
        ? `${fileName} (Part ${i + 1}/${chunks.length})`
        : fileName;

      // Insert into knowledge base
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

      // Generate embedding
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
    const uploadId = crypto.randomUUID();
    const title = manualTitle.trim() || `Manual Entry - ${new Date().toLocaleDateString()}`;

    setUploads(prev => [...prev, {
      id: uploadId,
      name: title,
      type: 'text',
      status: 'processing',
    }]);

    try {
      await processTextContent(uploadId, title, manualText.trim(), 'manual_entry');
      setManualText('');
      setManualTitle('');
    } catch (error) {
      console.error('Manual entry error:', error);
      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, status: 'error' } : u
      ));
      toast.error('Failed to add entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="w-4 h-4" />
          Upload to AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to Knowledge Base</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.csv,text/*,image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div 
                className="flex flex-col items-center justify-center py-6 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
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
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <div className="space-y-2">
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

          {/* Manual Text Entry */}
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium">Or add text directly</p>
            <Input
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Title (optional)"
            />
            <Textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Enter knowledge content..."
              className="min-h-[100px] resize-none"
            />
            <Button 
              onClick={handleManualSubmit}
              disabled={!manualText.trim() || isSubmitting}
              className="w-full gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add to Knowledge Base
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
