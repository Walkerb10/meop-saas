import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Clock, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserCalendars, CalendarTimeBlock } from '@/hooks/useUserCalendars';
import { TeamTask } from '@/hooks/useTeamTasks';
import { cn } from '@/lib/utils';

interface FullDayViewProps {
  date: Date;
  task: TeamTask | null;
  onClose: () => void;
  onCompleteTask?: (task: TeamTask) => void;
}

// Time slots from 9am to 5pm
const TIME_SLOTS = [
  { time: '09:00', label: '9:00 AM' },
  { time: '09:30', label: '9:30 AM' },
  { time: '10:00', label: '10:00 AM' },
  { time: '10:30', label: '10:30 AM' },
  { time: '11:00', label: '11:00 AM' },
  { time: '11:30', label: '11:30 AM' },
  { time: '12:00', label: '12:00 PM' },
  { time: '12:30', label: '12:30 PM' },
  { time: '13:00', label: '1:00 PM' },
  { time: '13:30', label: '1:30 PM' },
  { time: '14:00', label: '2:00 PM' },
  { time: '14:30', label: '2:30 PM' },
  { time: '15:00', label: '3:00 PM' },
  { time: '15:30', label: '3:30 PM' },
  { time: '16:00', label: '4:00 PM' },
  { time: '16:30', label: '4:30 PM' },
  { time: '17:00', label: '5:00 PM' },
];

export function FullDayView({ date, task, onClose, onCompleteTask }: FullDayViewProps) {
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
  });

  const { timeBlocks, createTimeBlock, deleteTimeBlock, fetchTimeBlocks, getTimeBlocksForDate } = useUserCalendars();

  const dateString = format(date, 'yyyy-MM-dd');

  useEffect(() => {
    fetchTimeBlocks(dateString);
  }, [dateString, fetchTimeBlocks]);

  const dayEvents = useMemo(() => {
    return getTimeBlocksForDate(dateString);
  }, [timeBlocks, dateString, getTimeBlocksForDate]);

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.start_time || !newEvent.end_time) return;

    await createTimeBlock({
      title: newEvent.title,
      description: newEvent.description || null,
      date: dateString,
      start_time: newEvent.start_time,
      end_time: newEvent.end_time,
    });

    setNewEvent({ title: '', description: '', start_time: '', end_time: '' });
    setShowAddEvent(false);
    setSelectedSlot(null);
  };

  const handleSlotClick = (time: string) => {
    const startIndex = TIME_SLOTS.findIndex(s => s.time === time);
    const endTime = startIndex < TIME_SLOTS.length - 1 ? TIME_SLOTS[startIndex + 1].time : '18:00';
    
    setSelectedSlot(time);
    setNewEvent({
      title: '',
      description: '',
      start_time: time,
      end_time: endTime,
    });
    setShowAddEvent(true);
  };

  const getEventForSlot = (time: string): CalendarTimeBlock | null => {
    return dayEvents.find(e => {
      const start = e.start_time.slice(0, 5);
      const end = e.end_time.slice(0, 5);
      return time >= start && time < end;
    }) || null;
  };

  const isSlotStart = (time: string, event: CalendarTimeBlock): boolean => {
    return event.start_time.slice(0, 5) === time;
  };

  const getEventSlotSpan = (event: CalendarTimeBlock): number => {
    const startIndex = TIME_SLOTS.findIndex(s => s.time === event.start_time.slice(0, 5));
    const endIndex = TIME_SLOTS.findIndex(s => s.time === event.end_time.slice(0, 5));
    if (startIndex === -1) return 1;
    if (endIndex === -1) return TIME_SLOTS.length - startIndex;
    return endIndex - startIndex;
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">{format(date, 'EEEE, MMMM d')}</h2>
          <p className="text-sm text-muted-foreground">{format(date, 'yyyy')}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Task at the top */}
      {task && (
        <Card className="p-4 mt-4 bg-primary/5 border-primary/20">
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="secondary" className="mb-2">Today's One Thing</Badge>
              <h3 className="font-medium">{task.title}</h3>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
              )}
              {task.estimated_minutes && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Clock className="h-3 w-3" />
                  {task.estimated_minutes < 60 
                    ? `${task.estimated_minutes}m` 
                    : `${Math.floor(task.estimated_minutes / 60)}h ${task.estimated_minutes % 60}m`}
                </div>
              )}
            </div>
            {task.status !== 'completed' && onCompleteTask && (
              <Button size="sm" onClick={() => onCompleteTask(task)}>
                Complete
              </Button>
            )}
            {task.status === 'completed' && (
              <Badge className="bg-green-500">Done</Badge>
            )}
          </div>
        </Card>
      )}

      {/* Time slots calendar */}
      <div className="flex items-center justify-between mt-6 mb-3">
        <h3 className="font-medium">Schedule</h3>
        <Button size="sm" variant="outline" onClick={() => setShowAddEvent(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Event
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0">
          {TIME_SLOTS.map((slot) => {
            const event = getEventForSlot(slot.time);
            const isStart = event && isSlotStart(slot.time, event);
            const slotSpan = event && isStart ? getEventSlotSpan(event) : 0;

            // Skip rendering if this slot is part of an ongoing event (but not the start)
            if (event && !isStart) return null;

            return (
              <div
                key={slot.time}
                className={cn(
                  'flex border-t min-h-[48px]',
                  !event && 'hover:bg-muted/30 cursor-pointer'
                )}
                onClick={() => !event && handleSlotClick(slot.time)}
              >
                <div className="w-16 shrink-0 py-2 pr-2 text-right text-xs text-muted-foreground">
                  {slot.label}
                </div>
                <div className="flex-1 py-1 pl-2 border-l">
                  {event && isStart && (
                    <div
                      className="bg-primary/10 border-l-2 border-primary rounded-r px-2 py-1"
                      style={{ minHeight: `${slotSpan * 48}px` }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{event.title}</p>
                          {event.description && (
                            <p className="text-xs text-muted-foreground">{event.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTimeBlock(event.id, dateString);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Add Event Dialog */}
      <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Event title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select value={newEvent.start_time} onValueChange={(v) => setNewEvent({ ...newEvent, start_time: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(slot => (
                      <SelectItem key={slot.time} value={slot.time}>{slot.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select value={newEvent.end_time} onValueChange={(v) => setNewEvent({ ...newEvent, end_time: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(slot => (
                      <SelectItem key={slot.time} value={slot.time}>{slot.label}</SelectItem>
                    ))}
                    <SelectItem value="18:00">6:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddEvent} className="w-full" disabled={!newEvent.title || !newEvent.start_time || !newEvent.end_time}>
              Add Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}