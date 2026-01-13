import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Globe, Loader2, Activity, MessageSquare, Zap, Clock, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTimezone } from '@/hooks/useTimezone';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface UsageStats {
  totalConversations: number;
  totalMessages: number;
  automationsCreated: number;
  sequencesCreated: number;
  executionsRun: number;
  thisWeekMessages: number;
  thisWeekExecutions: number;
}

const Profile = () => {
  const { user } = useAuth();
  const { timezone, setTimezone, timezones } = useTimezone();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<UsageStats>({
    totalConversations: 0,
    totalMessages: 0,
    automationsCreated: 0,
    sequencesCreated: 0,
    executionsRun: 0,
    thisWeekMessages: 0,
    thisWeekExecutions: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('team_members')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      
      if (data?.display_name) {
        setDisplayName(data.display_name);
      }
      setIsLoading(false);
    };
    
    fetchProfile();
  }, [user?.id]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      
      try {
        const weekStart = startOfWeek(new Date());
        const weekEnd = endOfWeek(new Date());
        
        // Fetch all stats in parallel
        const [
          conversationsResult,
          messagesResult,
          automationsResult,
          sequencesResult,
          executionsResult,
          weekMessagesResult,
          weekExecutionsResult,
        ] = await Promise.all([
          supabase.from('chat_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
          supabase.from('automations').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
          supabase.from('sequences').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
          supabase.from('executions').select('id', { count: 'exact', head: true }),
          supabase.from('chat_messages').select('id', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
          supabase.from('executions').select('id', { count: 'exact', head: true }).gte('started_at', weekStart.toISOString()),
        ]);
        
        setStats({
          totalConversations: conversationsResult.count || 0,
          totalMessages: messagesResult.count || 0,
          automationsCreated: automationsResult.count || 0,
          sequencesCreated: sequencesResult.count || 0,
          executionsRun: executionsResult.count || 0,
          thisWeekMessages: weekMessagesResult.count || 0,
          thisWeekExecutions: weekExecutionsResult.count || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchStats();
  }, [user?.id]);

  const handleSaveChanges = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ display_name: displayName })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error saving profile',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const statCards = [
    { 
      label: 'Total Conversations', 
      value: stats.totalConversations, 
      icon: MessageSquare, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    { 
      label: 'Messages Sent', 
      value: stats.totalMessages, 
      icon: Activity, 
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    { 
      label: 'Automations', 
      value: stats.automationsCreated, 
      icon: Zap, 
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    { 
      label: 'Sequences', 
      value: stats.sequencesCreated, 
      icon: TrendingUp, 
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    { 
      label: 'Executions', 
      value: stats.executionsRun, 
      icon: Clock, 
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto flex flex-col h-full">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background pt-6 px-6 pb-4 border-b border-border flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Profile</h2>
            <p className="text-sm text-muted-foreground">Manage your account settings and view usage</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Usage Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Usage Statistics
            </h3>
            
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* This Week Summary */}
                <div className="mb-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">This Week</span>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <span className="text-2xl font-bold">{stats.thisWeekMessages}</span>
                      <span className="text-sm text-muted-foreground ml-1">messages</span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold">{stats.thisWeekExecutions}</span>
                      <span className="text-sm text-muted-foreground ml-1">executions</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {statCards.map((stat) => (
                    <Card key={stat.label} className="bg-card/50">
                      <CardContent className="p-4">
                        <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                          <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </motion.div>

          {/* Profile Settings */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6 max-w-md"
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Account Settings
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Display Name
                </Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  defaultValue={user?.email || ''}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              {/* Timezone Settings */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Timezone
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  All times in the app will be displayed in this timezone.
                </p>
              </div>

              <Button className="w-full" onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </motion.div>

          {/* Account Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Account Status</p>
                    <p className="text-xs text-muted-foreground">
                      Member since {user?.created_at ? format(new Date(user.created_at), 'MMMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
