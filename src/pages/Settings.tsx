import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Volume2, Bell, Shield, LogOut, MessageSquare, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/AppLayout';
import { VoiceSettings } from '@/components/VoiceSettings';
import { GeneralSettings } from '@/components/GeneralSettings';
import { UserFeedbackList } from '@/components/UserFeedbackList';
import { useAuth } from '@/hooks/useAuth';
import { PageTransition } from '@/components/PageTransition';

const Settings = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <AppLayout>
      <PageTransition className="h-full">
        <div className="max-w-4xl mx-auto flex flex-col h-full">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-background pt-6 px-6 pb-4 border-b border-border">
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure your preferences
            </p>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full mb-6 grid-cols-5">
                <TabsTrigger value="general" className="gap-2">
                  <Settings2 className="w-4 h-4" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="voice" className="gap-2">
                  <Volume2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Voice</span>
                </TabsTrigger>
                <TabsTrigger value="feedback" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">My Feedback</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general">
                <GeneralSettings />
              </TabsContent>

              <TabsContent value="voice">
                <VoiceSettings />
              </TabsContent>

              <TabsContent value="feedback">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-lg font-semibold mb-2">My Feedback</h2>
                    <p className="text-sm text-muted-foreground">
                      View feedback you've submitted.
                    </p>
                  </div>
                  <UserFeedbackList />
                </motion.div>
              </TabsContent>

              <TabsContent value="notifications">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Notifications</h2>
                    <p className="text-sm text-muted-foreground">
                      Notification settings coming soon.
                    </p>
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="security">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Security</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your account security settings.
                    </p>
                  </div>

                  <div className="border-t border-border pt-6">
                    <h3 className="font-medium mb-2">Account</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Signed in as <span className="font-medium text-foreground">{user?.email}</span>
                    </p>
                    <Button variant="destructive" onClick={handleLogout} className="gap-2">
                      <LogOut className="w-4 h-4" />
                      Logout
                    </Button>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
};

export default Settings;
