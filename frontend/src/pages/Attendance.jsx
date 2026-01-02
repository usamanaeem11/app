import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, teamAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, eachDayOfInterval, isWeekend, isSameDay } from 'date-fns';

export default function Attendance() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [report, setReport] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState('');

  const isManager = ['admin', 'manager', 'hr'].includes(user?.role);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const [todayRes, recordsRes, teamRes] = await Promise.all([
        attendanceAPI.getToday(),
        attendanceAPI.getAll({ start_date: monthStart, end_date: monthEnd }),
        isManager ? teamAPI.getAll() : Promise.resolve({ data: [] }),
      ]);

      setTodayAttendance(todayRes.data);
      setAttendanceRecords(recordsRes.data);
      setTeam(teamRes.data);

      // Fetch report for managers
      if (isManager) {
        const reportRes = await attendanceAPI.getReport(monthStart, monthEnd);
        setReport(reportRes.data);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    setClockingIn(true);
    try {
      const response = await attendanceAPI.clockIn();
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to clock in');
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    setClockingOut(true);
    try {
      const response = await attendanceAPI.clockOut();
      toast.success(`Clocked out! Work hours: ${response.data.work_hours}h`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to clock out');
    } finally {
      setClockingOut(false);
    }
  };

  const exportReport = () => {
    const headers = ['Employee', 'Work Hours', 'Overtime', 'Present Days', 'Late Days', 'Absent Days', 'Attendance Rate'];
    const rows = report.map(r => [
      r.name,
      r.total_work_hours,
      r.total_overtime,
      r.present_days,
      r.late_days,
      r.absent_days,
      `${r.attendance_rate}%`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${format(currentMonth, 'yyyy-MM')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return <Badge className="badge-success">Present</Badge>;
      case 'late':
        return <Badge className="badge-warning">Late</Badge>;
      case 'absent':
        return <Badge className="badge-danger">Absent</Badge>;
      case 'half_day':
        return <Badge className="bg-purple-500/20 text-purple-400">Half Day</Badge>;
      case 'on_leave':
        return <Badge className="badge-info">On Leave</Badge>;
      default:
        return <Badge className="border-zinc-700 text-zinc-400">{status}</Badge>;
    }
  };

  const getMonthDays = () => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
  };

  const getAttendanceForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendanceRecords.find(a => a.date?.startsWith(dateStr));
  };

  const myMonthStats = {
    workHours: attendanceRecords
      .filter(a => a.user_id === user?.user_id)
      .reduce((sum, a) => sum + (a.work_hours || 0), 0),
    overtime: attendanceRecords
      .filter(a => a.user_id === user?.user_id)
      .reduce((sum, a) => sum + (a.overtime || 0), 0),
    presentDays: attendanceRecords
      .filter(a => a.user_id === user?.user_id && ['present', 'late'].includes(a.status))
      .length,
    lateDays: attendanceRecords
      .filter(a => a.user_id === user?.user_id && a.status === 'late')
      .length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="attendance-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Attendance</h1>
          <p className="text-zinc-400 mt-1">Track your daily attendance and work hours</p>
        </div>

        {isManager && (
          <Button variant="outline" onClick={exportReport} className="border-zinc-700" data-testid="export-report-btn">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        )}
      </div>

      {/* Clock In/Out Card */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 uppercase tracking-wide mb-1">Today's Attendance</p>
              <p className="text-2xl font-bold text-zinc-100">{format(new Date(), 'EEEE, MMMM d')}</p>
              {todayAttendance?.clock_in && (
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <LogIn className="w-4 h-4 text-emerald-400" />
                    <span>In: {format(new Date(todayAttendance.clock_in), 'HH:mm')}</span>
                  </div>
                  {todayAttendance.clock_out && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span>Out: {format(new Date(todayAttendance.clock_out), 'HH:mm')}</span>
                    </div>
                  )}
                  {todayAttendance.status && getStatusBadge(todayAttendance.status)}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {todayAttendance?.work_hours > 0 && (
                <div className="text-right">
                  <p className="text-xs text-zinc-500 uppercase">Work Hours</p>
                  <p className="text-2xl font-bold text-emerald-400 mono">{todayAttendance.work_hours}h</p>
                </div>
              )}

              {!todayAttendance?.clock_in ? (
                <Button
                  onClick={handleClockIn}
                  className="h-14 px-8 bg-emerald-600 hover:bg-emerald-500 text-lg"
                  disabled={clockingIn}
                  data-testid="clock-in-btn"
                >
                  {clockingIn ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      Clock In
                    </>
                  )}
                </Button>
              ) : !todayAttendance?.clock_out ? (
                <Button
                  onClick={handleClockOut}
                  className="h-14 px-8 bg-red-600 hover:bg-red-500 text-lg"
                  disabled={clockingOut}
                  data-testid="clock-out-btn"
                >
                  {clockingOut ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="w-5 h-5 mr-2" />
                      Clock Out
                    </>
                  )}
                </Button>
              ) : (
                <Badge className="h-14 px-6 text-lg badge-success">Day Complete</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Work Hours</p>
              <p className="text-xl font-bold text-zinc-100 mono">{myMonthStats.workHours.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Overtime</p>
              <p className="text-xl font-bold text-zinc-100 mono">{myMonthStats.overtime.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Present Days</p>
              <p className="text-xl font-bold text-zinc-100">{myMonthStats.presentDays}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Late Days</p>
              <p className="text-xl font-bold text-zinc-100">{myMonthStats.lateDays}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-zinc-100 text-base">Monthly Overview</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="text-zinc-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-zinc-100 font-medium min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="text-zinc-400"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs text-zinc-500 py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month start */}
            {Array.from({ length: (startOfMonth(currentMonth).getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {getMonthDays().map(day => {
              const attendance = getAttendanceForDate(day);
              const isToday = isSameDay(day, new Date());
              const weekend = isWeekend(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm ${
                    isToday ? 'ring-2 ring-emerald-500' : ''
                  } ${
                    weekend ? 'bg-zinc-800/30' : 'bg-zinc-800/50'
                  } ${
                    attendance?.status === 'present' ? 'border border-emerald-500/30' :
                    attendance?.status === 'late' ? 'border border-amber-500/30' :
                    attendance?.status === 'absent' ? 'border border-red-500/30' : ''
                  }`}
                >
                  <span className={`${isToday ? 'text-emerald-400' : 'text-zinc-300'}`}>
                    {format(day, 'd')}
                  </span>
                  {attendance && (
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      attendance.status === 'present' ? 'bg-emerald-500' :
                      attendance.status === 'late' ? 'bg-amber-500' :
                      attendance.status === 'absent' ? 'bg-red-500' : 'bg-zinc-600'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Late</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Absent</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Report (Managers only) */}
      {isManager && report.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-100 text-base flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Attendance Report
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-500">Employee</TableHead>
                  <TableHead className="text-zinc-500">Work Hours</TableHead>
                  <TableHead className="text-zinc-500">Overtime</TableHead>
                  <TableHead className="text-zinc-500">Present</TableHead>
                  <TableHead className="text-zinc-500">Late</TableHead>
                  <TableHead className="text-zinc-500">Absent</TableHead>
                  <TableHead className="text-zinc-500">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.map((r) => (
                  <TableRow key={r.user_id} className="border-zinc-800">
                    <TableCell>
                      <p className="text-zinc-100 font-medium">{r.name}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-zinc-100 mono">{r.total_work_hours}h</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-blue-400 mono">{r.total_overtime}h</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-emerald-400">{r.present_days}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-amber-400">{r.late_days}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-red-400">{r.absent_days}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={r.attendance_rate} className="h-1.5 w-16 bg-zinc-800" />
                        <span className="text-zinc-300 mono text-sm">{r.attendance_rate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
