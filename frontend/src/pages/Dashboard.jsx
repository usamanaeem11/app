import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { dashboardAPI, timeEntryAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import {
  Clock,
  Play,
  Square,
  Users,
  Camera,
  FileText,
  Calendar,
  TrendingUp,
  Activity,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { toast } from 'sonner';

export default function Dashboard() {
  const { user } = useAuth();
  const { messages } = useWebSocket();
  const [stats, setStats] = useState(null);
  const [teamStatus, setTeamStatus] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Handle real-time updates
    const latestMessage = messages[messages.length - 1];
    if (latestMessage) {
      if (latestMessage.type === 'time_entry_created' || latestMessage.type === 'time_entry_updated') {
        fetchData();
      }
    }
  }, [messages]);

  useEffect(() => {
    // Timer interval
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

  const fetchData = async () => {
    try {
      const [statsRes, chartRes, activeRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getActivityChart(7),
        timeEntryAPI.getActive(),
      ]);
      setStats(statsRes.data);
      setChartData(chartRes.data);
      setActiveEntry(activeRes.data);

      if (user?.role !== 'employee') {
        const teamRes = await dashboardAPI.getTeamStatus();
        setTeamStatus(teamRes.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTimer = async () => {
    try {
      await timeEntryAPI.create({
        start_time: new Date().toISOString(),
        source: 'manual',
      });
      toast.success('Timer started');
      fetchData();
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
      fetchData();
    } catch (error) {
      toast.error('Failed to stop timer');
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHours = (hours) => {
    return `${hours.toFixed(1)}h`;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-zinc-400 mt-1">Here's your productivity overview</p>
        </div>
        
        {/* Timer Control */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Current Session</p>
            <p className="timer-display text-2xl" data-testid="timer-display">
              {formatTime(timerSeconds)}
            </p>
          </div>
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
        </div>
      </div>

      {/* Stats Grid */}
      <div className="bento-grid">
        <Card className="bg-zinc-900/50 border-zinc-800 card-animate" data-testid="stat-today-hours">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Today</p>
                <p className="text-2xl font-bold text-zinc-100 mono">{formatHours(stats?.today_hours || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800 card-animate" data-testid="stat-week-hours">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">This Week</p>
                <p className="text-2xl font-bold text-zinc-100 mono">{formatHours(stats?.week_hours || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800 card-animate" data-testid="stat-month-hours">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">This Month</p>
                <p className="text-2xl font-bold text-zinc-100 mono">{formatHours(stats?.month_hours || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800 card-animate" data-testid="stat-activity">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Activity className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Activity</p>
                <p className="text-2xl font-bold text-zinc-100 mono">{stats?.avg_activity || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Team Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <Card className="lg:col-span-2 bg-zinc-900/50 border-zinc-800" data-testid="activity-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-100 text-base font-semibold">Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                  <XAxis
                    dataKey="date"
                    stroke="#71717A"
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en', { weekday: 'short' })}
                  />
                  <YAxis stroke="#71717A" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181B',
                      border: '1px solid #27272A',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#FAFAFA' }}
                  />
                  <Bar dataKey="hours" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats / Team Status */}
        <Card className="bg-zinc-900/50 border-zinc-800" data-testid="quick-stats">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-100 text-base font-semibold">
              {user?.role !== 'employee' ? 'Team Status' : 'Quick Stats'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user?.role !== 'employee' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300 text-sm">Total Team</span>
                  </div>
                  <span className="text-zinc-100 font-semibold mono">{stats?.team_total || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-zinc-300 text-sm">Online Now</span>
                  </div>
                  <span className="text-emerald-400 font-semibold mono">{stats?.team_online || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300 text-sm">Pending Timesheets</span>
                  </div>
                  <span className="text-amber-400 font-semibold mono">{stats?.pending_timesheets || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300 text-sm">Pending Leaves</span>
                  </div>
                  <span className="text-amber-400 font-semibold mono">{stats?.pending_leaves || 0}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300 text-sm">Screenshots Today</span>
                  </div>
                  <span className="text-zinc-100 font-semibold mono">{stats?.screenshots_today || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300 text-sm">Avg Activity</span>
                  </div>
                  <span className="text-zinc-100 font-semibold mono">{stats?.avg_activity || 0}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Live Status (Managers/Admins only) */}
      {user?.role !== 'employee' && teamStatus.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800" data-testid="team-live-status">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-100 text-base font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              Live Team Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {teamStatus.slice(0, 6).map((member) => (
                <div key={member.user_id} className="team-member-card">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.picture} alt={member.name} />
                    <AvatarFallback className="bg-zinc-700 text-zinc-200 text-sm">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-100 truncate">{member.name}</p>
                      <div className={`status-indicator ${member.status}`}></div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="mono">{formatHours(member.today_hours)}</span>
                      {member.current_app && (
                        <>
                          <span>·</span>
                          <span className="truncate">{member.current_app}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      member.status === 'active'
                        ? 'status-active'
                        : member.status === 'idle'
                        ? 'status-idle'
                        : 'status-offline'
                    }`}
                  >
                    {member.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
