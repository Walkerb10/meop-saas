import { useState } from 'react';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

interface QuickAutomationFormProps {
  onGenerate: (description: string) => void;
  isGenerating?: boolean;
}

export function QuickAutomationForm({ onGenerate, isGenerating = false }: QuickAutomationFormProps) {
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onGenerate(description.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Quick Create</span>
          </div>
          
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want automated... e.g., 'Every morning at 9am, research the latest AI news and send it to Slack #general'"
            className="resize-none min-h-[80px] bg-background/50"
            disabled={isGenerating}
          />
          
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={!description.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Create Automation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
