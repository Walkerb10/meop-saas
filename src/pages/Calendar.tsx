import { useState, useMemo } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { OneThingDisplay } from '@/components/OneThingDisplay';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Check,
  X,
  Trash2,
  Pin,
  ArrowDown,
  Package,
  Calendar as CalendarIcon,
  CheckCircle2,
  Users,
  Clock,
  Flame,
  Edit2,
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
type CompletedFilter = 'all' | 'walker' | 'griffin';

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

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
  medium: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
  high: 'bg-red-500/20 text-red-500 border-red-500/50',
};

// Helper to format minutes as human-readable time
function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Task Bank Item with date picker
interface TaskBankItemProps {
  task: TeamTask;
  assignedMember?: { user_id: string; display_name: string | null; email: string };
  createdByMember?: { user_id: string; display_name: string | null; email: string };
  priority: Priority;
  onSchedule: (date: Date) => void;
  onDelete: () => void;
}

function TaskBankItem({ task, assignedMember, createdByMember, priority, onSchedule, onDelete }: TaskBankItemProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  return (
    <div
      className={cn(
        'p-3 rounded-lg border hover:bg-muted/50 transition-colors',
        PRIORITY_COLORS[priority]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium">{task.title}</p>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {assignedMember && (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">
                    {getMemberInitials(assignedMember.display_name, assignedMember.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  For: {assignedMember.display_name?.split(' ')[0] || 'Unassigned'}
                </span>
              </>
            )}
            {!assignedMember && (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            )}
            {task.estimated_minutes && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(task.estimated_minutes)}
              </Badge>
            )}
          </div>
          {createdByMember && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Added by {createdByMember.display_name?.split(' ')[0] || createdByMember.email}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={undefined}
                onSelect={(date) => {
                  if (date) {
                    onSchedule(date);
                    setShowDatePicker(false);
                  }
                }}
                disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [showTaskBankDialog, setShowTaskBankDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendars' | 'taskbank' | 'completed'>('calendars');
  const [completedFilter, setCompletedFilter] = useState<CompletedFilter>('all');
  
  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState<{ task: TeamTask; sourceDate: Date } | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

  const { tasks, loading, createTask, updateTask, deleteTask } = useTeamTasks();
  const { members } = useTeamMembers();
  const { user } = useAuth();

  // Determine if current user is Walker or Griffin - default to personal view
  const currentUserKey = user?.id === TEAM_USERS.walker ? 'walker' : user?.id === TEAM_USERS.griffin ? 'griffin' : null;
  const [viewMode, setViewMode] = useState<ViewMode>(currentUserKey || 'walker');

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium' as Priority,
    is_pinned: false,
    estimated_time: '' as string,
    time_unit: 'minutes' as 'minutes' | 'hours',
  });

  // Get team members for Walker and Griffin
  const teamMembers = useMemo(() => {
    return members.filter(m => m.user_id === TEAM_USERS.walker || m.user_id === TEAM_USERS.griffin);
  }, [members]);

  // Get tasks for a specific user
  const getTasksForUser = (userId: string) => {
    return tasks.filter(t => t.assigned_to === userId);
  };

  // Get today's task for a specific user
  const getTodayTask = (userId: string): TeamTask | null => {
    const userTasks = getTasksForUser(userId);
    return userTasks.find(task => {
      if (!task.due_date) return false;
      return isSameDay(parseISO(task.due_date), new Date());
    }) || null;
  };

  // Get the one task for a specific date and user
  const getTaskForDate = (date: Date, userId: string): TeamTask | null => {
    const userTasks = getTasksForUser(userId);
    return userTasks.find(task => {
      if (!task.due_date) return false;
      return isSameDay(parseISO(task.due_date), date);
    }) || null;
  };

  // Task bank: tasks without due dates (show all - anyone can add)
  const getTaskBank = (userId?: string) => {
    if (userId) {
      return tasks.filter(t => t.assigned_to === userId && !t.due_date && t.status !== 'completed');
    }
    // Show all unscheduled tasks (anyone can add to task bank)
    return tasks.filter(t => !t.due_date && t.status !== 'completed');
  };

  // Get completed tasks
  const getCompletedTasks = (filter: CompletedFilter) => {
    const completed = tasks.filter(t => t.status === 'completed');
    if (filter === 'walker') return completed.filter(t => t.assigned_to === TEAM_USERS.walker);
    if (filter === 'griffin') return completed.filter(t => t.assigned_to === TEAM_USERS.griffin);
    return completed;
  };

  // Today's summary card: in "All Team" view show your own; otherwise show the selected calendar owner's One Thing
  const summaryUserId = viewMode === 'walker'
    ? TEAM_USERS.walker
    : viewMode === 'griffin'
      ? TEAM_USERS.griffin
      : (user?.id || TEAM_USERS.walker);

  const summaryMember = teamMembers.find(m => m.user_id === summaryUserId);
  const summaryTodayTask = summaryUserId ? getTodayTask(summaryUserId) : null;

  // Get all future tasks sorted by date
  const getFutureTasks = (userId: string): TeamTask[] => {
    const userTasks = getTasksForUser(userId);
    const today = startOfDay(new Date());
    
    return userTasks
      .filter(t => t.due_date && !isBefore(parseISO(t.due_date), today) && t.status !== 'completed')
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  };

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
    const nextNonPinnedTask = futureTasks.find(t => t.id !== task.id && !t.is_pinned);
    
    if (nextNonPinnedTask) {
      await updateTask(nextNonPinnedTask.id, {
        due_date: startOfDay(new Date()).toISOString(),
      });
    }
  };

  const handleUncompleteTask = async (task: TeamTask) => {
    // When uncompleting, if there's a bonus task on today, move it to tomorrow
    const today = startOfDay(new Date());
    const todaysTasks = tasks.filter(t => 
      t.assigned_to === task.assigned_to && 
      t.due_date && 
      isSameDay(parseISO(t.due_date), today) &&
      t.id !== task.id &&
      t.status !== 'completed'
    );
    
    // Move any bonus tasks back to tomorrow
    for (const bonusTask of todaysTasks) {
      await updateTask(bonusTask.id, {
        due_date: addDays(today, 1).toISOString(),
      });
    }
    
    await updateTask(task.id, { 
      status: 'pending',
      completed_at: null,
    });
  };

  // Handle pulling a future task to today (as bonus task)
  const handlePullForward = async (task: TeamTask) => {
    await updateTask(task.id, {
      due_date: startOfDay(new Date()).toISOString(),
    });
  };

  // Drag and drop handlers
  const handleDragStart = (task: TeamTask, sourceDate: Date) => {
    if (task.is_pinned) return; // Don't allow dragging pinned tasks
    setDraggedTask({ task, sourceDate });
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    setDragOverDate(date);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (targetDate: Date) => {
    if (!draggedTask) return;
    
    const { task } = draggedTask;
    
    // Don't move pinned tasks
    if (task.is_pinned) {
      setDraggedTask(null);
      setDragOverDate(null);
      return;
    }
    
    // Move task to target date
    await updateTask(task.id, {
      due_date: startOfDay(targetDate).toISOString(),
    });
    
    setDraggedTask(null);
    setDragOverDate(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverDate(null);
  };

  const handleCreateTaskToBank = async () => {
    if (!taskForm.title || !taskForm.priority) return;
    
    // Convert time to minutes
    let estimatedMinutes: number | undefined;
    if (taskForm.estimated_time) {
      const value = parseInt(taskForm.estimated_time);
      estimatedMinutes = taskForm.time_unit === 'hours' ? value * 60 : value;
    }
    
    await createTask({
      title: taskForm.title,
      description: taskForm.description,
      assigned_to: taskForm.assigned_to || undefined,
      priority: taskForm.priority,
      estimated_minutes: estimatedMinutes,
    });

    setTaskForm({ title: '', description: '', assigned_to: '', priority: 'medium', is_pinned: false, estimated_time: '', time_unit: 'minutes' });
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

  const handleCreateAndAssignTask = async (date: Date, userId: string, isPinned: boolean = false, title?: string, description?: string, estimatedMinutes?: number) => {
    const taskTitle = title || taskForm.title;
    const taskDescription = description || taskForm.description;
    
    if (!taskTitle) return;
    
    await createTask({
      title: taskTitle,
      description: taskDescription,
      assigned_to: userId,
      due_date: startOfDay(date).toISOString(),
      estimated_minutes: estimatedMinutes,
    });

    setTaskForm({ title: '', description: '', assigned_to: '', priority: 'medium', is_pinned: false, estimated_time: '', time_unit: 'minutes' });
    setShowDayDialog(false);
  };

  // Insert a new task and push all other tasks back by one day (respecting pinned tasks)
  const handleInsertTaskAndShift = async (date: Date, userId: string, title?: string, description?: string, estimatedMinutes?: number) => {
    const taskTitle = title || taskForm.title;
    const taskDescription = description || taskForm.description;
    
    if (!taskTitle) return;
    
    // Get all future non-pinned tasks for this user starting from this date
    const userTasks = getTasksForUser(userId);
    const tasksToShift = userTasks
      .filter(t => t.due_date && !isBefore(parseISO(t.due_date), startOfDay(date)) && t.status !== 'completed' && !t.is_pinned)
      .sort((a, b) => new Date(b.due_date!).getTime() - new Date(a.due_date!).getTime()); // Sort descending to update from end
    
    // Shift all tasks back by one day
    for (const task of tasksToShift) {
      const currentDate = parseISO(task.due_date!);
      let newDate = addDays(currentDate, 1);
      
      // Skip over any pinned tasks
      let existingPinned = userTasks.find(t => t.due_date && isSameDay(parseISO(t.due_date), newDate) && t.is_pinned);
      while (existingPinned) {
        newDate = addDays(newDate, 1);
        existingPinned = userTasks.find(t => t.due_date && isSameDay(parseISO(t.due_date), newDate) && t.is_pinned);
      }
      
      await updateTask(task.id, { due_date: startOfDay(newDate).toISOString() });
    }
    
    // Create the new task
    await createTask({
      title: taskTitle,
      description: taskDescription,
      assigned_to: userId,
      due_date: startOfDay(date).toISOString(),
      estimated_minutes: estimatedMinutes,
    });

    setTaskForm({ title: '', description: '', assigned_to: '', priority: 'medium', is_pinned: false, estimated_time: '', time_unit: 'minutes' });
    setShowDayDialog(false);
  };

  const openDayView = (date: Date) => {
    setSelectedDate(date);
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

  // Calculate streak for the selected user
  const calculateStreak = (userId: string): number => {
    const userTasks = tasks.filter(t => t.assigned_to === userId && t.status === 'completed' && t.due_date);
    if (userTasks.length === 0) return 0;
    
    // Sort by due_date descending
    const sortedTasks = userTasks.sort((a, b) => 
      new Date(b.due_date!).getTime() - new Date(a.due_date!).getTime()
    );
    
    let streak = 0;
    const today = startOfDay(new Date());
    let checkDate = today;
    
    // Check if today's task is completed, or if we should start from yesterday
    const todayTask = sortedTasks.find(t => isSameDay(parseISO(t.due_date!), today));
    if (!todayTask) {
      // No completed task today, start checking from yesterday
      checkDate = addDays(today, -1);
    }
    
    // Count consecutive days with completed tasks going backwards
    while (true) {
      const taskForDay = sortedTasks.find(t => isSameDay(parseISO(t.due_date!), checkDate));
      if (taskForDay) {
        streak++;
        checkDate = addDays(checkDate, -1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const currentStreak = viewMode !== 'all' 
    ? calculateStreak(viewMode === 'walker' ? TEAM_USERS.walker : TEAM_USERS.griffin)
    : 0;

  // Check if the current user is viewing their own calendar
  const isViewingOwnCalendar = summaryUserId === user?.id;

  return (
    <AppLayout>
      <div className="min-h-full flex flex-col p-4 max-w-5xl mx-auto pb-20">
        {/* Header with Streak */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Calendar</h1>
          {viewMode !== 'all' && currentStreak > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-500/20 text-orange-500 px-3 py-1.5 rounded-full">
              <Flame className="h-4 w-4" />
              <span className="font-semibold text-sm">{currentStreak}</span>
            </div>
          )}
        </div>

        {/* Main Tabs: Calendars / Task Bank / Completed */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'calendars' | 'taskbank' | 'completed')} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-3 w-full max-w-md mb-4">
            <TabsTrigger value="calendars" className="text-sm gap-1">
              <CalendarIcon className="h-4 w-4" />
              Calendars
            </TabsTrigger>
            <TabsTrigger value="taskbank" className="text-sm gap-1">
              <Package className="h-4 w-4" />
              Task Bank
              {getTaskBank().length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">{getTaskBank().length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-sm gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </TabsTrigger>
          </TabsList>

          {/* CALENDARS TAB */}
          <TabsContent value="calendars" className="flex-1 flex flex-col mt-0">
            {/* Calendar Type & View Mode */}
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Calendars:</span>
                <Badge variant="outline" className="font-semibold bg-primary/10">One Thing</Badge>
                <Badge variant="outline" className="font-semibold opacity-50 cursor-pointer hover:opacity-100">+ Add</Badge>
              </div>
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {teamMembers.map(member => {
                    const key = member.user_id === TEAM_USERS.walker ? 'walker' : 'griffin';
                    return (
                      <SelectItem key={member.user_id} value={key}>
                        {member.display_name?.split(' ')[0] || member.email}
                      </SelectItem>
                    );
                  })}
                  <SelectItem value="all">All Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Current Task Display - using OneThingDisplay component */}
            <OneThingDisplay
              displayName={summaryMember?.display_name?.split(' ')[0] || 'Your'}
              todayTask={summaryTodayTask}
              allUserTasks={getTasksForUser(summaryUserId)}
              onCompleteTask={handleCompleteTask}
              onUncompleteTask={handleUncompleteTask}
              onPullForward={handlePullForward}
              isCurrentUser={isViewingOwnCalendar}
            />

            {/* Month Navigation - centered */}
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

            {/* Calendar Grid */}
            <div className="flex-1">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days - larger cells with drag and drop */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, idx) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);
                  const isPastDay = isBefore(startOfDay(day), startOfDay(new Date()));
                  const isDragOver = dragOverDate && isSameDay(day, dragOverDate);

                  // Get statuses for visible users
                  const userStatuses = visibleUserIds.map(userId => {
                    const task = getTaskForDate(day, userId);
                    return { userId, status: getDayStatus(task, day), task };
                  });

                  const primaryStatus = userStatuses[0]?.status || 'empty';
                  const dayTask = !showBothUsers ? userStatuses[0]?.task : null;
                  const isPinnedTask = dayTask?.is_pinned;
                  
                  // Color based on status - simplified: past = red, done = green, today = orange, future = yellow
                  let cellBg = 'hover:bg-muted/30';
                  
                  if (!showBothUsers && isCurrentMonth) {
                    if (primaryStatus === 'done') {
                      cellBg = 'bg-green-500/20 hover:bg-green-500/30';
                    } else if (isPastDay) {
                      // All past days are red (missed or no task)
                      cellBg = 'bg-red-500/20 hover:bg-red-500/30';
                    } else if (primaryStatus === 'today') {
                      cellBg = 'bg-orange-500/20 hover:bg-orange-500/30';
                    } else if (primaryStatus === 'future') {
                      cellBg = 'bg-yellow-500/20 hover:bg-yellow-500/30';
                    }
                  }

                  const estimatedTime = dayTask?.estimated_minutes ? formatDuration(dayTask.estimated_minutes) : null;

                  return (
                    <div
                      key={idx}
                      draggable={!!dayTask && !isPinnedTask && !isPastDay}
                      onDragStart={() => dayTask && !isPinnedTask && handleDragStart(dayTask, day)}
                      onDragOver={(e) => isCurrentMonth && handleDragOver(e, day)}
                      onDragLeave={handleDragLeave}
                      onDrop={() => isCurrentMonth && handleDrop(day)}
                      onDragEnd={handleDragEnd}
                      onClick={() => openDayView(day)}
                      className={cn(
                        'aspect-square flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all min-h-[48px] relative',
                        !isCurrentMonth && 'opacity-30',
                        isCurrentMonth && cellBg,
                        isDragOver && 'ring-2 ring-primary ring-offset-2',
                        dayTask && !isPinnedTask && !isPastDay && 'cursor-grab active:cursor-grabbing'
                      )}
                    >
                      <span className={cn(
                        'text-base font-semibold',
                        !isCurrentMonth && 'text-muted-foreground',
                        isTodayDate && 'font-bold'
                      )}>
                        {format(day, 'd')}
                      </span>
                      {/* Today indicator dot */}
                      {isTodayDate && isCurrentMonth && (
                        <div className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-foreground" />
                      )}
                      {/* Pinned indicator */}
                      {isPinnedTask && isCurrentMonth && (
                        <Pin className="absolute top-1 right-1 h-3 w-3 text-primary" />
                      )}
                      {estimatedTime && isCurrentMonth && !isTodayDate && (
                        <span className="text-[9px] text-muted-foreground mt-0.5">{estimatedTime}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Stats at bottom */}
              {viewMode !== 'all' && (
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">
                      {tasks.filter(t => t.assigned_to === visibleUserIds[0] && t.status === 'completed' && t.due_date && isSameMonth(parseISO(t.due_date), currentMonth)).length} completed
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <X className="h-4 w-4 text-red-500" />
                    <span className="text-muted-foreground">
                      {tasks.filter(t => {
                        if (t.assigned_to !== visibleUserIds[0]) return false;
                        if (!t.due_date) return false;
                        const dueDate = parseISO(t.due_date);
                        return isSameMonth(dueDate, currentMonth) && isBefore(dueDate, startOfDay(new Date())) && t.status !== 'completed';
                      }).length} missed
                    </span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TASK BANK TAB */}
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
                              const assignedMember = members.find(m => m.user_id === task.assigned_to);
                              const createdByMember = members.find(m => m.user_id === task.created_by);
                              return (
                                <TaskBankItem
                                  key={task.id}
                                  task={task}
                                  assignedMember={assignedMember}
                                  createdByMember={createdByMember}
                                  priority={priority as Priority}
                                  onSchedule={(date) => handleAssignTaskToDate(task.id, date)}
                                  onDelete={() => deleteTask(task.id)}
                                />
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

          {/* COMPLETED TAB */}
          <TabsContent value="completed" className="flex-1 mt-0">
            <Card className="h-full">
              <CardHeader className="py-3 flex-row items-center justify-between">
                <CardTitle className="text-base">Completed Tasks</CardTitle>
                <Select value={completedFilter} onValueChange={(v) => setCompletedFilter(v as CompletedFilter)}>
                  <SelectTrigger className="w-[130px]">
                    <Users className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">All Team</SelectItem>
                    {teamMembers.map(member => {
                      const key = member.user_id === TEAM_USERS.walker ? 'walker' : 'griffin';
                      return (
                        <SelectItem key={member.user_id} value={key}>
                          {member.display_name?.split(' ')[0] || member.email}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2 pr-2">
                    {getCompletedTasks(completedFilter).length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No completed tasks yet</p>
                      </div>
                    ) : (
                      getCompletedTasks(completedFilter)
                        .sort((a, b) => new Date(b.completed_at || b.updated_at).getTime() - new Date(a.completed_at || a.updated_at).getTime())
                        .map(task => {
                          const assignedMember = teamMembers.find(m => m.user_id === task.assigned_to);
                          return (
                            <div
                              key={task.id}
                              className="p-3 rounded-lg border bg-green-500/10 border-green-500/30"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    <p className="font-medium line-through text-muted-foreground">{task.title}</p>
                                  </div>
                                  {task.description && (
                                    <p className="text-sm text-muted-foreground mt-1 ml-6">{task.description}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2 ml-6">
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-[10px]">
                                        {assignedMember ? getMemberInitials(assignedMember.display_name, assignedMember.email) : '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground">
                                      {assignedMember?.display_name?.split(' ')[0] || 'Unknown'}
                                    </span>
                                    {task.completed_at && (
                                      <span className="text-xs text-muted-foreground">
                                        • {format(parseISO(task.completed_at), 'MMM d, yyyy')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Day View Dialog */}
      <Dialog open={showDayDialog} onOpenChange={(open) => {
        setShowDayDialog(open);
        if (!open) {
          setTaskForm({ title: '', description: '', assigned_to: '', priority: 'medium', is_pinned: false, estimated_time: '', time_unit: 'minutes' });
        }
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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
              onEdit={(task, updates) => updateTask(task.id, updates)}
              onCreateAndAssign={handleCreateAndAssignTask}
              onInsertAndShift={handleInsertTaskAndShift}
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
              <Label>Title <span className="text-destructive">*</span></Label>
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
              <Label>Priority <span className="text-destructive">*</span></Label>
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
            <div>
              <Label>Assign to (optional)</Label>
              <Select value={taskForm.assigned_to} onValueChange={(v) => setTaskForm({ ...taskForm, assigned_to: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
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
              <Label>Estimated time (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={taskForm.estimated_time}
                  onChange={(e) => setTaskForm({ ...taskForm, estimated_time: e.target.value })}
                  placeholder={taskForm.time_unit === 'hours' ? '2' : '30'}
                  className="w-20"
                  min="1"
                />
                <Select 
                  value={taskForm.time_unit} 
                  onValueChange={(v) => setTaskForm({ ...taskForm, time_unit: v as 'minutes' | 'hours' })}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreateTaskToBank} className="w-full" disabled={!taskForm.title || !taskForm.priority}>
              Add to Bank
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// Empty Day Form - separate component to manage its own state
interface EmptyDayFormProps {
  userId: string;
  date: Date;
  onCreateAndAssign: (date: Date, userId: string, isPinned: boolean, title: string, description: string, estimatedMinutes?: number) => void;
  onInsertAndShift: (date: Date, userId: string, title: string, description: string, estimatedMinutes?: number) => void;
  userTaskBank: TeamTask[];
  onAssignTask: (taskId: string, date: Date, userId?: string) => void;
  teamMembers: { user_id: string; display_name: string | null; email: string }[];
  showCalendarSelector?: boolean;
}

function EmptyDayForm({ userId, date, onCreateAndAssign, onInsertAndShift, userTaskBank, onAssignTask, teamMembers, showCalendarSelector = false }: EmptyDayFormProps) {
  const [localTitle, setLocalTitle] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [selectedBankTask, setSelectedBankTask] = useState<TeamTask | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [showTaskBankPopover, setShowTaskBankPopover] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState('');
  const [timeUnit, setTimeUnit] = useState<'minutes' | 'hours'>('minutes');
  const [selectedUserId, setSelectedUserId] = useState(userId);

  const getEstimatedMinutes = (): number | undefined => {
    if (!estimatedTime) return undefined;
    const value = parseInt(estimatedTime);
    if (isNaN(value)) return undefined;
    return timeUnit === 'hours' ? value * 60 : value;
  };

  const handleSave = () => {
    const title = selectedBankTask ? selectedBankTask.title : localTitle;
    const description = selectedBankTask ? (selectedBankTask.description || '') : localDescription;
    if (!title) return;
    
    if (selectedBankTask) {
      // Assign existing task from bank to this date
      onAssignTask(selectedBankTask.id, date, selectedUserId);
    } else {
      onCreateAndAssign(date, selectedUserId, isPinned, title, description, getEstimatedMinutes());
    }
  };

  const handleInsertAndShift = () => {
    const title = selectedBankTask ? selectedBankTask.title : localTitle;
    const description = selectedBankTask ? (selectedBankTask.description || '') : localDescription;
    if (!title) return;
    onInsertAndShift(date, selectedUserId, title, description, getEstimatedMinutes());
  };

  const handleSelectBankTask = (task: TeamTask) => {
    setSelectedBankTask(task);
    setLocalTitle(task.title);
    setLocalDescription(task.description || '');
    // Set estimated time from bank task if available
    if (task.estimated_minutes) {
      if (task.estimated_minutes >= 60 && task.estimated_minutes % 60 === 0) {
        setEstimatedTime(String(task.estimated_minutes / 60));
        setTimeUnit('hours');
      } else {
        setEstimatedTime(String(task.estimated_minutes));
        setTimeUnit('minutes');
      }
    } else {
      setEstimatedTime('');
      setTimeUnit('minutes');
    }
    setShowTaskBankPopover(false);
  };

  const clearSelection = () => {
    setSelectedBankTask(null);
    setLocalTitle('');
    setLocalDescription('');
    setEstimatedTime('');
    setTimeUnit('minutes');
  };

  const hasContent = localTitle.trim() || selectedBankTask;

  return (
    <div className="space-y-3">
      {/* Calendar selector - only show if enabled and multiple members available */}
      {showCalendarSelector && teamMembers.length > 1 && (
        <div>
          <Label className="text-xs">Add to calendar</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue />
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
      )}
      
      {/* Task Bank Button in top right */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Set your One Thing:
        </div>
        <Popover open={showTaskBankPopover} onOpenChange={setShowTaskBankPopover}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Package className="h-3 w-3" />
              Task Bank
              {userTaskBank.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{userTaskBank.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="end">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Select from Task Bank</p>
            {userTaskBank.length > 0 ? (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1">
                  {userTaskBank.map(task => (
                    <button
                      key={task.id}
                      onClick={() => handleSelectBankTask(task)}
                      className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <p className="font-medium text-sm">{task.title}</p>
                      <div className="flex items-center gap-2">
                        {task.description && (
                          <p className="text-xs text-muted-foreground truncate flex-1">{task.description}</p>
                        )}
                        {task.estimated_minutes && (
                          <Badge variant="outline" className="text-[9px] shrink-0">
                            {formatDuration(task.estimated_minutes)}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-xs">
                <Package className="h-6 w-6 mx-auto mb-2 opacity-30" />
                <p>No tasks in bank</p>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {selectedBankTask && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/30">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium flex-1">From Task Bank</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearSelection}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div>
        <Label className="text-xs">Title <span className="text-destructive">*</span></Label>
        <Input
          value={localTitle}
          onChange={(e) => { setLocalTitle(e.target.value); setSelectedBankTask(null); }}
          placeholder="What needs to be done?"
        />
      </div>
      <div>
        <Label className="text-xs">Description (optional)</Label>
        <Textarea
          value={localDescription}
          onChange={(e) => { setLocalDescription(e.target.value); setSelectedBankTask(null); }}
          placeholder="Add details..."
          rows={2}
        />
      </div>
      
      {/* Estimated Time - same as Task Bank form */}
      <div>
        <Label className="text-xs">Estimated time (optional)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            placeholder={timeUnit === 'hours' ? '2' : '30'}
            className="w-20"
            min="1"
          />
          <Select 
            value={timeUnit} 
            onValueChange={(v) => setTimeUnit(v as 'minutes' | 'hours')}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button 
          onClick={handleSave}
          disabled={!hasContent}
          className="flex-1"
        >
          {selectedBankTask ? 'Assign' : 'Save'}
        </Button>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button 
          variant="outline"
          onClick={handleInsertAndShift}
          disabled={!hasContent}
          className="flex-1 text-xs"
        >
          <ArrowDown className="h-3 w-3 mr-1" /> Insert & Shift
        </Button>
        <Button 
          variant={isPinned ? "default" : "outline"}
          onClick={() => setIsPinned(!isPinned)}
          className="text-xs"
          size="icon"
        >
          <Pin className={cn("h-4 w-4", isPinned && "text-primary-foreground")} />
        </Button>
      </div>
      {isPinned && (
        <p className="text-xs text-muted-foreground">📌 Task will be pinned to this date</p>
      )}
    </div>
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
  onEdit: (task: TeamTask, updates: Partial<TeamTask>) => void;
  onCreateAndAssign: (date: Date, userId: string, isPinned: boolean, title?: string, description?: string, estimatedMinutes?: number) => void;
  onInsertAndShift: (date: Date, userId: string, title?: string, description?: string, estimatedMinutes?: number) => void;
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
  onEdit,
  onCreateAndAssign,
  onInsertAndShift,
}: DayViewProps) {
  const [editingTask, setEditingTask] = useState<TeamTask | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', estimated_time: '', time_unit: 'minutes' as 'minutes' | 'hours' });
  
  const visibleUserIds = viewMode === 'all' 
    ? [TEAM_USERS.walker, TEAM_USERS.griffin] 
    : [viewMode === 'walker' ? TEAM_USERS.walker : TEAM_USERS.griffin];

  const showUserName = viewMode === 'all';

  const handleStartEdit = (task: TeamTask) => {
    setEditingTask(task);
    let estimatedTime = '';
    let timeUnit: 'minutes' | 'hours' = 'minutes';
    if (task.estimated_minutes) {
      if (task.estimated_minutes >= 60 && task.estimated_minutes % 60 === 0) {
        estimatedTime = String(task.estimated_minutes / 60);
        timeUnit = 'hours';
      } else {
        estimatedTime = String(task.estimated_minutes);
        timeUnit = 'minutes';
      }
    }
    setEditForm({
      title: task.title,
      description: task.description || '',
      estimated_time: estimatedTime,
      time_unit: timeUnit,
    });
  };

  const handleSaveEdit = () => {
    if (!editingTask || !editForm.title) return;
    
    let estimatedMinutes: number | undefined;
    if (editForm.estimated_time) {
      const value = parseInt(editForm.estimated_time);
      if (!isNaN(value)) {
        estimatedMinutes = editForm.time_unit === 'hours' ? value * 60 : value;
      }
    }
    
    onEdit(editingTask, {
      title: editForm.title,
      description: editForm.description || undefined,
      estimated_minutes: estimatedMinutes,
    });
    
    setEditingTask(null);
    setEditForm({ title: '', description: '', estimated_time: '', time_unit: 'minutes' });
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditForm({ title: '', description: '', estimated_time: '', time_unit: 'minutes' });
  };

  return (
    <div className="space-y-4">
      {visibleUserIds.map(userId => {
        const task = getTaskForDate(date, userId);
        const member = teamMembers.find(m => m.user_id === userId);
        const allTaskBank = getTaskBank();
        const isCompleted = task?.status === 'completed';
        const status = getDayStatus(task, date);
        const isEditing = editingTask?.id === task?.id;

        return (
          <div key={userId} className="space-y-3">
            {showUserName && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">
                    {member ? getMemberInitials(member.display_name, member.email) : '?'}
                  </AvatarFallback>
                </Avatar>
                <span>{member?.display_name?.split(' ')[0] || member?.email}'s One Thing</span>
              </div>
            )}

            {task ? (
              isEditing ? (
                <Card className="p-3">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Title *</Label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="Task title"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Optional description"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Estimated time</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editForm.estimated_time}
                          onChange={(e) => setEditForm({ ...editForm, estimated_time: e.target.value })}
                          placeholder={editForm.time_unit === 'hours' ? '2' : '30'}
                          className="w-20"
                          min="1"
                        />
                        <Select 
                          value={editForm.time_unit} 
                          onValueChange={(v) => setEditForm({ ...editForm, time_unit: v as 'minutes' | 'hours' })}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Minutes</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEdit} disabled={!editForm.title} className="flex-1">
                        Save
                      </Button>
                      <Button variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
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
                        {task.is_pinned && (
                          <Pin className="h-3 w-3 text-primary" />
                        )}
                        {task.estimated_minutes && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(task.estimated_minutes)}
                          </Badge>
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
                        onClick={() => handleStartEdit(task)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
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
              )
            ) : (
              <EmptyDayForm 
                userId={userId}
                date={date}
                onCreateAndAssign={onCreateAndAssign}
                onInsertAndShift={onInsertAndShift}
                userTaskBank={allTaskBank}
                onAssignTask={onAssignTask}
                teamMembers={teamMembers}
                showCalendarSelector={!showUserName}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
