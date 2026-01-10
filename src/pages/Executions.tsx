import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Demo execution data
const demoExecutions = [
  {
    id: '1',
    sequenceName: 'Research Assistant',
    status: 'completed',
    startedAt: new Date(Date.now() - 1000 * 60 * 5),
    completedAt: new Date(Date.now() - 1000 * 60 * 3),
    duration: '2m 14s',
  },
  {
    id: '2',
    sequenceName: 'Send Text Notification',
    status: 'completed',
    startedAt: new Date(Date.now() - 1000 * 60 * 30),
    completedAt: new Date(Date.now() - 1000 * 60 * 29),
    duration: '45s',
  },
  {
    id: '3',
    sequenceName: 'Create Automation',
    status: 'running',
    startedAt: new Date(Date.now() - 1000 * 60 * 1),
    completedAt: null,
    duration: 'In progress...',
  },
  {
    id: '4',
    sequenceName: 'Data Sync',
    status: 'failed',
    startedAt: new Date(Date.now() - 1000 * 60 * 60),
    completedAt: new Date(Date.now() - 1000 * 60 * 59),
    duration: '1m 02s',
  },
];

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-destructive" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
};

const Executions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Executions</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <p className="text-sm text-muted-foreground mb-6">
            View the history of all webhook executions and their status.
          </p>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Sequence</th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="text-left p-3 text-sm font-medium hidden sm:table-cell">Started</th>
                  <th className="text-left p-3 text-sm font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {demoExecutions.map((execution, index) => (
                  <motion.tr
                    key={execution.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3 text-sm font-medium">{execution.sequenceName}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={execution.status} />
                        <span className="text-sm capitalize">{execution.status}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">
                      {execution.startedAt.toLocaleTimeString()}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{execution.duration}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Executions;
