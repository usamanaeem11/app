import React, { useState, useEffect, useCallback } from 'react';
import { timeEntryAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Calendar } from '../components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Clock,
  Play,
  Square,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday, isSameDay } from 'date-fns';

export default function TimeTracking() {
  const [entries, setEntries] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    notes: '',
  });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const fetchEntries = useCallback(async () => {
    try {
      const [entriesRes, activeRes] = await Promise.all([
        timeEntryAPI.getAll({
          start_date: format(weekStart, 'yyyy-MM-dd'),
          end_date: format(weekEnd, 'yyyy-MM-dd'),
        }),
        timeEntryAPI.getActive(),
      ]);
      setEntries(entriesRes.data);
      setActiveEntry(activeRes.data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    let interval;
    if (activeEntry) {
      interval = setInterval(() => {
        const start = new Date(activeEntry.start_time);
        const now = new Date();
        setTimerSeconds(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeEntry]);

  const handleStartTimer = async () => {
    try {
      await timeEntryAPI.create({
        start_time: new Date().toISOString(),
        source: 'manual',
      });
      toast.success('Timer started');
      fetchEntries();
    } catch (error) {
      toast.error('Failed to start timer');
    }
  };

  const handleStopTimer = async () => {
    if (!activeEntry) return;
    try {
      await timeEntryAPI.update(activeEntry.entry_id, {
        end_time: new Date().toISOString(),
      });
      toast.success('Timer stopped');
      setActiveEntry(null);
      setTimerSeconds(0);
      fetchEntries();
    } catch (error) {
      toast.error('Failed to stop timer');
    }
  };

  const handleAddEntry = async () => {
    try {
      const startDateTime = new Date(`${newEntry.date}T${newEntry.start_time}:00`);
      const endDateTime = new Date(`${newEntry.date}T${newEntry.end_time}:00`);

      if (endDateTime <= startDateTime) {
        toast.error('End time must be after start time');
        return;
      }

      await timeEntryAPI.create({
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        source: 'manual',
        notes: newEntry.notes,
      });

      toast.success('Time entry added');
      setShowAddDialog(false);
      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '17:00',
        notes: '',
      });
      fetchEntries();
    } catch (error) {
      toast.error('Failed to add entry');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await timeEntryAPI.delete(entryId);
      toast.success('Entry deleted');
      fetchEntries();
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getDayEntries = (date) => {
    return entries.filter((entry) => {
      const entryDate = new Date(entry.start_time).toDateString();
      return entryDate === date.toDateString();
    });
  };

  const getDayTotal = (date) => {
    const dayEntries = getDayEntries(date);
    return dayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  };

  const getWeekTotal = () => {
    return entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="time-tracking">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Time Tracking</h1>
          <p className="text-zinc-400 mt-1">Track and manage your work hours</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer Display */}
          <div className="text-right">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Current Session</p>
            <p className="timer-display text-2xl" data-testid="timer-display">
              {formatTime(timerSeconds)}
            </p>
          </div>

          {/* Timer Button */}
          {activeEntry ? (
            <Button
              onClick={handleStopTimer}
              className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600"
              data-testid="stop-timer-btn"
            >
              <Square className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              onClick={handleStartTimer}
              className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-600"
              data-testid="start-timer-btn"
            >
              <Play className="w-5 h-5 ml-0.5" />
            </Button>
          )}

          {/* Add Manual Entry */}
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-zinc-700" data-testid="add-entry-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Add Time Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Date</label>
                  <Input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    data-testid="entry-date-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Start Time</label>
                    <Input
                      type="time"
                      value={newEntry.start_time}
                      onChange={(e) => setNewEntry({ ...newEntry, start_time: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      data-testid="entry-start-time-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">End Time</label>
                    <Input
                      type="time"
                      value={newEntry.end_time}
                      onChange={(e) => setNewEntry({ ...newEntry, end_time: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      data-testid="entry-end-time-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Notes (Optional)</label>
                  <Input
                    placeholder="What did you work on?"
                    value={newEntry.notes}
                    onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    data-testid="entry-notes-input"
                  />
                </div>
                <Button
                  onClick={handleAddEntry}
                  className="w-full bg-emerald-600 hover:bg-emerald-500"
                  data-testid="save-entry-btn"
                >
                  Save Entry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Week Navigation */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="text-zinc-400"
              data-testid="prev-week-btn"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="text-center">
              <p className="text-zinc-100 font-semibold">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </p>
              <p className="text-sm text-zinc-500">
                Week Total: <span className="text-emerald-400 mono">{formatDuration(getWeekTotal())}</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="text-zinc-400"
              data-testid="next-week-btn"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Week Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayTotal = getDayTotal(day);
              const isSelected = isSameDay(day, selectedDate);
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`p-3 rounded-lg text-center transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/20 border border-emerald-500/50'
                      : 'bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700'
                  } ${today ? 'ring-1 ring-emerald-500' : ''}`}
                  data-testid={`day-${format(day, 'yyyy-MM-dd')}`}
                >
                  <p className="text-xs text-zinc-500 uppercase">{format(day, 'EEE')}</p>
                  <p className={`text-lg font-semibold ${isSelected ? 'text-emerald-400' : 'text-zinc-100'}`}>
                    {format(day, 'd')}
                  </p>
                  <p className={`text-xs mono ${dayTotal > 0 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {formatDuration(dayTotal)}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Entries */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-zinc-100 text-base font-semibold">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
              {formatDuration(getDayTotal(selectedDate))}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {getDayEntries(selectedDate).length > 0 ? (
            <div className="space-y-3">
              {getDayEntries(selectedDate).map((entry) => (
                <div
                  key={entry.entry_id}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-800"
                  data-testid={`entry-${entry.entry_id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-zinc-700/50">
                      <Clock className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-100 mono text-sm">
                          {format(new Date(entry.start_time), 'HH:mm')}
                        </span>
                        <span className="text-zinc-500">→</span>
                        <span className="text-zinc-100 mono text-sm">
                          {entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : 'Running'}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-zinc-500 mt-1">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        entry.status === 'active'
                          ? 'status-active'
                          : entry.source === 'auto'
                          ? 'badge-info'
                          : 'border-zinc-700 text-zinc-400'
                      }
                    >
                      {entry.status === 'active' ? 'Running' : entry.source}
                    </Badge>
                    <span className="text-zinc-100 font-medium mono">{formatDuration(entry.duration || 0)}</span>
                    {entry.status !== 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEntry(entry.entry_id)}
                        className="text-zinc-500 hover:text-red-400"
                        data-testid={`delete-entry-${entry.entry_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state py-8">
              <Clock className="w-12 h-12 text-zinc-700 mb-3" />
              <p className="text-zinc-500">No time entries for this day</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-zinc-700"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
