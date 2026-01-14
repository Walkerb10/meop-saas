import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, RefreshCw, Sparkles, FileText, 
  TrendingUp, Users, Target, Zap, Copy, Check,
  Download, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ResearchResults {
  trends: string;
  citations: string[];
}

interface LinkedInPost {
  type: 'lead_magnet' | 'offer' | 'value';
  content: string;
  hook: string;
  cta?: string;
}

interface GeneratedPosts {
  posts: LinkedInPost[];
  rawContent: string;
}

const KEYWORDS = [
  'AI agents & automation',
  'Startups & agency growth',
  'Lead magnets & offers',
  'High-ticket sales',
  'Content creation strategies',
  'Unique Value Propositions',
  'LinkedIn growth tactics',
  'Outcome-based prompting',
  'No-brainer offers',
];

const PLATFORMS = [
  { name: 'TikTok', icon: '📱', focus: 'trending business/AI content' },
  { name: 'LinkedIn', icon: '💼', focus: 'startup/agency posts' },
  { name: 'Yahoo Finance', icon: '📈', focus: 'business trends' },
  { name: 'Twitter/X', icon: '🐦', focus: 'AI & startup discussions' },
  { name: 'Reddit', icon: '🔴', focus: 'r/startups, r/entrepreneur, r/marketing' },
];

export function LinkedInResearchAutomation() {
  const [isResearching, setIsResearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [researchResults, setResearchResults] = useState<ResearchResults | null>(null);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPosts | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showKeywords, setShowKeywords] = useState(false);

  const runResearch = useCallback(async () => {
    setIsResearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-research', {
        body: { action: 'research' },
      });

      if (error) throw error;

      if (data?.success) {
        setResearchResults({
          trends: data.content,
          citations: data.citations || [],
        });
        toast.success('Research completed successfully');
      } else {
        throw new Error(data?.error || 'Research failed');
      }
    } catch (err) {
      console.error('Research error:', err);
      toast.error('Failed to complete research');
    } finally {
      setIsResearching(false);
    }
  }, []);

  const generatePosts = useCallback(async () => {
    if (!researchResults) {
      toast.error('Run research first');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-research', {
        body: { 
          action: 'generate',
          trends: researchResults.trends,
        },
      });

      if (error) throw error;

      if (data?.success && data?.posts) {
        setGeneratedPosts({
          posts: data.posts,
          rawContent: data.rawContent || '',
        });
        toast.success('Posts generated successfully');
      } else {
        throw new Error(data?.error || 'Generation failed');
      }
    } catch (err) {
      console.error('Generation error:', err);
      toast.error('Failed to generate posts');
    } finally {
      setIsGenerating(false);
    }
  }, [researchResults]);

  const copyPost = useCallback(async (index: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const downloadCSV = useCallback(() => {
    if (!generatedPosts) return;

    const rows = [
      ['Post Type', 'Hook', 'Content', 'CTA'],
      ...generatedPosts.posts.map(post => [
        post.type,
        post.hook.replace(/"/g, '""'),
        post.content.replace(/"/g, '""'),
        post.cta || '',
      ]),
    ];

    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `linkedin-posts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  }, [generatedPosts]);

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'lead_magnet':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'offer':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'value':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPostTypeLabel = (type: string) => {
    switch (type) {
      case 'lead_magnet':
        return 'Lead Magnet';
      case 'offer':
        return 'Offer';
      case 'value':
        return 'Value';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">LinkedIn Content Engine</h2>
            <p className="text-sm text-muted-foreground">
              Research trends & generate high-converting posts
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => (
            <Badge key={platform.name} variant="outline" className="gap-1.5">
              <span>{platform.icon}</span>
              <span className="text-xs">{platform.name}</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Keywords panel */}
      <Collapsible open={showKeywords} onOpenChange={setShowKeywords}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Tracked Keywords</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {KEYWORDS.length}
                  </Badge>
                </div>
                {showKeywords ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {KEYWORDS.map((keyword) => (
                  <Badge key={keyword} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={runResearch}
          disabled={isResearching}
          className="gap-2"
        >
          {isResearching ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {isResearching ? 'Researching...' : 'Run 48h Research'}
        </Button>

        <Button
          onClick={generatePosts}
          disabled={isGenerating || !researchResults}
          variant="secondary"
          className="gap-2"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isGenerating ? 'Generating...' : 'Generate 3 Posts'}
        </Button>

        {generatedPosts && (
          <Button
            onClick={downloadCSV}
            variant="outline"
            size="icon"
            className="shrink-0"
          >
            <Download className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Results Tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts" className="gap-2">
            <FileText className="w-4 h-4" />
            Generated Posts
          </TabsTrigger>
          <TabsTrigger value="research" className="gap-2">
            <Zap className="w-4 h-4" />
            Research Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          <AnimatePresence mode="wait">
            {generatedPosts ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {generatedPosts.posts.map((post, idx) => (
                  <Card key={idx} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getPostTypeColor(post.type)}>
                            {getPostTypeLabel(post.type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Post {idx + 1}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyPost(idx, post.content)}
                          className="h-8 gap-1.5"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedIndex === idx ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Hook highlight */}
                      {post.hook && (
                        <div className="mb-3 p-2 rounded-md bg-muted/50 border-l-2 border-primary">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Hook
                          </p>
                          <p className="text-sm font-medium">{post.hook}</p>
                        </div>
                      )}
                      
                      {/* Post content */}
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {post.content.split('\n').map((line, lineIdx) => (
                          <p 
                            key={lineIdx} 
                            className="text-sm leading-relaxed mb-2 last:mb-0"
                          >
                            {line}
                          </p>
                        ))}
                      </div>

                      {/* CTA highlight */}
                      {post.cta && (
                        <div className="mt-3 p-2 rounded-md bg-primary/5 border border-primary/20">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Call to Action
                          </p>
                          <p className="text-sm font-medium text-primary">{post.cta}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      {researchResults 
                        ? 'Click "Generate 3 Posts" to create LinkedIn content'
                        : 'Run research first to generate posts'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="research" className="mt-4">
          <AnimatePresence mode="wait">
            {researchResults ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">48-Hour Trend Analysis</CardTitle>
                    <CardDescription>
                      Latest insights from tracked platforms and keywords
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {researchResults.trends.split('\n\n').map((paragraph, idx) => (
                        <p 
                          key={idx} 
                          className="text-sm leading-relaxed mb-4 last:mb-0"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {researchResults.citations.length > 0 && (
                      <div className="mt-6 pt-4 border-t">
                        <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                          Sources ({researchResults.citations.length})
                        </h4>
                        <ol className="list-decimal list-inside space-y-1.5">
                          {researchResults.citations.map((citation, idx) => (
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
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      Click "Run 48h Research" to analyze current trends
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}
