import { useChatPermissions } from '@/hooks/useChatPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, Loader2 } from 'lucide-react';

const PERMISSION_LABELS: Record<string, string> = {
  can_view_all_conversations: 'View All Conversations',
  can_view_all_automations: 'View All Automations',
  can_view_all_executions: 'View All Executions',
  can_view_knowledge_base: 'View Knowledge Base',
  can_add_knowledge: 'Add Knowledge Entries',
  can_view_team_activity: 'View Team Activity',
};

export function ChatPermissionsManager() {
  const { permissions, isLoading, updatePermission } = useChatPermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-medium">Chat Data Permissions</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Control what data each role can access when using the platform assistant.
      </p>

      <div className="grid gap-4">
        {permissions.map((perm) => (
          <Card key={perm.role}>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant={perm.role === 'admin' ? 'default' : 'secondary'}>
                  {perm.role.charAt(0).toUpperCase() + perm.role.slice(1)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={`${perm.role}-${key}`} className="text-sm">
                      {label}
                    </Label>
                    <Switch
                      id={`${perm.role}-${key}`}
                      checked={perm[key as keyof typeof perm] as boolean}
                      onCheckedChange={(checked) =>
                        updatePermission.mutate({
                          role: perm.role,
                          [key]: checked,
                        })
                      }
                      disabled={perm.role === 'admin' || updatePermission.isPending}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
