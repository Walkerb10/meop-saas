import { useState } from 'react';
import { Sparkles, Loader2, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface AIEnhanceButtonProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'research' | 'general';
  context?: {
    output_format?: string;
    output_length?: string;
  };
  disabled?: boolean;
  className?: string;
}

export function AIEnhanceButton({
  value,
  onChange,
  type = 'general',
  context,
  disabled,
  className = '',
}: AIEnhanceButtonProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');

  const handleEnhance = async (instructions?: string) => {
    // For custom mode without existing text, instructions are required
    if (!value.trim() && !instructions?.trim()) {
      toast.error('Enter some text or provide instructions');
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          prompt: value,
          type,
          custom_instructions: instructions,
          output_format: context?.output_format,
          output_length: context?.output_length,
        },
      });

      if (error) throw error;

      if (data?.enhancedPrompt) {
        onChange(data.enhancedPrompt);
        toast.success(instructions ? 'Custom enhancement applied!' : 'Prompt enhanced!');
        setShowCustomInput(false);
        setCustomInstructions('');
      }
    } catch (err) {
      console.error('Enhance error:', err);
      toast.error('Failed to enhance prompt');
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Quick Enhance Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleEnhance()}
        disabled={disabled || isEnhancing || !value.trim()}
        className="h-7 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10"
      >
        {isEnhancing && !showCustomInput ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        Enhance
      </Button>

      {/* Custom Instructions Popover */}
      <Popover open={showCustomInput} onOpenChange={setShowCustomInput}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled || isEnhancing}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
            title="Custom AI instructions"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Custom Enhancement</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowCustomInput(false)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {value.trim() 
                ? 'Tell the AI how to modify your text'
                : 'Describe what you want the AI to write'}
            </p>
            <Textarea
              placeholder={value.trim() 
                ? 'e.g., Make it more concise, add specific metrics...'
                : 'e.g., Write a research prompt about AI trends in healthcare...'}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={3}
              className="text-sm"
              autoFocus
            />
            <Button
              size="sm"
              className="w-full gap-1.5"
              onClick={() => handleEnhance(customInstructions)}
              disabled={isEnhancing || !customInstructions.trim()}
            >
              {isEnhancing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {value.trim() ? 'Apply Enhancement' : 'Generate Text'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
