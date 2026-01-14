import { Users } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { ContactsManager } from '@/components/ContactsManager';

export default function ContactsPage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 md:w-6 md:h-6" />
            Contacts
          </h1>
        </div>
        <ContactsManager />
      </div>
    </AppLayout>
  );
}
