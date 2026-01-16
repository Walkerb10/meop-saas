import { useState, useMemo } from 'react';
import { CheckCircle2, Plus, Calendar, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTeamTasks, TeamTask } from '@/hooks/useTeamTasks';
import { useAuth } from '@/hooks/useAuth';
import { isSameDay, parseISO, isAfter, startOfDay, addDays, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

type Priority = 'high' | 'medium' | 'low';

const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-500/20 text-red-500 border-red-500/50',
  medium: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
  low: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
};

export function ToDoButton() {
  const [open, setOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<'complete' | 'uncomplete' | null>(null);
  const [pullForwardDialog, setPullForwardDialog] = useState<TeamTask | null>(null);
  const { tasks, updateTask, createTask } = useTeamTasks();
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

  // Get task bank sorted by priority
  const getTaskBank = (): TeamTask[] => {
    if (!user) return [];
    return tasks
      .filter(t => t.assigned_to === user.id && !t.due_date && t.status !== 'completed')
      .sort((a, b) => {
        const priorityA = PRIORITY_ORDER[(a.priority || 'medium') as Priority] ?? 1;
        const priorityB = PRIORITY_ORDER[(b.priority || 'medium') as Priority] ?? 1;
        return priorityA - priorityB;
      });
  };

  const todayTask = getTodayTask();
  const nextTask = getNextTask();
  const taskBank = useMemo(() => getTaskBank(), [tasks, user]);
  const hasPendingTask = todayTask && todayTask.status !== 'completed';
  const completedToday = todayTask?.status === 'completed';
  const needsToSetNextTask = !todayTask && !nextTask && taskBank.length === 0;

  // Should show red badge? Show if no task set OR task exists but not completed
  const showRedBadge = !todayTask || todayTask.status !== 'completed';

  const handleConfirmComplete = async () => {
    if (!todayTask) return;
    
    await updateTask(todayTask.id, { 
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    // Pull forward next task
    if (nextTask && !(nextTask as any).is_pinned) {
      await updateTask(nextTask.id, {
        due_date: startOfDay(new Date()).toISOString(),
      });
    }
    
    setConfirmDialog(null);
  };

  const handleConfirmUncomplete = async () => {
    if (!todayTask) return;
    
    // Move any bonus tasks back to tomorrow
    const today = startOfDay(new Date());
    const bonusTasks = tasks.filter(t => 
      t.assigned_to === user?.id && 
      t.due_date && 
      isSameDay(parseISO(t.due_date), today) &&
      t.id !== todayTask.id &&
      t.status !== 'completed'
    );
    
    for (const bonusTask of bonusTasks) {
      await updateTask(bonusTask.id, {
        due_date: addDays(today, 1).toISOString(),
      });
    }
    
    await updateTask(todayTask.id, { 
      status: 'pending',
      completed_at: null,
    });
    
    setConfirmDialog(null);
  };

  const handlePullForward = async () => {
    const taskToPull = pullForwardDialog || nextTask;
    if (taskToPull) {
      await updateTask(taskToPull.id, {
        due_date: startOfDay(new Date()).toISOString(),
      });
      setPullForwardDialog(null);
    }
  };

  const handleAddTask = async () => {
    if (!taskTitle || !user) return;
    
    await createTask({
      title: taskTitle,
      description: taskDescription,
      assigned_to: user.id,
      due_date: startOfDay(new Date()).toISOString(),
      priority: 'medium',
    });

    setTaskTitle('');
    setTaskDescription('');
    setShowAddForm(false);
    setOpen(false);
    navigate('/calendar');
  };

  const handleAssignFromBank = async (task: TeamTask) => {
    await updateTask(task.id, {
      due_date: startOfDay(new Date()).toISOString(),
    });
    setOpen(false);
  };

  const handleButtonClick = () => {
    setOpen(true);
    if (!todayTask) {
      setShowAddForm(true);
    }
  };

  const goToCalendar = () => {
    setOpen(false);
    navigate('/calendar');
  };

  const getPriorityLabel = (priority: string | null) => {
    switch(priority) {
      case 'high': return '🔴 High';
      case 'medium': return '🟡 Medium';
      case 'low': return '🔵 Low';
      default: return '🟡 Medium';
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleButtonClick}
        className="relative border-primary/50"
      >
        To-Do
        {showRedBadge && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full">
            1
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setShowAddForm(false);
          setTaskTitle('');
          setTaskDescription('');
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Your One Thing</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            {todayTask ? (
              <div className="space-y-4">
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
                          ? setConfirmDialog('uncomplete')
                          : setConfirmDialog('complete')
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
                    </div>
                  )}
                  
                  {/* Next task shown when today's is completed */}
                  {completedToday && nextTask && (
                    <div className="flex items-start gap-3 mt-4 p-3 rounded-lg bg-muted/50 border">
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => handlePullForward()}
                        className="mt-0.5"
                      />
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handlePullForward()}
                      >
                        <p className="font-medium text-sm">{nextTask.title}</p>
                        {nextTask.due_date && (
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(nextTask.due_date), 'EEEE, MMM d')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <Button variant="outline" size="sm" onClick={goToCalendar} className="w-full gap-2">
                  <Calendar className="h-4 w-4" />
                  View Calendar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Task Bank Section - Shown First */}
                {taskBank.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <ArrowDown className="h-4 w-4" />
                      Pick from Task Bank
                    </div>
                    <ScrollArea className="max-h-[180px]">
                      <div className="space-y-2 pr-2">
                        {taskBank.map(task => (
                          <div
                            key={task.id}
                            onClick={() => handleAssignFromBank(task)}
                            className={cn(
                              'p-3 rounded-lg border cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all',
                              PRIORITY_COLORS[(task.priority || 'medium') as Priority]
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{task.title}</p>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {getPriorityLabel(task.priority).split(' ')[0]}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="text-center text-xs text-muted-foreground py-2">— or —</div>
                  </div>
                )}

                {/* Add New Task Form */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    {taskBank.length > 0 ? 'Create a new task' : 'Set your one thing for today'}
                  </div>
                  <div>
                    <Label className="sr-only">Title</Label>
                    <Input
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="What's your one thing for today?"
                      autoFocus={taskBank.length === 0}
                    />
                  </div>
                  <div>
                    <Label className="sr-only">Description (optional)</Label>
                    <Textarea
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="Add details..."
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddTask} disabled={!taskTitle} className="flex-1">
                      <Plus className="h-4 w-4 mr-1" />
                      Set Task
                    </Button>
                    <Button variant="outline" onClick={goToCalendar}>
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Complete */}
      <AlertDialog open={confirmDialog === 'complete'} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark "{todayTask?.title}" as your completed One Thing for today?
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
              Mark "{todayTask?.title}" as incomplete? This will affect your streak.
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