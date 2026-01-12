import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, User, Trash2, Edit2, X } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';

const EVENT_COLORS = [
  { value: 'primary', label: 'Blue', class: 'bg-primary' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
];

function getColorClass(color: string) {
  const found = EVENT_COLORS.find(c => c.value === color);
  return found?.class || 'bg-primary';
}

export default function Calendar() {
  const { events, loading, createEvent, updateEvent, deleteEvent } = useCalendarEvents();
  const { members } = useTeamMembers();
  const { isAdmin, isOwner } = useUserRole();
  const canManage = isAdmin || isOwner;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    all_day: false,
    color: 'primary',
    assigned_to: '',
  });

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const eventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, day);
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      all_day: false,
      color: 'primary',
      assigned_to: '',
    });
  };

  const handleCreateEvent = async () => {
    if (!formData.title || !formData.start_time) return;
    
    await createEvent({
      title: formData.title,
      description: formData.description,
      start_time: formData.start_time,
      end_time: formData.end_time || undefined,
      all_day: formData.all_day,
      color: formData.color,
      assigned_to: formData.assigned_to || undefined,
    });
    
    resetForm();
    setIsCreateOpen(false);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !formData.title) return;
    
    await updateEvent(editingEvent.id, {
      title: formData.title,
      description: formData.description,
      start_time: formData.start_time,
      end_time: formData.end_time || null,
      all_day: formData.all_day,
      color: formData.color,
      assigned_to: formData.assigned_to || null,
    });
    
    resetForm();
    setEditingEvent(null);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await deleteEvent(eventId);
    setViewingEvent(null);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setFormData({
      title: event.title,
      description: event.description || '',
      start_time: event.start_time.slice(0, 16),
      end_time: event.end_time?.slice(0, 16) || '',
      all_day: event.all_day,
      color: event.color,
      assigned_to: event.assigned_to || '',
    });
    setEditingEvent(event);
    setViewingEvent(null);
  };

  const openCreateWithDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd'T'09:00");
    setFormData(prev => ({
      ...prev,
      start_time: dateStr,
    }));
    setIsCreateOpen(true);
  };

  const getAssigneeName = (userId: string | null) => {
    if (!userId) return null;
    const member = members.find(m => m.user_id === userId);
    return member?.display_name || member?.email || 'Unknown';
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Calendar</h1>
              <p className="text-muted-foreground text-sm">Team events and tasks</p>
            </div>
          </div>
          
          {canManage && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Event</DialogTitle>
                </DialogHeader>
                <EventForm
                  formData={formData}
                  setFormData={setFormData}
                  members={members}
                  onSubmit={handleCreateEvent}
                  submitLabel="Create Event"
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {format(currentMonth, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              {loading ? (
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: days[0].getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-24 rounded-lg bg-muted/30" />
                  ))}
                  
                  {days.map(day => {
                    const dayEvents = eventsForDay(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    
                    return (
                      <motion.div
                        key={day.toISOString()}
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                          "h-24 rounded-lg p-1 cursor-pointer transition-colors overflow-hidden",
                          isToday(day) && "ring-2 ring-primary",
                          isSelected && "bg-primary/10",
                          !isSelected && "hover:bg-muted/50"
                        )}
                        onClick={() => setSelectedDate(day)}
                        onDoubleClick={() => canManage && openCreateWithDate(day)}
                      >
                        <div className={cn(
                          "text-xs font-medium mb-1",
                          isToday(day) && "text-primary"
                        )}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              className={cn(
                                "text-[10px] px-1 py-0.5 rounded truncate text-white cursor-pointer",
                                getColorClass(event.color)
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingEvent(event);
                              }}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events Sidebar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))
                ) : events.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming events
                  </p>
                ) : (
                  events.slice(0, 5).map(event => (
                    <motion.div
                      key={event.id}
                      whileHover={{ x: 2 }}
                      className="p-2 rounded-lg border cursor-pointer hover:bg-muted/50"
                      onClick={() => setViewingEvent(event)}
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn("w-1 h-full min-h-[40px] rounded", getColorClass(event.color))} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(event.start_time), 'MMM d, h:mm a')}
                          </div>
                          {event.assigned_to && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <User className="h-3 w-3" />
                              {getAssigneeName(event.assigned_to)}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Event Dialog */}
        <Dialog open={!!viewingEvent} onOpenChange={() => setViewingEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded", getColorClass(viewingEvent?.color || 'primary'))} />
                {viewingEvent?.title}
              </DialogTitle>
            </DialogHeader>
            {viewingEvent && (
              <div className="space-y-4">
                {viewingEvent.description && (
                  <p className="text-sm text-muted-foreground">{viewingEvent.description}</p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(parseISO(viewingEvent.start_time), 'PPP p')}
                      {viewingEvent.end_time && ` - ${format(parseISO(viewingEvent.end_time), 'p')}`}
                    </span>
                  </div>
                  {viewingEvent.assigned_to && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Assigned to: {getAssigneeName(viewingEvent.assigned_to)}</span>
                    </div>
                  )}
                </div>
                
                {canManage && (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(viewingEvent)}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteEvent(viewingEvent.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Event Dialog */}
        <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <EventForm
              formData={formData}
              setFormData={setFormData}
              members={members}
              onSubmit={handleUpdateEvent}
              submitLabel="Save Changes"
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

// Event Form Component
function EventForm({
  formData,
  setFormData,
  members,
  onSubmit,
  submitLabel,
}: {
  formData: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    all_day: boolean;
    color: string;
    assigned_to: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  members: { user_id: string; display_name: string | null; email: string }[];
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Event title"
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Optional description"
          rows={2}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">Start</Label>
          <Input
            id="start_time"
            type="datetime-local"
            value={formData.start_time}
            onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="end_time">End</Label>
          <Input
            id="end_time"
            type="datetime-local"
            value={formData.end_time}
            onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Switch
          checked={formData.all_day}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, all_day: checked }))}
        />
        <Label>All day event</Label>
      </div>
      
      <div>
        <Label>Color</Label>
        <div className="flex gap-2 mt-1">
          {EVENT_COLORS.map(color => (
            <button
              key={color.value}
              type="button"
              className={cn(
                "w-6 h-6 rounded-full transition-transform",
                color.class,
                formData.color === color.value && "ring-2 ring-offset-2 ring-primary scale-110"
              )}
              onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
            />
          ))}
        </div>
      </div>
      
      <div>
        <Label>Assign to</Label>
        <Select
          value={formData.assigned_to}
          onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select team member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No assignment</SelectItem>
            {members.map(member => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.display_name || member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button onClick={onSubmit} className="w-full">
        {submitLabel}
      </Button>
    </div>
  );
}
