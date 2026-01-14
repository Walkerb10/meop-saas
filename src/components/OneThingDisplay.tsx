import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isSameDay, startOfDay, addDays } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  estimated_minutes: number | null;
  is_pinned?: boolean;
}

interface OneThingDisplayProps {
  displayName: string;
  todayTask: Task | null;
  allUserTasks: Task[];
  onCompleteTask: (task: Task) => Promise<void>;
  onUncompleteTask: (task: Task) => Promise<void>;
  onPullForward: (task: Task) => Promise<void>;
  isCurrentUser: boolean;
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function OneThingDisplay({
  displayName,
  todayTask,
  allUserTasks,
  onCompleteTask,
  onUncompleteTask,
  onPullForward,
  isCurrentUser,
}: OneThingDisplayProps) {
  const [confirmDialog, setConfirmDialog] = useState<'complete' | 'uncomplete' | null>(null);
  const [pullForwardDialog, setPullForwardDialog] = useState<Task | null>(null);

  // Get the next scheduled task (tomorrow or later)
  const nextTask = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    
    return allUserTasks
      .filter(t => {
        if (!t.due_date || t.status === 'completed') return false;
        const dueDate = parseISO(t.due_date);
        // Task scheduled for tomorrow or later
        return dueDate >= tomorrow;
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0] || null;
  }, [allUserTasks]);

  // Check if today's original One Thing was completed (for streak tracking)
  const isTodayOriginalCompleted = todayTask?.status === 'completed';

  // Get any bonus task that was pulled to today after completing the original
  const bonusTask = useMemo(() => {
    if (!isTodayOriginalCompleted) return null;
    
    const today = startOfDay(new Date());
    // Find another incomplete task due today that isn't the original
    return allUserTasks.find(t => {
      if (!t.due_date || t.status === 'completed') return false;
      if (t.id === todayTask?.id) return false;
      return isSameDay(parseISO(t.due_date), today);
    }) || null;
  }, [allUserTasks, isTodayOriginalCompleted, todayTask]);

  const handleCheckChange = () => {
    if (!isCurrentUser) return;
    
    if (todayTask?.status === 'completed') {
      setConfirmDialog('uncomplete');
    } else {
      setConfirmDialog('complete');
    }
  };

  const handleBonusCheckChange = () => {
    if (!isCurrentUser || !bonusTask) return;
    setConfirmDialog('complete');
  };

  const handleConfirmComplete = async () => {
    if (todayTask && todayTask.status !== 'completed') {
      await onCompleteTask(todayTask);
    } else if (bonusTask) {
      await onCompleteTask(bonusTask);
    }
    setConfirmDialog(null);
  };

  const handleConfirmUncomplete = async () => {
    if (todayTask) {
      await onUncompleteTask(todayTask);
    }
    setConfirmDialog(null);
  };

  const handlePullForward = async () => {
    if (pullForwardDialog) {
      await onPullForward(pullForwardDialog);
      setPullForwardDialog(null);
    }
  };

  // If no task for today
  if (!todayTask) {
    return (
      <div className="mb-4 p-4 rounded-xl bg-muted/30">
        <div className="text-center py-2">
          <p className="text-muted-foreground">No task set for today</p>
          {nextTask && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">Next up:</p>
              <Button
                variant="ghost"
                className="w-full justify-between text-left h-auto py-2"
                onClick={() => isCurrentUser && setPullForwardDialog(nextTask)}
                disabled={!isCurrentUser}
              >
                <div>
                  <p className="font-medium text-sm">{nextTask.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {nextTask.due_date && format(parseISO(nextTask.due_date), 'MMM d')}
                  </p>
                </div>
                {isCurrentUser && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 p-4 rounded-xl bg-muted/30">
        {/* Main One Thing */}
        <div className="flex items-start gap-3">
          <Checkbox 
            checked={todayTask.status === 'completed'}
            onCheckedChange={handleCheckChange}
            disabled={!isCurrentUser}
            className="mt-1 h-5 w-5"
          />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">
              {displayName}'s One Thing
            </p>
            <p className={cn(
              "font-semibold text-lg",
              todayTask.status === 'completed' && "line-through text-muted-foreground"
            )}>
              {todayTask.title}
            </p>
            {todayTask.description && (
              <p className="text-sm text-muted-foreground mt-1">{todayTask.description}</p>
            )}
            {todayTask.estimated_minutes && (
              <Badge variant="outline" className="mt-2 text-xs gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(todayTask.estimated_minutes)}
              </Badge>
            )}
          </div>
          {todayTask.status === 'completed' && (
            <Check className="h-5 w-5 text-green-500 shrink-0" />
          )}
        </div>

        {/* Bonus task (pulled forward after completing One Thing) */}
        {isTodayOriginalCompleted && bonusTask && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-start gap-3">
              <Checkbox 
                checked={false}
                onCheckedChange={handleBonusCheckChange}
                disabled={!isCurrentUser}
                className="mt-1 h-5 w-5"
              />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">
                  Bonus Task
                </p>
                <p className="font-medium">{bonusTask.title}</p>
                {bonusTask.description && (
                  <p className="text-sm text-muted-foreground mt-1">{bonusTask.description}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Next task preview (when today's task is done and no bonus task) */}
        {isTodayOriginalCompleted && !bonusTask && nextTask && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Next up:</p>
            <Button
              variant="ghost"
              className="w-full justify-between text-left h-auto py-2 px-3 -mx-3"
              onClick={() => isCurrentUser && setPullForwardDialog(nextTask)}
              disabled={!isCurrentUser}
            >
              <div>
                <p className="font-medium text-sm">{nextTask.title}</p>
                <p className="text-xs text-muted-foreground">
                  {nextTask.due_date && format(parseISO(nextTask.due_date), 'EEEE, MMM d')}
                </p>
              </div>
              {isCurrentUser && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Complete */}
      <AlertDialog open={confirmDialog === 'complete'} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              {bonusTask 
                ? `Mark "${bonusTask.title}" as completed?`
                : `Mark "${todayTask.title}" as your completed One Thing for today?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmComplete}>
              Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Uncomplete */}
      <AlertDialog open={confirmDialog === 'uncomplete'} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo completion?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark "{todayTask.title}" as incomplete? This will affect your streak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUncomplete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Undo Completion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pull Forward Confirmation Dialog */}
      <AlertDialog open={!!pullForwardDialog} onOpenChange={() => setPullForwardDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pull this task forward?</AlertDialogTitle>
            <AlertDialogDescription>
              Move "{pullForwardDialog?.title}" to today? If you don't complete it, it will move back to tomorrow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePullForward}>
              Pull Forward
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
