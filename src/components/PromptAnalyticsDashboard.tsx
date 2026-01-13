import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePromptAnalytics } from '@/hooks/usePromptAnalytics';
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Target, 
  MessageSquare,
  Lightbulb,
  RefreshCw,
  Calendar,
  BarChart3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function PromptAnalyticsDashboard() {
  const { 
    weeklyAnalytics, 
    latestAnalysis, 
    loading, 
    analyzing,
    generateWeeklyAnalysis 
  } = usePromptAnalytics();

  const [activeTab, setActiveTab] = useState('overview');

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-green-500';
    if (score >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Needs Work';
  };

  if (loading && !latestAnalysis) {
    return (
      <Card className="bg-card">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading analytics...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Prompt Quality Analytics</h2>
          <p className="text-muted-foreground">Track and improve your prompting skills</p>
        </div>
        <Button 
          onClick={generateWeeklyAnalysis} 
          disabled={analyzing}
          className="gap-2"
        >
          {analyzing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Weekly Report
            </>
          )}
        </Button>
      </div>

      {!latestAnalysis ? (
        <Card className="bg-card">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">No Analytics Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Generate your first weekly report to see how you can improve your prompting skills.
              </p>
              <Button onClick={generateWeeklyAnalysis} disabled={analyzing}>
                {analyzing ? 'Analyzing...' : 'Generate First Report'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Score Details</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Overall Score Card */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="py-6">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className={cn(
                      "text-5xl font-bold",
                      getScoreColor(latestAnalysis.overall_score)
                    )}>
                      {Math.round(latestAnalysis.overall_score * 100)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Overall Score</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{getScoreLabel(latestAnalysis.overall_score)}</span>
                      <span className="text-muted-foreground">
                        {latestAnalysis.total_prompts} prompts analyzed
                      </span>
                    </div>
                    <Progress value={latestAnalysis.overall_score * 100} className="h-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Clarity', score: latestAnalysis.avg_clarity_score, icon: MessageSquare },
                { label: 'Specificity', score: latestAnalysis.avg_specificity_score, icon: Target },
                { label: 'Context', score: latestAnalysis.avg_context_score, icon: Lightbulb },
                { label: 'Effectiveness', score: latestAnalysis.avg_effectiveness_score, icon: TrendingUp },
              ].map((item) => (
                <Card key={item.label} className="bg-card">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className={cn("text-2xl font-bold", getScoreColor(item.score))}>
                      {Math.round(item.score * 100)}%
                    </div>
                    <Progress value={item.score * 100} className="h-1.5 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Strengths & Improvements */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Your Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {latestAnalysis.strengths.map((strength, i) => (
                      <Badge key={i} variant="secondary" className="bg-green-500/10 text-green-600">
                        {strength}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    Areas to Improve
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {latestAnalysis.improvement_areas.map((area, i) => (
                      <Badge key={i} variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Personalized Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {latestAnalysis.recommendations}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="mt-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Sample Prompts Analyzed</CardTitle>
                <CardDescription>
                  Recent prompts from your conversations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {latestAnalysis.sample_prompts.length > 0 ? (
                    latestAnalysis.sample_prompts.map((sample, i) => (
                      <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                        <div className={cn(
                          "text-lg font-bold min-w-[3rem]",
                          getScoreColor(sample.score)
                        )}>
                          {Math.round(sample.score * 100)}
                        </div>
                        <p className="text-sm text-muted-foreground flex-1">
                          "{sample.prompt}"
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No sample prompts available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Weekly Reports History</CardTitle>
                <CardDescription>
                  Track your progress over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weeklyAnalytics.map((report) => (
                    <div 
                      key={report.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">
                            {format(new Date(report.analysis_period_start), 'MMM d')} - {format(new Date(report.analysis_period_end), 'MMM d, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {report.total_prompts} prompts analyzed
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "text-xl font-bold",
                          getScoreColor(report.overall_score)
                        )}>
                          {Math.round(report.overall_score * 100)}
                        </div>
                        {weeklyAnalytics.indexOf(report) > 0 && (
                          <div className="flex items-center gap-1">
                            {report.overall_score > weeklyAnalytics[weeklyAnalytics.indexOf(report) - 1].overall_score ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {weeklyAnalytics.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No reports generated yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
