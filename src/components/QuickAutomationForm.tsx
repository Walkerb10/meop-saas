import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, Zap, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface QuickAutomationFormProps {
  onGenerate: (data: {
    input: string;
    action: string;
    output: string;
    outputDestination: string;
  }) => void;
  isGenerating?: boolean;
}

const OUTPUT_DESTINATIONS = [
  { value: 'slack', label: 'Slack', icon: '💬' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'text', label: 'Text Message', icon: '📱' },
  { value: 'discord', label: 'Discord', icon: '🎮' },
];

export function QuickAutomationForm({ onGenerate, isGenerating = false }: QuickAutomationFormProps) {
  const [input, setInput] = useState('');
  const [action, setAction] = useState('');
  const [output, setOutput] = useState('');
  const [outputDestination, setOutputDestination] = useState('slack');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !action.trim()) return;
    onGenerate({ input, action, output, outputDestination });
  };

  const isValid = input.trim() && action.trim();

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Quick Create</CardTitle>
            <CardDescription>Describe your automation in simple terms</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input - What triggers it */}
          <div className="space-y-2">
            <Label htmlFor="input" className="text-sm font-medium flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">1</span>
              When this happens...
            </Label>
            <Input
              id="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., Every morning at 9am, When I say 'research'"
              className="h-11"
            />
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
            </motion.div>
          </div>

          {/* Action - What to do */}
          <div className="space-y-2">
            <Label htmlFor="action" className="text-sm font-medium flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">2</span>
              Do this...
            </Label>
            <Textarea
              id="action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g., Research the latest AI news, Summarize my calendar"
              className="resize-none h-20"
            />
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            >
              <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
            </motion.div>
          </div>

          {/* Output - Where to send */}
          <div className="space-y-2">
            <Label htmlFor="output" className="text-sm font-medium flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">3</span>
              Then send it to...
            </Label>
            <div className="flex gap-2">
              <Select value={outputDestination} onValueChange={setOutputDestination}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_DESTINATIONS.map(dest => (
                    <SelectItem key={dest.value} value={dest.value}>
                      <span className="flex items-center gap-2">
                        <span>{dest.icon}</span>
                        {dest.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="output"
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                placeholder={outputDestination === 'email' ? 'email@example.com' : outputDestination === 'text' ? '+1234567890' : '#channel'}
                className="flex-1"
              />
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full gap-2 h-11"
            disabled={!isValid || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Automation...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Create Automation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
