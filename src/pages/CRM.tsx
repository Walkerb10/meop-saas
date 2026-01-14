import { useState } from 'react';
import { Users, GitBranch, Contact } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { ContactsManager } from '@/components/ContactsManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PipelinesManager } from '@/components/PipelinesManager';

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState('pipelines');

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-full mx-auto min-h-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 md:w-6 md:h-6" />
            CRM
          </h1>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary/50 mb-6">
            <TabsTrigger value="pipelines" className="gap-2">
              <GitBranch className="w-4 h-4" />
              Pipelines
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <Contact className="w-4 h-4" />
              Contacts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipelines" className="mt-0">
            <PipelinesManager />
          </TabsContent>

          <TabsContent value="contacts" className="mt-0">
            <ContactsManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
