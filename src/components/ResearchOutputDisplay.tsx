import { useState, useCallback } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ResearchOutputDisplayProps {
  data: {
    content: string;
    citations?: string[];
  };
  rawData?: Record<string, unknown>;
}

// Clean and format content to be paper-ready
function formatForReadability(content: string): string {
  let text = content;

  // Remove common AI/automation markers
  const aiMarkers = [
    /^Here'?s?\s+(?:what\s+)?(?:I\s+)?found:?\s*/gi,
    /^Here\s+(?:are|is)\s+(?:the\s+)?(?:results?|information|data):?\s*/gi,
    /^Based\s+on\s+(?:my\s+)?research:?\s*/gi,
    /^According\s+to\s+(?:my\s+)?findings:?\s*/gi,
    /^The\s+research\s+shows:?\s*/gi,
    /^\*\*Summary:?\*\*\s*/gi,
    /^\*\*Results?:?\*\*\s*/gi,
    /^\*\*Findings?:?\*\*\s*/gi,
  ];
  
  aiMarkers.forEach(marker => {
    text = text.replace(marker, '');
  });

  // Remove JSON-like formatting
  text = text.replace(/^\s*[\[{]/gm, '');
  text = text.replace(/[\]}]\s*$/gm, '');
  text = text.replace(/^"(.+)"$/gm, '$1');
  text = text.replace(/\\n/g, '\n');
  text = text.replace(/\\"/g, '"');
  text = text.replace(/\\t/g, ' ');

  // Remove markdown bullet points and convert to prose
  text = text.replace(/^\s*[-*•]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');

  // Clean up markdown formatting
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1'); // Bold
  text = text.replace(/\*([^*]+)\*/g, '$1'); // Italic
  text = text.replace(/__([^_]+)__/g, '$1'); // Bold alt
  text = text.replace(/_([^_]+)_/g, '$1'); // Italic alt
  text = text.replace(/`([^`]+)`/g, '$1'); // Code
  text = text.replace(/^#+\s+/gm, ''); // Headers

  // Replace em-dashes and technical separators with proper punctuation
  text = text.replace(/\s*—\s*/g, ' – ');
  text = text.replace(/\s*--\s*/g, ' – ');
  text = text.replace(/\s*\|\s*/g, '; ');

  // Clean CSV-style commas between items into natural prose
  text = text.replace(/,\s*,/g, ',');
  
  // Fix multiple spaces
  text = text.replace(/  +/g, ' ');
  
  // Fix multiple newlines into paragraph breaks
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Clean up leading/trailing whitespace on lines
  text = text.split('\n').map(line => line.trim()).join('\n');
  
  // Remove empty lines at start and end
  text = text.trim();

  // Convert line breaks into proper paragraph structure
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  
  // Join single line breaks within paragraphs
  const formattedParagraphs = paragraphs.map(p => {
    return p.replace(/\n/g, ' ').replace(/  +/g, ' ').trim();
  });

  return formattedParagraphs.join('\n\n');
}

// Convert data to CSV format
function convertToCSV(data: { content: string; citations?: string[] }, rawData?: Record<string, unknown>): string {
  const rows: string[][] = [];
  
  // Header row
  rows.push(['Field', 'Value']);
  
  // Content row
  rows.push(['Content', data.content.replace(/"/g, '""')]);
  
  // Citations
  if (data.citations && data.citations.length > 0) {
    data.citations.forEach((citation, idx) => {
      rows.push([`Citation ${idx + 1}`, citation]);
    });
  }
  
  // Additional raw data fields if available
  if (rawData) {
    Object.entries(rawData).forEach(([key, value]) => {
      if (key !== 'content' && key !== 'citations' && value !== undefined) {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        rows.push([key, stringValue.replace(/"/g, '""')]);
      }
    });
  }
  
  // Convert to CSV string
  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

export function ResearchOutputDisplay({ data, rawData }: ResearchOutputDisplayProps) {
  const [copied, setCopied] = useState(false);
  
  const formattedContent = formatForReadability(data.content);
  
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formattedContent);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [formattedContent]);
  
  const handleDownloadCSV = useCallback(() => {
    const csv = convertToCSV(data, rawData as Record<string, unknown>);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `research-output-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  }, [data, rawData]);

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex items-center gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 gap-1.5 text-xs"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadCSV}
          className="h-8 gap-1.5 text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          Download CSV
        </Button>
      </div>

      {/* Formatted content - paper-ready prose */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {formattedContent.split('\n\n').map((paragraph, idx) => (
          <p key={idx} className="text-sm leading-relaxed text-foreground mb-4 last:mb-0">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Citations as footnotes */}
      {data.citations && data.citations.length > 0 && (
        <div className="pt-4 mt-4 border-t border-border">
          <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            References
          </h4>
          <ol className="list-decimal list-inside space-y-1.5">
            {data.citations.map((citation, idx) => (
              <li key={idx} className="text-xs text-muted-foreground">
                <a
                  href={citation}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {citation}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
