import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { shiftAPI, teamAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
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
import { Checkbox } from '../components/ui/checkbox';
import {
  Clock,
  Plus,
  Calendar,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  Coffee,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, addDays } from 'date-fns';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHIFT_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Shifts() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const [newShift, setNewShift] = useState({
    name: '',
    start_time: '09:00',
    end_time: '17:00',
    days: [],
    break_duration: 60,
    color: SHIFT_COLORS[0],
  });

  const [newAssignment, setNewAssignment] = useState({
    user_id: '',
    shift_id: '',
    date: '',
    notes: '',
  });

  const isManager = ['admin', 'manager', 'hr'].includes(user?.role);
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shiftsRes, assignmentsRes, teamRes] = await Promise.all([
        shiftAPI.getAll(),
        shiftAPI.getAssignments({
          start_date: format(weekStart, 'yyyy-MM-dd'),
          end_date: format(weekEnd, 'yyyy-MM-dd'),
        }),
        teamAPI.getAll(),
      ]);
      setShifts(shiftsRes.data);
      setAssignments(assignmentsRes.data);
      setTeam(teamRes.data);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async () => {
    if (!newShift.name) {
      toast.error('Shift name is required');
      return;
    }

    try {
      await shiftAPI.create(newShift);
      toast.success('Shift created');
      setShowShiftDialog(false);
      setNewShift({
        name: '',
        start_time: '09:00',
        end_time: '17:00',
        days: [],
        break_duration: 60,
        color: SHIFT_COLORS[0],
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to create shift');
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm('Delete this shift?')) return;
    try {
      await shiftAPI.delete(shiftId);
      toast.success('Shift deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete shift');
    }
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.user_id || !newAssignment.shift_id || !newAssignment.date) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await shiftAPI.createAssignment({
        ...newAssignment,
        date: new Date(newAssignment.date).toISOString(),
      });
      toast.success('Shift assigned');
      setShowAssignDialog(false);
      setNewAssignment({ user_id: '', shift_id: '', date: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to assign shift');
    }
  };

  const openAssignDialog = (date) => {
    setSelectedDate(date);
    setNewAssignment({
      ...newAssignment,
      date: format(date, 'yyyy-MM-dd'),
    });
    setShowAssignDialog(true);
  };

  const getAssignmentsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return assignments.filter(a => a.date?.startsWith(dateStr));
  };

  const toggleDay = (dayIndex) => {
    setNewShift(prev => ({
      ...prev,
      days: prev.days.includes(dayIndex)
        ? prev.days.filter(d => d !== dayIndex)
        : [...prev.days, dayIndex].sort(),
    }));
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const calculateShiftHours = (startTime, endTime, breakMinutes) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM) - breakMinutes;
    return (totalMinutes / 60).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="shifts-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Shift Scheduling</h1>
          <p className="text-zinc-400 mt-1">Create shifts and assign team members</p>
        </div>

        {isManager && (
          <div className="flex items-center gap-3">
            <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-zinc-700" data-testid="create-shift-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Shift
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="text-zinc-100">Create Shift</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Shift Name *</label>
                    <Input
                      value={newShift.name}
                      onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      placeholder="e.g., Morning Shift"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">Start Time</label>
                      <Input
                        type="time"
                        value={newShift.start_time}
                        onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">End Time</label>
                      <Input
                        type="time"
                        value={newShift.end_time}
                        onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Break Duration (minutes)</label>
                    <Select
                      value={String(newShift.break_duration)}
                      onValueChange={(v) => setNewShift({ ...newShift, break_duration: parseInt(v) })}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="0">No break</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Working Days</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day, idx) => (
                        <button
                          key={day}
                          onClick={() => toggleDay(idx)}
                          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                            newShift.days.includes(idx)
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Color</label>
                    <div className="flex gap-2">
                      {SHIFT_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewShift({ ...newShift, color: c })}
                          className={`w-8 h-8 rounded-full transition-transform ${newShift.color === c ? 'ring-2 ring-white scale-110' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleCreateShift} className="w-full bg-emerald-600 hover:bg-emerald-500">
                    Create Shift
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Shifts Overview */}
      {shifts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map(shift => (
            <Card key={shift.shift_id} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: shift.color }}
                    />
                    <div>
                      <p className="text-zinc-100 font-medium">{shift.name}</p>
                      <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
                        <Clock className="w-4 h-4" />
                        <span>{shift.start_time} - {shift.end_time}</span>
                        <span className="text-zinc-600">·</span>
                        <span>{calculateShiftHours(shift.start_time, shift.end_time, shift.break_duration)}h</span>
                      </div>
                    </div>
                  </div>
                  {isManager && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteShift(shift.shift_id)}
                      className="text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Coffee className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs text-zinc-500">{shift.break_duration}m break</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <Badge
                      key={day}
                      variant="outline"
                      className={`text-xs ${
                        shift.days?.includes(idx)
                          ? 'border-emerald-500/50 text-emerald-400'
                          : 'border-zinc-700 text-zinc-600'
                      }`}
                    >
                      {day.slice(0, 2)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Week Calendar */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-zinc-100 text-base">Schedule Calendar</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                className="text-zinc-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-zinc-100 font-medium min-w-[200px] text-center">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                className="text-zinc-400"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => {
              const dayAssignments = getAssignmentsForDate(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[150px] p-2 rounded-lg ${
                    isToday ? 'bg-zinc-800 ring-1 ring-emerald-500' : 'bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs text-zinc-500">{format(day, 'EEE')}</p>
                      <p className={`text-lg font-semibold ${isToday ? 'text-emerald-400' : 'text-zinc-100'}`}>
                        {format(day, 'd')}
                      </p>
                    </div>
                    {isManager && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openAssignDialog(day)}
                        className="text-zinc-500 hover:text-emerald-400 h-7 w-7"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayAssignments.map(assignment => (
                      <div
                        key={assignment.assignment_id}
                        className="p-1.5 rounded text-xs"
                        style={{ backgroundColor: `${assignment.shift?.color}20` }}
                      >
                        <div className="flex items-center gap-1.5">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={assignment.user_picture} />
                            <AvatarFallback className="bg-zinc-700 text-zinc-200 text-[10px]">
                              {getInitials(assignment.user_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-zinc-300 truncate">{assignment.user_name?.split(' ')[0]}</span>
                        </div>
                        <p className="text-zinc-500 mt-0.5" style={{ color: assignment.shift?.color }}>
                          {assignment.shift?.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Assign Shift Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              Assign Shift - {selectedDate && format(selectedDate, 'MMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Team Member *</label>
              <Select
                value={newAssignment.user_id}
                onValueChange={(v) => setNewAssignment({ ...newAssignment, user_id: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {team.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Shift *</label>
              <Select
                value={newAssignment.shift_id}
                onValueChange={(v) => setNewAssignment({ ...newAssignment, shift_id: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {shifts.map(s => (
                    <SelectItem key={s.shift_id} value={s.shift_id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name} ({s.start_time} - {s.end_time})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Notes</label>
              <Input
                value={newAssignment.notes}
                onChange={(e) => setNewAssignment({ ...newAssignment, notes: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
                placeholder="Optional notes"
              />
            </div>
            <Button onClick={handleCreateAssignment} className="w-full bg-emerald-600 hover:bg-emerald-500">
              Assign Shift
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {shifts.length === 0 && (
        <div className="empty-state py-16">
          <Calendar className="w-16 h-16 text-zinc-700 mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No Shifts Created</h3>
          <p className="text-zinc-500 mb-4">Create shifts to start scheduling your team</p>
          {isManager && (
            <Button onClick={() => setShowShiftDialog(true)} className="bg-emerald-600 hover:bg-emerald-500">
              <Plus className="w-4 h-4 mr-2" />
              Create Shift
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
