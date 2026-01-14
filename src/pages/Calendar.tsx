import { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Check,
  X,
  Clock,
  Pin,
  Trash2,
  GripVertical
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isBefore, isToday, startOfDay } from 'date-fns';
import { useTeamTasks, TeamTask } from '@/hooks/useTeamTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// Known team members for direct access
const TEAM_USERS = {
  walker: '090e1598-c9bd-456f-a328-f6eb0d457976',
  griffin: 'dcae3faa-2981-4045-bc30-3cdce7319397',
};

function getMemberInitials(name: string | null, email: string) {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

type DayStatus = 'done' | 'today' | 'missed' | 'future' | 'pinned' | 'empty';

function getDayStatus(task: TeamTask | null, date: Date): DayStatus {
  const today = startOfDay(new Date());
  const dayStart = startOfDay(date);
  
  if (!task) return 'empty';
  
  if (task.status === 'completed') return 'done';
  
  if (isSameDay(dayStart, today)) return 'today';
  
  if (isBefore(dayStart, today)) return 'missed';
  
  return 'future';
}

const STATUS_STYLES: Record<DayStatus, { bg: string; text: string; ring: string }> = {
  done: { bg: 'bg-green-500/20', text: 'text-green-500', ring: 'ring-green-500' },
  today: { bg: 'bg-orange-500/20', text: 'text-orange-500', ring: 'ring-orange-500' },
  missed: { bg: 'bg-red-500/20', text: 'text-red-500', ring: 'ring-red-500' },
  future: { bg: 'bg-orange-400/20', text: 'text-orange-400', ring: 'ring-orange-400' },
  pinned: { bg: 'bg-muted', text: 'text-muted-foreground', ring: 'ring-muted-foreground' },
  empty: { bg: '', text: 'text-muted-foreground', ring: '' },
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'my-one-thing' | 'tasks' | 'task-bank'>('my-one-thing');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showTaskBankDialog, setShowTaskBankDialog] = useState(false);

  const { tasks, loading, createTask, updateTask, deleteTask, fetchTasks } = useTeamTasks();
  const { members } = useTeamMembers();
  const { user } = useAuth();

  // Set default viewing user to current user
  useEffect(() => {
    if (user && !viewingUserId) {
      setViewingUserId(user.id);
    }
  }, [user, viewingUserId]);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
  });

  // Filter tasks for the currently viewed user
  const userTasks = useMemo(() => {
    if (!viewingUserId) return [];
    return tasks.filter(t => t.assigned_to === viewingUserId);
  }, [tasks, viewingUserId]);

  // Get the one task for a specific date (for the viewed user)
  const getTaskForDate = (date: Date): TeamTask | null => {
    return userTasks.find(task => {
      if (!task.due_date) return false;
      return isSameDay(parseISO(task.due_date), date);
    }) || null;
  };

  // Task bank: tasks without due dates assigned to viewed user
  const taskBank = useMemo(() => {
    if (!viewingUserId) return [];
    return tasks.filter(t => t.assigned_to === viewingUserId && !t.due_date && t.status !== 'completed');
  }, [tasks, viewingUserId]);

  // All incomplete tasks for viewed user (for Tasks tab)
  const incompleteTasks = useMemo(() => {
    return userTasks.filter(t => t.status !== 'completed').sort((a, b) => {
      if (!a.due_date && b.due_date) return 1;
      if (a.due_date && !b.due_date) return -1;
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return 0;
    });
  }, [userTasks]);

  // Stats
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    let completed = 0;
    let missed = 0;
    
    userTasks.forEach(task => {
      if (!task.due_date) return;
      const dueDate = startOfDay(parseISO(task.due_date));
      
      if (task.status === 'completed') {
        completed++;
      } else if (isBefore(dueDate, today)) {
        missed++;
      }
    });
    
    return { completed, missed };
  }, [userTasks]);

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

  const handleCompleteTask = async (task: TeamTask) => {
    await updateTask(task.id, { 
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  };

  const handleUncompleteTask = async (task: TeamTask) => {
    await updateTask(task.id, { 
      status: 'pending',
      completed_at: null,
    });
  };

  const handleCreateTask = async () => {
    if (!taskForm.title) return;
    
    await createTask({
      title: taskForm.title,
      description: taskForm.description,
      assigned_to: taskForm.assigned_to || undefined,
      due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : undefined,
      priority: 'medium',
    });

    setTaskForm({ title: '', description: '', assigned_to: '', due_date: '' });
    setShowAddTaskDialog(false);
    setShowTaskBankDialog(false);
  };

  const handleAssignTaskToDate = async (taskId: string, date: Date) => {
    await updateTask(taskId, {
      due_date: startOfDay(date).toISOString(),
    });
    setShowDayDialog(false);
  };

  const openDayView = (date: Date) => {
    setSelectedDate(date);
    setShowDayDialog(true);
  };

  const currentViewingMember = members.find(m => m.user_id === viewingUserId);
  const isViewingOwnCalendar = viewingUserId === user?.id;

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Calendar</h1>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="my-one-thing" className="flex-1">My One Thing</TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1">Tasks</TabsTrigger>
            <TabsTrigger value="task-bank" className="flex-1">Task Bank</TabsTrigger>
          </TabsList>

          <TabsContent value="my-one-thing" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
            {/* User Switcher */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Viewing:</span>
              <div className="flex gap-1">
                {members.filter(m => m.user_id === TEAM_USERS.walker || m.user_id === TEAM_USERS.griffin).map(member => (
                  <Button
                    key={member.user_id}
                    variant={viewingUserId === member.user_id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewingUserId(member.user_id)}
                    className="gap-2"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">
                        {getMemberInitials(member.display_name, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    {member.display_name?.split(' ')[0] || member.email}
                  </Button>
                ))}
              </div>
            </div>

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

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Done</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>Today (Set)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Missed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-400" />
                <span>Future (Set)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Pin className="h-3 w-3 text-muted-foreground" />
                <span>Pinned</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>Empty</span>
              </div>
            </div>

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
                    const task = getTaskForDate(day);
                    const status = getDayStatus(task, day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDate = isToday(day);
                    const styles = STATUS_STYLES[status];

                    return (
                      <div
                        key={idx}
                        onClick={() => openDayView(day)}
                        className={cn(
                          'aspect-square flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all relative',
                          !isCurrentMonth && 'opacity-30',
                          isTodayDate && 'ring-2 ring-primary',
                          status !== 'empty' && styles.bg,
                          'hover:ring-2 hover:ring-primary/50'
                        )}
                      >
                        <span className={cn(
                          'text-sm font-medium',
                          status !== 'empty' && styles.text,
                          !isCurrentMonth && 'text-muted-foreground'
                        )}>
                          {format(day, 'd')}
                        </span>
                        
                        {/* Status indicator */}
                        {status === 'done' && (
                          <Check className="h-3 w-3 text-green-500 absolute bottom-1" />
                        )}
                        {status === 'missed' && (
                          <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                        {(status === 'today' || status === 'future') && (
                          <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-orange-500" />
                        )}
                        {status === 'empty' && isCurrentMonth && (
                          <span className="absolute bottom-1 text-[8px] text-muted-foreground">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>{stats.completed} completed</span>
              </div>
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-500" />
                <span>{stats.missed} missed</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
            {/* User Switcher */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Viewing:</span>
                <Select value={viewingUserId || ''} onValueChange={setViewingUserId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.filter(m => m.user_id === TEAM_USERS.walker || m.user_id === TEAM_USERS.griffin).map(m => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.display_name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={() => setShowAddTaskDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            </div>

            <Card className="flex-1">
              <CardContent className="p-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {incompleteTasks.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No tasks yet</p>
                    ) : (
                      incompleteTasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={task.status === 'completed'}
                            onCheckedChange={() => 
                              task.status === 'completed' 
                                ? handleUncompleteTask(task) 
                                : handleCompleteTask(task)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'font-medium',
                              task.status === 'completed' && 'line-through text-muted-foreground'
                            )}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                            )}
                            {task.due_date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Due: {format(parseISO(task.due_date), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="task-bank" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
            {/* User Switcher */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Viewing:</span>
                <Select value={viewingUserId || ''} onValueChange={setViewingUserId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.filter(m => m.user_id === TEAM_USERS.walker || m.user_id === TEAM_USERS.griffin).map(m => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.display_name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={() => setShowTaskBankDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add to Bank
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Tasks in the bank are waiting to be scheduled. Click a day in the calendar to assign a task.
            </p>

            <Card className="flex-1">
              <CardContent className="p-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {taskBank.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No tasks in the bank</p>
                    ) : (
                      taskBank.map(task => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5 cursor-grab" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{task.title}</p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, 'EEEE, MMMM d')}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDate && (
            <DayView
              date={selectedDate}
              task={getTaskForDate(selectedDate)}
              taskBank={taskBank}
              viewingMember={currentViewingMember}
              onComplete={handleCompleteTask}
              onUncomplete={handleUncompleteTask}
              onAssignTask={handleAssignTaskToDate}
              onDelete={deleteTask}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
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
              <Select value={taskForm.assigned_to || viewingUserId || ''} onValueChange={(v) => setTaskForm({ ...taskForm, assigned_to: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {members.filter(m => m.user_id === TEAM_USERS.walker || m.user_id === TEAM_USERS.griffin).map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due date (optional)</Label>
              <Input
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
              />
            </div>
            <Button onClick={handleCreateTask} className="w-full">
              Create Task
            </Button>
          </div>
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
              <Select value={taskForm.assigned_to || viewingUserId || ''} onValueChange={(v) => setTaskForm({ ...taskForm, assigned_to: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {members.filter(m => m.user_id === TEAM_USERS.walker || m.user_id === TEAM_USERS.griffin).map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateTask} className="w-full">
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
  task: TeamTask | null;
  taskBank: TeamTask[];
  viewingMember: { display_name: string | null; email: string } | undefined;
  onComplete: (task: TeamTask) => void;
  onUncomplete: (task: TeamTask) => void;
  onAssignTask: (taskId: string, date: Date) => void;
  onDelete: (taskId: string) => void;
}

function DayView({ date, task, taskBank, viewingMember, onComplete, onUncomplete, onAssignTask, onDelete }: DayViewProps) {
  const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
  const isTodayDate = isToday(date);
  
  if (task) {
    const isCompleted = task.status === 'completed';
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px]">
              {viewingMember ? getMemberInitials(viewingMember.display_name, viewingMember.email) : '?'}
            </AvatarFallback>
          </Avatar>
          <span>{viewingMember?.display_name || viewingMember?.email}'s One Thing</span>
        </div>

        <Card className={cn(
          'p-4',
          isCompleted && 'bg-green-500/10 border-green-500/30'
        )}>
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={() => isCompleted ? onUncomplete(task) : onComplete(task)}
              className="mt-1"
            />
            <div className="flex-1">
              <p className={cn(
                'font-semibold text-lg',
                isCompleted && 'line-through text-muted-foreground'
              )}>
                {task.title}
              </p>
              {task.description && (
                <p className="text-muted-foreground mt-1">{task.description}</p>
              )}
            </div>
          </div>
          
          {isCompleted && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/20 text-green-600 dark:text-green-400 text-center">
              <Check className="h-5 w-5 mx-auto mb-1" />
              <p className="font-medium">You completed your one thing for today!</p>
            </div>
          )}
        </Card>

        {!isCompleted && isTodayDate && (
          <p className="text-sm text-muted-foreground text-center">
            Focus on this one task. Complete it before moving on.
          </p>
        )}

        {!isCompleted && isPast && !isTodayDate && (
          <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-center text-sm">
            This task was missed. Mark it complete or reschedule it.
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onDelete(task.id)}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Remove
          </Button>
        </div>
      </div>
    );
  }

  // No task assigned for this day
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-[10px]">
            {viewingMember ? getMemberInitials(viewingMember.display_name, viewingMember.email) : '?'}
          </AvatarFallback>
        </Avatar>
        <span>{viewingMember?.display_name || viewingMember?.email}'s One Thing</span>
      </div>

      <div className="text-center py-6 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No task set for this day</p>
      </div>

      {taskBank.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Assign from Task Bank:</p>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {taskBank.map(bankTask => (
              <div
                key={bankTask.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onAssignTask(bankTask.id, date)}
              >
                <Plus className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{bankTask.title}</p>
                  {bankTask.description && (
                    <p className="text-sm text-muted-foreground truncate">{bankTask.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {taskBank.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Add tasks to the Task Bank to assign them to days.
        </p>
      )}
    </div>
  );
}
