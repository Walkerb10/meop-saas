import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const VOICES = [
  { id: 'Roger', name: 'Roger', description: 'Deep & confident' },
  { id: 'Sarah', name: 'Sarah', description: 'Warm & friendly' },
  { id: 'Laura', name: 'Laura', description: 'Professional & clear' },
  { id: 'Charlie', name: 'Charlie', description: 'Casual & relaxed' },
  { id: 'George', name: 'George', description: 'British & refined' },
  { id: 'Callum', name: 'Callum', description: 'Scottish accent' },
  { id: 'Liam', name: 'Liam', description: 'Young & energetic' },
  { id: 'Alice', name: 'Alice', description: 'Soft & gentle' },
  { id: 'Matilda', name: 'Matilda', description: 'Warm & expressive' },
  { id: 'Jessica', name: 'Jessica', description: 'Bright & engaging' },
  { id: 'Eric', name: 'Eric', description: 'Calm & reassuring' },
  { id: 'Brian', name: 'Brian', description: 'Authoritative' },
];

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  disabled?: boolean;
}

export function VoiceSelector({ selectedVoice, onVoiceChange, disabled }: VoiceSelectorProps) {
  const selected = VOICES.find(v => v.id === selectedVoice) || VOICES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button 
          variant="outline" 
          className="gap-2 bg-card/50 border-border/50 hover:bg-card"
          disabled={disabled}
        >
          <span className="text-sm">{selected.name}</span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        {VOICES.map((voice) => (
          <DropdownMenuItem
            key={voice.id}
            onClick={() => onVoiceChange(voice.id)}
            className="flex flex-col items-start gap-0.5 cursor-pointer"
          >
            <span className="font-medium">{voice.name}</span>
            <span className="text-xs text-muted-foreground">{voice.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
