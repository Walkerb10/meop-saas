import { useState, useEffect } from 'react';
import { ListTodo, CheckCircle2, AlertCircle, ArrowRight, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTeamTasks, TeamTask } from '@/hooks/useTeamTasks';
import { useAuth } from '@/hooks/useAuth';
import { isSameDay, parseISO, isAfter, startOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function ToDoButton() {
  const [open, setOpen] = useState(false);
  const { tasks, updateTask } = useTeamTasks();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get tasks for current user
  const getTasksForUser = (userId: string) => {
    return tasks.filter(t => t.assigned_to === userId);
  };

  // Get today's task for current user
  const getTodayTask = (): TeamTask | null => {
    if (!user) return null;
    const userTasks = getTasksForUser(user.id);
    return userTasks.find(task => {
      if (!task.due_date) return false;
      return isSameDay(parseISO(task.due_date), new Date());
    }) || null;
  };

  // Get next scheduled task
  const getNextTask = (): TeamTask | null => {
    if (!user) return null;
    const userTasks = getTasksForUser(user.id);
    const today = startOfDay(new Date());
    
    return userTasks
      .filter(t => t.due_date && isAfter(parseISO(t.due_date), today) && t.status !== 'completed')
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0] || null;
  };

  // Get task bank count
  const getTaskBankCount = (): number => {
    if (!user) return 0;
    return tasks.filter(t => t.assigned_to === user.id && !t.due_date && t.status !== 'completed').length;
  };

  const todayTask = getTodayTask();
  const nextTask = getNextTask();
  const taskBankCount = getTaskBankCount();
  const hasPendingTask = todayTask && todayTask.status !== 'completed';
  const completedToday = todayTask?.status === 'completed';
  const needsToSetNextTask = !nextTask && taskBankCount === 0 && !hasPendingTask;

  // Should show red badge?
  const showRedBadge = hasPendingTask || needsToSetNextTask;

  const handleCompleteTask = async (task: TeamTask) => {
    await updateTask(task.id, { 
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    // Pull forward next task
    if (nextTask && !(nextTask as any).is_pinned) {
      await updateTask(nextTask.id, {
        due_date: startOfDay(new Date()).toISOString(),
      });
    }
  };

  const handleUncompleteTask = async (task: TeamTask) => {
    await updateTask(task.id, { 
      status: 'pending',
      completed_at: null,
    });
  };

  const goToCalendar = () => {
    setOpen(false);
    navigate('/calendar');
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 relative"
      >
        <ListTodo className="w-4 h-4" />
        <span className="hidden sm:inline">To-Do</span>
        {showRedBadge && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full">
            1
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="w-5 h-5" />
              Your One Thing
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {todayTask ? (
              <div className={cn(
                'p-4 rounded-lg border transition-all',
                todayTask.status === 'completed' 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-orange-500/10 border-orange-500/30'
              )}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={todayTask.status === 'completed'}
                    onCheckedChange={() => 
                      todayTask.status === 'completed'
                        ? handleUncompleteTask(todayTask) 
                        : handleCompleteTask(todayTask)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className={cn(
                      'font-semibold text-lg',
                      todayTask.status === 'completed' && 'line-through text-muted-foreground'
                    )}>
                      {todayTask.title}
                    </p>
                    {todayTask.description && (
                      <p className="text-muted-foreground mt-1 text-sm">{todayTask.description}</p>
                    )}
                  </div>
                </div>
                
                {completedToday && (
                  <div className="mt-4 p-3 rounded-lg bg-green-500/20 text-green-600 dark:text-green-400 text-center">
                    <CheckCircle2 className="h-5 w-5 mx-auto mb-1" />
                    <p className="font-medium text-sm">You completed your one thing!</p>
                    {nextTask && (
                      <p className="text-xs mt-1 flex items-center justify-center gap-1">
                        <ArrowRight className="h-3 w-3" />
                        Next: {nextTask.title}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : needsToSetNextTask ? (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="font-medium text-red-500">Set your next task!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add tasks to your Task Bank to schedule them.
                </p>
                <Button size="sm" className="mt-3" onClick={goToCalendar}>
                  <Plus className="h-4 w-4 mr-1" /> Go to Calendar
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No task set for today</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {nextTask ? `Next: ${nextTask.title}` : 'Click below to add one.'}
                </p>
                <Button size="sm" variant="outline" className="mt-3" onClick={goToCalendar}>
                  Go to Calendar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
