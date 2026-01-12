import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppRole } from '@/hooks/useUserRole';

interface FeaturePermission {
  id: string;
  role: AppRole;
  feature_key: string;
  can_access: boolean;
}

const FEATURES: { key: string; label: string; description: string }[] = [
  { key: 'webhooks', label: 'Webhooks', description: 'View and manage webhook URLs' },
  { key: 'admin_dashboard', label: 'Admin Dashboard', description: 'Access admin settings' },
  { key: 'voice_agent', label: 'Voice Agent', description: 'Use voice agent features' },
  { key: 'sequences', label: 'Sequences', description: 'Create and manage sequences' },
  { key: 'executions', label: 'Executions', description: 'View execution history' },
  { key: 'calendar', label: 'Calendar', description: 'View team calendar' },
  { key: 'task_assignment', label: 'Task Assignment', description: 'Assign tasks to team members' },
  { key: 'feedback', label: 'Feedback', description: 'Submit and view feedback' },
];

const ROLES: AppRole[] = ['admin', 'manager', 'member', 'tester'];

const getRoleBadgeColor = (role: AppRole) => {
  switch (role) {
    case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'manager': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'member': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'tester': return 'bg-green-500/20 text-green-400 border-green-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function FeatureAccessManager() {
  const [permissions, setPermissions] = useState<FeaturePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from('feature_permissions')
      .select('*');

    if (error) {
      console.error('Error fetching permissions:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load permissions' });
    } else {
      setPermissions(data || []);
    }
    setLoading(false);
  };

  const getPermission = (role: AppRole, featureKey: string): boolean => {
    // Admin always has access to everything
    if (role === 'admin') return true;
    const perm = permissions.find(p => p.role === role && p.feature_key === featureKey);
    return perm?.can_access ?? false;
  };

  const togglePermission = async (role: AppRole, featureKey: string, currentValue: boolean) => {
    // Prevent toggling admin permissions
    if (role === 'admin') return;

    const existing = permissions.find(p => p.role === role && p.feature_key === featureKey);
    
    if (existing) {
      const { error } = await supabase
        .from('feature_permissions')
        .update({ can_access: !currentValue })
        .eq('id', existing.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update permission' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('feature_permissions')
        .insert({ role, feature_key: featureKey, can_access: !currentValue });

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create permission' });
        return;
      }
    }

    toast({ title: 'Updated', description: `${featureKey} access ${!currentValue ? 'enabled' : 'disabled'} for ${role}` });
    fetchPermissions();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle>Feature Access Control</CardTitle>
          <CardDescription>
            Control which features each role can access. Admin always has full access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {FEATURES.map((feature) => (
              <div key={feature.key} className="space-y-3">
                <div>
                  <h3 className="font-medium text-foreground">{feature.label}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ROLES.map((role) => {
                    const hasAccess = getPermission(role, feature.key);
                    const isAdmin = role === 'admin';
                    return (
                      <div 
                        key={role} 
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
                      >
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeColor(role)}>{role}</Badge>
                        </div>
                        <Switch
                          checked={hasAccess}
                          onCheckedChange={() => togglePermission(role, feature.key, hasAccess)}
                          disabled={isAdmin}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
