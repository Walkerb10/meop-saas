import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Users,
  CheckSquare,
  Trash2,
  Edit
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTeamTasks, TeamTask } from '@/hooks/useTeamTasks';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const EVENT_COLORS = [
  { value: 'primary', label: 'Blue', class: 'bg-primary' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  urgent: 'bg-red-500/20 text-red-400',
};

function getColorClass(color: string) {
  return EVENT_COLORS.find(c => c.value === color)?.class || 'bg-primary';
}

function getMemberInitials(name: string | null, email: string) {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewFilter, setViewFilter] = useState<'all' | 'mine' | 'team'>('all');
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingTask, setEditingTask] = useState<TeamTask | null>(null);

  const { events, loading: eventsLoading, createEvent, updateEvent, deleteEvent } = useCalendarEvents();
  const { tasks, loading: tasksLoading, createTask, updateTask, deleteTask } = useTeamTasks();
  const { members } = useTeamMembers();
  const { user } = useAuth();

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    all_day: false,
    color: 'primary',
    assigned_to: '',
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: '',
  });

  // Filter events based on view
  const filteredEvents = useMemo(() => {
    if (viewFilter === 'all') return events;
    if (viewFilter === 'mine') return events.filter(e => e.assigned_to === user?.id || e.created_by === user?.id);
    return events.filter(e => e.assigned_to !== user?.id && e.created_by !== user?.id);
  }, [events, viewFilter, user]);

  // Filter tasks based on view
  const filteredTasks = useMemo(() => {
    if (viewFilter === 'all') return tasks;
    if (viewFilter === 'mine') return tasks.filter(t => t.assigned_to === user?.id || t.created_by === user?.id);
    return tasks.filter(t => t.assigned_to !== user?.id && t.created_by !== user?.id);
  }, [tasks, viewFilter, user]);

  // Get events and tasks for a specific date
  const getItemsForDate = (date: Date) => {
    const dayEvents = filteredEvents.filter(event => {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, date);
    });
    const dayTasks = filteredTasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = parseISO(task.due_date);
      return isSameDay(taskDate, date);
    });
    return { events: dayEvents, tasks: dayTasks };
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

  const handleCreateEvent = async () => {
    if (!eventForm.title || !eventForm.start_time) return;
    
    await createEvent({
      title: eventForm.title,
      description: eventForm.description,
      start_time: new Date(eventForm.start_time).toISOString(),
      end_time: eventForm.end_time ? new Date(eventForm.end_time).toISOString() : undefined,
      all_day: eventForm.all_day,
      color: eventForm.color,
      assigned_to: eventForm.assigned_to || undefined,
    });

    setEventForm({ title: '', description: '', start_time: '', end_time: '', all_day: false, color: 'primary', assigned_to: '' });
    setShowEventDialog(false);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !eventForm.title) return;
    
    await updateEvent(editingEvent.id, {
      title: eventForm.title,
      description: eventForm.description,
      start_time: new Date(eventForm.start_time).toISOString(),
      end_time: eventForm.end_time ? new Date(eventForm.end_time).toISOString() : null,
      all_day: eventForm.all_day,
      color: eventForm.color,
      assigned_to: eventForm.assigned_to || null,
    });

    setEditingEvent(null);
    setEventForm({ title: '', description: '', start_time: '', end_time: '', all_day: false, color: 'primary', assigned_to: '' });
  };

  const handleCreateTask = async () => {
    if (!taskForm.title) return;
    
    await createTask({
      title: taskForm.title,
      description: taskForm.description,
      assigned_to: taskForm.assigned_to || undefined,
      priority: taskForm.priority,
      due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : undefined,
    });

    setTaskForm({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
    setShowTaskDialog(false);
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !taskForm.title) return;
    
    await updateTask(editingTask.id, {
      title: taskForm.title,
      description: taskForm.description,
      assigned_to: taskForm.assigned_to || null,
      priority: taskForm.priority as TeamTask['priority'],
      due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : null,
    });

    setEditingTask(null);
    setTaskForm({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
  };

  const handleToggleTaskStatus = async (task: TeamTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await updateTask(task.id, { 
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    });
  };

  const openDayView = (date: Date) => {
    setSelectedDate(date);
    setShowDayDialog(true);
  };

  const openEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      start_time: event.start_time.slice(0, 16),
      end_time: event.end_time?.slice(0, 16) || '',
      all_day: event.all_day,
      color: event.color,
      assigned_to: event.assigned_to || '',
    });
  };

  const openEditTask = (task: TeamTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      priority: task.priority,
      due_date: task.due_date?.slice(0, 16) || '',
    });
  };

  const getMemberById = (id: string | null) => {
    if (!id) return null;
    return members.find(m => m.user_id === id);
  };

  const isLoading = eventsLoading || tasksLoading;

  return (
    <AppLayout>
      <div className="h-full flex flex-col lg:flex-row gap-4 p-4">
        {/* Main Calendar */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[160px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
                Today
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Tabs value={viewFilter} onValueChange={(v) => setViewFilter(v as typeof viewFilter)}>
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs px-2">
                    <Users className="h-3 w-3 mr-1" /> All
                  </TabsTrigger>
                  <TabsTrigger value="mine" className="text-xs px-2">
                    <User className="h-3 w-3 mr-1" /> Mine
                  </TabsTrigger>
                  <TabsTrigger value="team" className="text-xs px-2">
                    <Users className="h-3 w-3 mr-1" /> Team
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Event
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Event</DialogTitle>
                  </DialogHeader>
                  <EventForm 
                    form={eventForm} 
                    setForm={setEventForm} 
                    members={members} 
                    onSubmit={handleCreateEvent} 
                    submitLabel="Create Event"
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary">
                    <CheckSquare className="h-4 w-4 mr-1" /> Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Task</DialogTitle>
                  </DialogHeader>
                  <TaskForm 
                    form={taskForm} 
                    setForm={setTaskForm} 
                    members={members} 
                    onSubmit={handleCreateTask} 
                    submitLabel="Create Task"
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Calendar Grid */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0 h-full flex flex-col">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 border-b border-border">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              {isLoading ? (
                <div className="flex-1 grid grid-cols-7 auto-rows-fr p-2 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-full min-h-[80px]" />
                  ))}
                </div>
              ) : (
                <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                  {calendarDays.map((day, idx) => {
                    const { events: dayEvents, tasks: dayTasks } = getItemsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={idx}
                        onClick={() => openDayView(day)}
                        className={cn(
                          'border-r border-b border-border p-1 cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden min-h-[80px]',
                          !isCurrentMonth && 'bg-muted/20 text-muted-foreground',
                          isToday && 'bg-primary/10'
                        )}
                      >
                        <div className={cn(
                          'text-xs font-medium mb-1 h-5 w-5 flex items-center justify-center rounded-full',
                          isToday && 'bg-primary text-primary-foreground'
                        )}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          {dayEvents.slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              className={cn(
                                'text-[10px] px-1 py-0.5 rounded truncate text-white',
                                getColorClass(event.color)
                              )}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayTasks.slice(0, Math.max(0, 2 - dayEvents.length)).map(task => (
                            <div
                              key={task.id}
                              className={cn(
                                'text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-1',
                                task.status === 'completed' ? 'line-through opacity-50' : '',
                                PRIORITY_COLORS[task.priority]
                              )}
                            >
                              <CheckSquare className="h-2 w-2 flex-shrink-0" />
                              {task.title}
                            </div>
                          ))}
                          {(dayEvents.length + dayTasks.length) > 2 && (
                            <div className="text-[10px] text-muted-foreground px-1">
                              +{dayEvents.length + dayTasks.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Tasks & Upcoming */}
        <div className="w-full lg:w-72 flex flex-col gap-4">
          {/* Quick Add */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> Quick Add Task
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickAddTask members={members} onAdd={createTask} />
            </CardContent>
          </Card>

          {/* My Tasks */}
          <Card className="flex-1 overflow-hidden min-h-[200px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckSquare className="h-4 w-4" /> My Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[180px]">
                <div className="p-4 pt-0 space-y-2">
                  {tasks
                    .filter(t => t.assigned_to === user?.id && t.status !== 'completed')
                    .slice(0, 10)
                    .map(task => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        onToggle={() => handleToggleTaskStatus(task)}
                        onEdit={() => openEditTask(task)}
                        onDelete={() => deleteTask(task.id)}
                      />
                    ))}
                  {tasks.filter(t => t.assigned_to === user?.id && t.status !== 'completed').length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No pending tasks</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="flex-1 overflow-hidden min-h-[200px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" /> Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[180px]">
                <div className="p-4 pt-0 space-y-2">
                  {events
                    .filter(e => new Date(e.start_time) >= new Date())
                    .slice(0, 10)
                    .map(event => {
                      const assignee = getMemberById(event.assigned_to);
                      return (
                        <div
                          key={event.id}
                          className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => openEditEvent(event)}
                        >
                          <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', getColorClass(event.color))} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(event.start_time), 'MMM d, h:mm a')}
                            </p>
                          </div>
                          {assignee && (
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {getMemberInitials(assignee.display_name, assignee.email)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      );
                    })}
                  {events.filter(e => new Date(e.start_time) >= new Date()).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Day View Dialog */}
      <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          {selectedDate && (
            <ScrollArea className="flex-1">
              <DayView 
                date={selectedDate}
                events={getItemsForDate(selectedDate).events}
                tasks={getItemsForDate(selectedDate).tasks}
                members={members}
                onEditEvent={openEditEvent}
                onEditTask={openEditTask}
                onDeleteEvent={deleteEvent}
                onDeleteTask={deleteTask}
                onToggleTask={handleToggleTaskStatus}
              />
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <EventForm 
            form={eventForm} 
            setForm={setEventForm} 
            members={members} 
            onSubmit={handleUpdateEvent} 
            submitLabel="Save Changes"
          />
          <Button 
            variant="destructive" 
            className="w-full mt-2"
            onClick={() => {
              if (editingEvent) {
                deleteEvent(editingEvent.id);
                setEditingEvent(null);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete Event
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <TaskForm 
            form={taskForm} 
            setForm={setTaskForm} 
            members={members} 
            onSubmit={handleUpdateTask} 
            submitLabel="Save Changes"
          />
          <Button 
            variant="destructive" 
            className="w-full mt-2"
            onClick={() => {
              if (editingTask) {
                deleteTask(editingTask.id);
                setEditingTask(null);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete Task
          </Button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// Event Form Component
interface EventFormData {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  assigned_to: string;
}

function EventForm({ 
  form, 
  setForm, 
  members, 
  onSubmit, 
  submitLabel 
}: { 
  form: EventFormData; 
  setForm: (f: EventFormData) => void; 
  members: { user_id: string; display_name: string | null; email: string }[]; 
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input 
          value={form.title} 
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Event title"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea 
          value={form.description} 
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Optional description"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start</Label>
          <Input 
            type="datetime-local" 
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          />
        </div>
        <div>
          <Label>End</Label>
          <Input 
            type="datetime-local" 
            value={form.end_time}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch 
          checked={form.all_day}
          onCheckedChange={(checked) => setForm({ ...form, all_day: checked })}
        />
        <Label>All day event</Label>
      </div>
      <div>
        <Label>Assign to</Label>
        <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select team member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Unassigned</SelectItem>
            {members.map(m => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.display_name || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Color</Label>
        <div className="flex gap-2 mt-1">
          {EVENT_COLORS.map(color => (
            <button
              key={color.value}
              type="button"
              onClick={() => setForm({ ...form, color: color.value })}
              className={cn(
                'w-6 h-6 rounded-full transition-all',
                color.class,
                form.color === color.value && 'ring-2 ring-offset-2 ring-foreground'
              )}
            />
          ))}
        </div>
      </div>
      <Button onClick={onSubmit} className="w-full">{submitLabel}</Button>
    </div>
  );
}

// Task Form Component
interface TaskFormData {
  title: string;
  description: string;
  assigned_to: string;
  priority: string;
  due_date: string;
}

function TaskForm({ 
  form, 
  setForm, 
  members, 
  onSubmit, 
  submitLabel 
}: { 
  form: TaskFormData; 
  setForm: (f: TaskFormData) => void; 
  members: { user_id: string; display_name: string | null; email: string }[]; 
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input 
          value={form.title} 
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Task title"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea 
          value={form.description} 
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Optional description"
          rows={2}
        />
      </div>
      <div>
        <Label>Due Date</Label>
        <Input 
          type="datetime-local" 
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
        />
      </div>
      <div>
        <Label>Assign to</Label>
        <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select team member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Unassigned</SelectItem>
            {members.map(m => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.display_name || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Priority</Label>
        <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onSubmit} className="w-full">{submitLabel}</Button>
    </div>
  );
}

// Quick Add Task Component
function QuickAddTask({ members, onAdd }: { members: { user_id: string; display_name: string | null; email: string }[]; onAdd: (task: { title: string; assigned_to?: string }) => void }) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({ title, assigned_to: assignee || undefined });
    setTitle('');
    setAssignee('');
  };

  return (
    <div className="space-y-2">
      <Input 
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task..."
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />
      <div className="flex gap-2">
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Assign..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Me</SelectItem>
            {members.map(m => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.display_name || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleAdd}>Add</Button>
      </div>
    </div>
  );
}

// Task Item Component
function TaskItem({ 
  task, 
  onToggle, 
  onEdit, 
  onDelete 
}: { 
  task: TeamTask; 
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 group">
      <Checkbox 
        checked={task.status === 'completed'}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm truncate',
          task.status === 'completed' && 'line-through text-muted-foreground'
        )}>
          {task.title}
        </p>
        {task.due_date && (
          <p className="text-xs text-muted-foreground">
            {format(parseISO(task.due_date), 'MMM d')}
          </p>
        )}
      </div>
      <Badge variant="secondary" className={cn('text-[10px] flex-shrink-0', PRIORITY_COLORS[task.priority])}>
        {task.priority}
      </Badge>
      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
          <Edit className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// Day View Component
function DayView({ 
  date, 
  events, 
  tasks, 
  members,
  onEditEvent,
  onEditTask,
  onDeleteEvent,
  onDeleteTask,
  onToggleTask
}: { 
  date: Date;
  events: CalendarEvent[];
  tasks: TeamTask[];
  members: { user_id: string; display_name: string | null; email: string }[];
  onEditEvent: (e: CalendarEvent) => void;
  onEditTask: (t: TeamTask) => void;
  onDeleteEvent: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onToggleTask: (t: TeamTask) => void;
}) {
  const getMemberById = (id: string | null) => members.find(m => m.user_id === id);

  return (
    <div className="space-y-6 pr-4">
      {/* Events Section */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" /> Events ({events.length})
        </h3>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events scheduled</p>
        ) : (
          <div className="space-y-2">
            {events.map(event => {
              const assignee = getMemberById(event.assigned_to);
              return (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={cn('w-3 h-3 rounded-full flex-shrink-0', getColorClass(event.color))} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground truncate">{event.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {event.all_day ? 'All day' : format(parseISO(event.start_time), 'h:mm a')}
                      {event.end_time && !event.all_day && ` - ${format(parseISO(event.end_time), 'h:mm a')}`}
                    </p>
                  </div>
                  {assignee && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getMemberInitials(assignee.display_name, assignee.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm hidden sm:inline">{assignee.display_name || assignee.email}</span>
                    </div>
                  )}
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditEvent(event)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeleteEvent(event.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tasks Section */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <CheckSquare className="h-4 w-4" /> Tasks ({tasks.length})
        </h3>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks due</p>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => {
              const assignee = getMemberById(task.assigned_to);
              return (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Checkbox 
                    checked={task.status === 'completed'}
                    onCheckedChange={() => onToggleTask(task)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium truncate', task.status === 'completed' && 'line-through opacity-50')}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                    )}
                  </div>
                  <Badge className={cn('flex-shrink-0', PRIORITY_COLORS[task.priority])}>{task.priority}</Badge>
                  {assignee && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getMemberInitials(assignee.display_name, assignee.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm hidden sm:inline">{assignee.display_name || assignee.email}</span>
                    </div>
                  )}
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditTask(task)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeleteTask(task.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Who's Doing What */}
      {(events.length > 0 || tasks.length > 0) && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" /> Who's Doing What
          </h3>
          <div className="space-y-2">
            {members.map(member => {
              const memberEvents = events.filter(e => e.assigned_to === member.user_id);
              const memberTasks = tasks.filter(t => t.assigned_to === member.user_id);
              if (memberEvents.length === 0 && memberTasks.length === 0) return null;
              
              return (
                <div key={member.user_id} className="p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getMemberInitials(member.display_name, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{member.display_name || member.email}</span>
                  </div>
                  <div className="pl-8 space-y-1">
                    {memberEvents.map(e => (
                      <div key={e.id} className="flex items-center gap-2 text-sm">
                        <div className={cn('w-2 h-2 rounded-full', getColorClass(e.color))} />
                        <span className="truncate">{e.title}</span>
                        <span className="text-muted-foreground text-xs flex-shrink-0">
                          {e.all_day ? 'All day' : format(parseISO(e.start_time), 'h:mm a')}
                        </span>
                      </div>
                    ))}
                    {memberTasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm">
                        <CheckSquare className={cn('h-3 w-3 flex-shrink-0', t.status === 'completed' ? 'text-green-500' : 'text-muted-foreground')} />
                        <span className={cn('truncate', t.status === 'completed' && 'line-through opacity-50')}>{t.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
