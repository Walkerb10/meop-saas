import { motion } from 'framer-motion';
import { User, Mail, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLayout } from '@/components/AppLayout';

const Profile = () => {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Avatar section */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Profile</h2>
              <p className="text-sm text-muted-foreground">Manage your account settings</p>
            </div>
          </div>

          {/* Form section */}
          <div className="space-y-6 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Display Name
              </Label>
              <Input id="name" placeholder="Your name" defaultValue="Demo User" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input id="email" type="email" placeholder="your@email.com" defaultValue="demo@example.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                ElevenLabs API Key
              </Label>
              <Input id="apiKey" type="password" placeholder="••••••••••••" />
              <p className="text-xs text-muted-foreground">
                Your API key is stored securely and never shared.
              </p>
            </div>

            <Button className="w-full">Save Changes</Button>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Profile;
