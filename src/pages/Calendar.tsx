import { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Check,
  X,
  Clock,
  Trash2,
  CheckSquare,
  ArrowRight,
  AlertCircle,
  Pin,
  Edit,
  ArrowDown,
  Package,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isBefore, isToday, startOfDay, isAfter } from 'date-fns';
import { useTeamTasks, TeamTask } from '@/hooks/useTeamTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// Known team members for direct access
const TEAM_USERS = {
  walker: '090e1598-c9bd-456f-a328-f6eb0d457976',
  griffin: 'dcae3faa-2981-4045-bc30-3cdce7319397',
};

type ViewMode = 'all' | 'walker' | 'griffin';
type Priority = 'low' | 'medium' | 'high';

function getMemberInitials(name: string | null, email: string) {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

type DayStatus = 'done' | 'today' | 'missed' | 'future' | 'empty';

function getDayStatus(task: TeamTask | null, date: Date): DayStatus {
  const today = startOfDay(new Date());
  const dayStart = startOfDay(date);
  
  if (!task) return 'empty';
  
  if (task.status === 'completed') return 'done';
  
  if (isSameDay(dayStart, today)) return 'today';
  
  if (isBefore(dayStart, today)) return 'missed';
  
  return 'future';
}

const STATUS_STYLES: Record<DayStatus, { bg: string; text: string; border: string }> = {
  done: { bg: 'bg-green-500/20', text: 'text-green-500', border: 'border-green-500/50' },
  today: { bg: 'bg-orange-500/20', text: 'text-orange-500', border: 'border-orange-500/50' },
  missed: { bg: 'bg-red-500/20', text: 'text-red-500', border: 'border-red-500/50' },
  future: { bg: 'bg-orange-400/20', text: 'text-orange-400', border: 'border-orange-400/50' },
  empty: { bg: '', text: 'text-muted-foreground', border: 'border-transparent' },
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
  medium: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
  high: 'bg-red-500/20 text-red-500 border-red-500/50',
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [showTaskBankDialog, setShowTaskBankDialog] = useState(false);
  const [editingDayTask, setEditingDayTask] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'taskbank'>('calendar');

  const { tasks, loading, createTask, updateTask, deleteTask, fetchTasks } = useTeamTasks();
  const { members } = useTeamMembers();
  const { user } = useAuth();

  // Determine if current user is Walker or Griffin
  const currentUserKey = user?.id === TEAM_USERS.walker ? 'walker' : user?.id === TEAM_USERS.griffin ? 'griffin' : null;

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium' as Priority,
    is_pinned: false,
  });

  // Get team members for Walker and Griffin
  const teamMembers = useMemo(() => {
    return members.filter(m => m.user_id === TEAM_USERS.walker || m.user_id === TEAM_USERS.griffin);
  }, [members]);

  // Get tasks for a specific user
  const getTasksForUser = (userId: string) => {
    return tasks.filter(t => t.assigned_to === userId);
  };

  // Get today's task for a specific user - also considers completed tasks that might have pulled forward
  const getTodayTask = (userId: string): TeamTask | null => {
    const userTasks = getTasksForUser(userId);
    return userTasks.find(task => {
      if (!task.due_date) return false;
      return isSameDay(parseISO(task.due_date), new Date());
    }) || null;
  };

  // Get the current active task (what should be worked on now)
  const getCurrentTask = (userId: string): TeamTask | null => {
    const todayTask = getTodayTask(userId);
    if (todayTask && todayTask.status !== 'completed') return todayTask;
    
    // If today's task is done, show the next task as current
    if (todayTask?.status === 'completed') {
      return getNextTask(userId);
    }
    
    return null;
  };

  // Get the one task for a specific date and user
  const getTaskForDate = (date: Date, userId: string): TeamTask | null => {
    const userTasks = getTasksForUser(userId);
    return userTasks.find(task => {
      if (!task.due_date) return false;
      return isSameDay(parseISO(task.due_date), date);
    }) || null;
  };

  // Task bank: tasks without due dates (for all users or specific)
  const getTaskBank = (userId?: string) => {
    if (userId) {
      return tasks.filter(t => t.assigned_to === userId && !t.due_date && t.status !== 'completed');
    }
    return tasks.filter(t => !t.due_date && t.status !== 'completed' && 
      (t.assigned_to === TEAM_USERS.walker || t.assigned_to === TEAM_USERS.griffin));
  };

  // Get current user's today task status
  const currentUserTodayTask = user ? getTodayTask(user.id) : null;
  const currentUserActiveTask = user ? getCurrentTask(user.id) : null;
  const hasPendingTodayTask = currentUserTodayTask && currentUserTodayTask.status !== 'completed';
  const completedTodayTask = currentUserTodayTask?.status === 'completed';

  // Get next scheduled task for current user (after completing today's)
  const getNextTask = (userId: string): TeamTask | null => {
    const userTasks = getTasksForUser(userId);
    const today = startOfDay(new Date());
    
    return userTasks
      .filter(t => t.due_date && isAfter(parseISO(t.due_date), today) && t.status !== 'completed')
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0] || null;
  };

  // Get all future tasks sorted by date
  const getFutureTasks = (userId: string): TeamTask[] => {
    const userTasks = getTasksForUser(userId);
    const today = startOfDay(new Date());
    
    return userTasks
      .filter(t => t.due_date && !isBefore(parseISO(t.due_date), today) && t.status !== 'completed')
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  };

  // Check if user needs to set next task
  const taskBank = user ? getTaskBank(user.id) : [];
  const nextTask = user ? getNextTask(user.id) : null;
  const needsToSetNextTask = user && !nextTask && taskBank.length === 0 && !hasPendingTodayTask;

  // Calendar grid generation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  // Handle completing a task - pull forward non-pinned tasks
  const handleCompleteTask = async (task: TeamTask) => {
    await updateTask(task.id, { 
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    // Pull forward: move next day's task to today if it's not pinned
    const futureTasks = getFutureTasks(task.assigned_to!);
    const nextNonPinnedTask = futureTasks.find(t => t.id !== task.id && !(t as any).is_pinned);
    
    if (nextNonPinnedTask) {
      await updateTask(nextNonPinnedTask.id, {
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

  const handleCreateTaskToBank = async () => {
    if (!taskForm.title || !taskForm.assigned_to) return;
    
    await createTask({
      title: taskForm.title,
      description: taskForm.description,
      assigned_to: taskForm.assigned_to,
      priority: taskForm.priority,
    });

    setTaskForm({ title: '', description: '', assigned_to: '', priority: 'medium', is_pinned: false });
    setShowTaskBankDialog(false);
  };

  const handleAssignTaskToDate = async (taskId: string, date: Date, userId?: string) => {
    const updates: Partial<TeamTask> = {
      due_date: startOfDay(date).toISOString(),
    };
    if (userId) {
      updates.assigned_to = userId;
    }
    await updateTask(taskId, updates);
    setShowDayDialog(false);
  };

  const handleCreateAndAssignTask = async (date: Date, userId: string, isPinned: boolean = false) => {
    if (!taskForm.title) return;
    
    await createTask({
      title: taskForm.title,
      description: taskForm.description,
      assigned_to: userId,
      due_date: startOfDay(date).toISOString(),
      priority: taskForm.priority,
    });

    setTaskForm({ title: '', description: '', assigned_to: '', priority: 'medium', is_pinned: false });
    setShowDayDialog(false);
    setEditingDayTask(false);
  };

  // Insert a new task and push all other tasks back by one day (respecting pinned tasks)
  const handleInsertTaskAndShift = async (date: Date, userId: string) => {
    if (!taskForm.title) return;
    
    // Get all future non-pinned tasks for this user starting from this date
    const userTasks = getTasksForUser(userId);
    const tasksToShift = userTasks
      .filter(t => t.due_date && !isBefore(parseISO(t.due_date), startOfDay(date)) && t.status !== 'completed' && !(t as any).is_pinned)
      .sort((a, b) => new Date(b.due_date!).getTime() - new Date(a.due_date!).getTime()); // Sort descending to update from end
    
    // Shift all tasks back by one day
    for (const task of tasksToShift) {
      const currentDate = parseISO(task.due_date!);
      let newDate = addDays(currentDate, 1);
      
      // Skip over any pinned tasks
      let existingPinned = userTasks.find(t => t.due_date && isSameDay(parseISO(t.due_date), newDate) && (t as any).is_pinned);
      while (existingPinned) {
        newDate = addDays(newDate, 1);
        existingPinned = userTasks.find(t => t.due_date && isSameDay(parseISO(t.due_date), newDate) && (t as any).is_pinned);
      }
      
      await updateTask(task.id, { due_date: startOfDay(newDate).toISOString() });
    }
    
    // Create the new task
    await createTask({
      title: taskForm.title,
      description: taskForm.description,
      assigned_to: userId,
      due_date: startOfDay(date).toISOString(),
      priority: taskForm.priority,
    });

    setTaskForm({ title: '', description: '', assigned_to: '', priority: 'medium', is_pinned: false });
    setShowDayDialog(false);
    setEditingDayTask(false);
  };

  const openDayView = (date: Date) => {
    setSelectedDate(date);
    setEditingDayTask(false);
    setShowDayDialog(true);
  };

  // Get visible users based on view mode
  const getVisibleUserIds = (): string[] => {
    if (viewMode === 'walker') return [TEAM_USERS.walker];
    if (viewMode === 'griffin') return [TEAM_USERS.griffin];
    return [TEAM_USERS.walker, TEAM_USERS.griffin];
  };

  const visibleUserIds = getVisibleUserIds();
  const showBothUsers = viewMode === 'all';

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Calendar</h1>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('all')}
            >
              All Team
            </Button>
            {teamMembers.map(member => {
              const key = member.user_id === TEAM_USERS.walker ? 'walker' : 'griffin';
              return (
                <Button
                  key={member.user_id}
                  variant={viewMode === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode(key as ViewMode)}
                  className="gap-2"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">
                      {getMemberInitials(member.display_name, member.email)}
                    </AvatarFallback>
                  </Avatar>
                  {member.display_name?.split(' ')[0] || member.email}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Current Task Display - Above Calendar */}
        {user && viewMode !== 'all' && (
          <Card className="mb-4 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                <CheckSquare className="h-4 w-4" />
                <span>Current Task</span>
                {(hasPendingTodayTask || needsToSetNextTask) && (
                  <Badge variant="destructive" className="ml-auto text-xs">Action Required</Badge>
                )}
              </div>
              
              {currentUserActiveTask ? (
                <div className={cn(
                  'p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                  currentUserActiveTask.status === 'completed' 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-orange-500/10 border-orange-500/30'
                )}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={currentUserActiveTask.status === 'completed'}
                      onCheckedChange={() => 
                        currentUserActiveTask.status === 'completed'
                          ? handleUncompleteTask(currentUserActiveTask) 
                          : handleCompleteTask(currentUserActiveTask)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className={cn(
                        'font-semibold text-lg',
                        currentUserActiveTask.status === 'completed' && 'line-through text-muted-foreground'
                      )}>
                        {currentUserActiveTask.title}
                      </p>
                      {currentUserActiveTask.description && (
                        <p className="text-muted-foreground mt-1">{currentUserActiveTask.description}</p>
                      )}
                    </div>
                    {(currentUserActiveTask as any).is_pinned && (
                      <Pin className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  
                  {currentUserActiveTask.status === 'completed' && completedTodayTask && (
                    <div className="mt-4 p-3 rounded-lg bg-green-500/20 text-green-600 dark:text-green-400 text-center">
                      <Check className="h-5 w-5 mx-auto mb-1" />
                      <p className="font-medium">You completed your one thing for today!</p>
                      {nextTask && (
                        <p className="text-sm mt-1 flex items-center justify-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          Next: {nextTask.title}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : needsToSetNextTask ? (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                  <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                  <p className="font-medium text-red-500">Set your next task!</p>
                  <p className="text-sm text-muted-foreground mt-1">Add tasks to your Task Bank to schedule them.</p>
                  <Button size="sm" className="mt-3" onClick={() => setActiveTab('taskbank')}>
                    <Plus className="h-4 w-4 mr-1" /> Add Task
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No task set for today</p>
                  <p className="text-sm text-muted-foreground mt-1">Click on today in the calendar to assign one.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs: Calendar / Task Bank */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'calendar' | 'taskbank')} className="flex-1 flex flex-col">
          <TabsList className="w-fit mb-4">
            <TabsTrigger value="calendar" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="taskbank" className="gap-2">
              <Package className="h-4 w-4" />
              Task Bank
              {getTaskBank().length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{getTaskBank().length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="flex-1 flex flex-col mt-0">
            {/* Month Navigation */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[160px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Legend - only show for individual views */}
            {viewMode !== 'all' && (
              <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Done</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span>Today/Scheduled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Missed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">—</span>
                  <span>Empty</span>
                </div>
              </div>
            )}

            {/* Calendar Grid */}
            <Card className="flex-1 overflow-hidden">
              <CardContent className="p-4">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDate = isToday(day);

                    // Get statuses for visible users
                    const userStatuses = visibleUserIds.map(userId => {
                      const task = getTaskForDate(day, userId);
                      return { userId, status: getDayStatus(task, day), task };
                    });

                    // Determine overall day appearance - only color for individual views
                    const hasAnyTask = userStatuses.some(u => u.status !== 'empty');
                    const allDone = userStatuses.every(u => u.status === 'done' || u.status === 'empty');
                    const anyMissed = userStatuses.some(u => u.status === 'missed');
                    
                    let bgColor = '';
                    if (!showBothUsers && hasAnyTask) {
                      if (anyMissed) bgColor = STATUS_STYLES.missed.bg;
                      else if (allDone && userStatuses.some(u => u.status === 'done')) bgColor = STATUS_STYLES.done.bg;
                      else bgColor = STATUS_STYLES.future.bg;
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => openDayView(day)}
                        className={cn(
                          'aspect-square flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all relative p-1',
                          !isCurrentMonth && 'opacity-30',
                          isTodayDate && 'ring-2 ring-primary',
                          bgColor,
                          'hover:ring-2 hover:ring-primary/50'
                        )}
                      >
                        <span className={cn(
                          'text-sm font-medium',
                          !isCurrentMonth && 'text-muted-foreground'
                        )}>
                          {format(day, 'd')}
                        </span>
                        
                        {/* Status indicators for each user */}
                        {showBothUsers && isCurrentMonth ? (
                          <div className="flex gap-0.5 mt-0.5">
                            {userStatuses.map(({ userId, status }) => (
                              <span
                                key={userId}
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  status === 'done' && 'bg-green-500',
                                  status === 'missed' && 'bg-red-500',
                                  (status === 'today' || status === 'future') && 'bg-orange-500',
                                  status === 'empty' && 'bg-muted-foreground/30'
                                )}
                              />
                            ))}
                          </div>
                        ) : isCurrentMonth ? (
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full mt-0.5',
                            userStatuses[0]?.status === 'done' && 'bg-green-500',
                            userStatuses[0]?.status === 'missed' && 'bg-red-500',
                            (userStatuses[0]?.status === 'today' || userStatuses[0]?.status === 'future') && 'bg-orange-500',
                            userStatuses[0]?.status === 'empty' && 'bg-transparent'
                          )} />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="taskbank" className="flex-1 mt-0">
            <Card className="h-full">
              <CardHeader className="py-3 flex-row items-center justify-between">
                <CardTitle className="text-base">Task Bank</CardTitle>
                <Button size="sm" onClick={() => setShowTaskBankDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Task
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4 pr-2">
                    {['high', 'medium', 'low'].map((priority) => {
                      const priorityTasks = getTaskBank().filter(t => (t.priority || 'medium') === priority);
                      if (priorityTasks.length === 0) return null;
                      
                      return (
                        <div key={priority}>
                          <p className="text-sm font-medium text-muted-foreground uppercase mb-2 px-1">
                            {priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🔵'} {priority} Priority
                          </p>
                          <div className="space-y-2">
                            {priorityTasks.map(task => {
                              const assignedMember = teamMembers.find(m => m.user_id === task.assigned_to);
                              return (
                                <div
                                  key={task.id}
                                  className={cn(
                                    'p-3 rounded-lg border hover:bg-muted/50 transition-colors',
                                    PRIORITY_COLORS[priority as Priority]
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium">{task.title}</p>
                                      {task.description && (
                                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                                      )}
                                      <div className="flex items-center gap-2 mt-2">
                                        <Avatar className="h-5 w-5">
                                          <AvatarFallback className="text-[10px]">
                                            {assignedMember ? getMemberInitials(assignedMember.display_name, assignedMember.email) : '?'}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-muted-foreground">
                                          {assignedMember?.display_name?.split(' ')[0] || 'Unassigned'}
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 shrink-0"
                                      onClick={() => deleteTask(task.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    
                    {getTaskBank().length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No tasks in bank</p>
                        <p className="text-sm mt-1">Add tasks here to schedule them later</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Day View Dialog */}
      <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, 'EEEE, MMMM d')}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDate && (
            <DayView
              date={selectedDate}
              viewMode={viewMode}
              teamMembers={teamMembers}
              getTaskForDate={getTaskForDate}
              getTaskBank={getTaskBank}
              onComplete={handleCompleteTask}
              onUncomplete={handleUncompleteTask}
              onAssignTask={handleAssignTaskToDate}
              onDelete={deleteTask}
              onCreateAndAssign={handleCreateAndAssignTask}
              onInsertAndShift={handleInsertTaskAndShift}
              taskForm={taskForm}
              setTaskForm={setTaskForm}
              editingDayTask={editingDayTask}
              setEditingDayTask={setEditingDayTask}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add to Task Bank Dialog */}
      <Dialog open={showTaskBankDialog} onOpenChange={setShowTaskBankDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Task Bank</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="What needs to be done?"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Optional details..."
                rows={2}
              />
            </div>
            <div>
              <Label>Assign to</Label>
              <Select value={taskForm.assigned_to} onValueChange={(v) => setTaskForm({ ...taskForm, assigned_to: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v as Priority })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🔵 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateTaskToBank} className="w-full" disabled={!taskForm.title || !taskForm.assigned_to}>
              Add to Bank
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// Day View Component
interface DayViewProps {
  date: Date;
  viewMode: ViewMode;
  teamMembers: { user_id: string; display_name: string | null; email: string }[];
  getTaskForDate: (date: Date, userId: string) => TeamTask | null;
  getTaskBank: (userId?: string) => TeamTask[];
  onComplete: (task: TeamTask) => void;
  onUncomplete: (task: TeamTask) => void;
  onAssignTask: (taskId: string, date: Date, userId?: string) => void;
  onDelete: (taskId: string) => void;
  onCreateAndAssign: (date: Date, userId: string, isPinned?: boolean) => void;
  onInsertAndShift: (date: Date, userId: string) => void;
  taskForm: { title: string; description: string; assigned_to: string; priority: Priority; is_pinned: boolean };
  setTaskForm: (form: { title: string; description: string; assigned_to: string; priority: Priority; is_pinned: boolean }) => void;
  editingDayTask: boolean;
  setEditingDayTask: (editing: boolean) => void;
}

function DayView({ 
  date, 
  viewMode, 
  teamMembers, 
  getTaskForDate, 
  getTaskBank, 
  onComplete, 
  onUncomplete, 
  onAssignTask, 
  onDelete,
  onCreateAndAssign,
  onInsertAndShift,
  taskForm,
  setTaskForm,
  editingDayTask,
  setEditingDayTask,
}: DayViewProps) {
  const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
  const isTodayDate = isToday(date);
  const [showAddForm, setShowAddForm] = useState(false);
  const [insertMode, setInsertMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    viewMode === 'walker' ? TEAM_USERS.walker : 
    viewMode === 'griffin' ? TEAM_USERS.griffin : 
    TEAM_USERS.walker
  );

  const visibleUserIds = viewMode === 'all' 
    ? [TEAM_USERS.walker, TEAM_USERS.griffin] 
    : [viewMode === 'walker' ? TEAM_USERS.walker : TEAM_USERS.griffin];

  return (
    <div className="space-y-4">
      {visibleUserIds.map(userId => {
        const task = getTaskForDate(date, userId);
        const member = teamMembers.find(m => m.user_id === userId);
        const userTaskBank = getTaskBank(userId);
        const isCompleted = task?.status === 'completed';
        const status = getDayStatus(task, date);

        return (
          <div key={userId} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">
                  {member ? getMemberInitials(member.display_name, member.email) : '?'}
                </AvatarFallback>
              </Avatar>
              <span>{member?.display_name?.split(' ')[0] || member?.email}'s One Thing</span>
            </div>

            {task ? (
              <Card className={cn(
                'p-3',
                isCompleted && 'bg-green-500/10 border-green-500/30',
                status === 'missed' && 'bg-red-500/10 border-red-500/30'
              )}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={() => isCompleted ? onUncomplete(task) : onComplete(task)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        'font-semibold',
                        isCompleted && 'line-through text-muted-foreground'
                      )}>
                        {task.title}
                      </p>
                      {(task as any).is_pinned && (
                        <Pin className="h-3 w-3 text-primary" />
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onDelete(task.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                
                {isCompleted && (
                  <div className="mt-3 p-2 rounded-lg bg-green-500/20 text-green-600 dark:text-green-400 text-center text-sm">
                    <Check className="h-4 w-4 mx-auto mb-1" />
                    Completed!
                  </div>
                )}
                
                {status === 'missed' && (
                  <div className="mt-3 p-2 rounded-lg bg-red-500/20 text-red-500 text-center text-sm">
                    <X className="h-4 w-4 mx-auto mb-1" />
                    Missed
                  </div>
                )}
              </Card>
            ) : (
              <div className="space-y-2">
                <div className="text-center py-4 text-muted-foreground border rounded-lg border-dashed">
                  <Clock className="h-6 w-6 mx-auto mb-1 opacity-50" />
                  <p className="text-sm">No task set</p>
                </div>

                {userTaskBank.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Assign from bank:</p>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto">
                      {userTaskBank.slice(0, 3).map(bankTask => (
                        <div
                          key={bankTask.id}
                          className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors text-sm"
                          onClick={() => onAssignTask(bankTask.id, date)}
                        >
                          <Plus className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate">{bankTask.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Quick Add Task */}
      <div className="border-t pt-4">
        {!showAddForm ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setShowAddForm(true); setInsertMode(false); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => { setShowAddForm(true); setInsertMode(true); }}>
              <ArrowDown className="h-4 w-4 mr-1" /> Insert & Shift
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {insertMode ? (
                <>
                  <ArrowDown className="h-4 w-4" />
                  <span>Insert task and push others back</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Add task to this day</span>
                </>
              )}
            </div>
            <Input
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              placeholder="Task title..."
              autoFocus
            />
            <Textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              placeholder="Description (optional)"
              rows={2}
            />
            {viewMode === 'all' && (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign to" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  const userId = viewMode === 'all' ? selectedUserId : visibleUserIds[0];
                  if (insertMode) {
                    onInsertAndShift(date, userId);
                  } else {
                    onCreateAndAssign(date, userId, taskForm.is_pinned);
                  }
                  setShowAddForm(false);
                }}
                disabled={!taskForm.title}
                className="flex-1"
              >
                {insertMode ? 'Insert & Shift' : 'Add Task'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
