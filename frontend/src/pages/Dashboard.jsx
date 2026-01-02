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
          <h1 className="text-3xl font-bold text-slate-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-600 mt-2">Here's your productivity overview for today</p>
        </div>

        {/* Timer Control */}
        <div className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4">
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Current Session</p>
            <p className="timer-display text-3xl font-bold text-slate-900" data-testid="timer-display">
              {formatTime(timerSeconds)}
            </p>
          </div>
          {activeEntry ? (
            <Button
              onClick={handleStopTimer}
              className="h-14 w-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30"
              data-testid="stop-timer-btn"
            >
              <Square className="w-6 h-6" />
            </Button>
          ) : (
            <Button
              onClick={handleStartTimer}
              className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30"
              data-testid="start-timer-btn"
            >
              <Play className="w-6 h-6 ml-0.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid="stat-today-hours">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Today</p>
                <p className="text-3xl font-bold text-slate-900">{formatHours(stats?.today_hours || 0)}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid="stat-week-hours">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">This Week</p>
                <p className="text-3xl font-bold text-slate-900">{formatHours(stats?.week_hours || 0)}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid="stat-month-hours">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">This Month</p>
                <p className="text-3xl font-bold text-slate-900">{formatHours(stats?.month_hours || 0)}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50">
                <TrendingUp className="w-6 h-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid="stat-activity">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Activity</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.avg_activity || 0}%</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Team Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <Card className="lg:col-span-2 bg-white border-slate-200 shadow-sm" data-testid="activity-chart">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-900 text-lg font-bold">Weekly Activity</CardTitle>
            <p className="text-sm text-slate-600 mt-1">Your hours worked over the past week</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en', { weekday: 'short' })}
                  />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    labelStyle={{ color: '#0F172A', fontWeight: 600 }}
                  />
                  <Bar dataKey="hours" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.9}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats / Team Status */}
        <Card className="bg-white border-slate-200 shadow-sm" data-testid="quick-stats">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-900 text-lg font-bold">
              {user?.role !== 'employee' ? 'Team Status' : 'Quick Stats'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user?.role !== 'employee' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-slate-700 text-sm font-medium">Total Team</span>
                  </div>
                  <span className="text-slate-900 font-bold text-lg">{stats?.team_total || 0}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-slate-700 text-sm font-medium">Online Now</span>
                  </div>
                  <span className="text-green-600 font-bold text-lg">{stats?.team_online || 0}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100">
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-slate-700 text-sm font-medium">Pending Timesheets</span>
                  </div>
                  <span className="text-amber-600 font-bold text-lg">{stats?.pending_timesheets || 0}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Calendar className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="text-slate-700 text-sm font-medium">Pending Leaves</span>
                  </div>
                  <span className="text-orange-600 font-bold text-lg">{stats?.pending_leaves || 0}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Camera className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-slate-700 text-sm font-medium">Screenshots Today</span>
                  </div>
                  <span className="text-slate-900 font-bold text-lg">{stats?.screenshots_today || 0}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <Activity className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-slate-700 text-sm font-medium">Avg Activity</span>
                  </div>
                  <span className="text-green-600 font-bold text-lg">{stats?.avg_activity || 0}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Live Status (Managers/Admins only) */}
      {user?.role !== 'employee' && teamStatus.length > 0 && (
        <Card className="bg-white border-slate-200 shadow-sm" data-testid="team-live-status">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-900 text-lg font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              Live Team Activity
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">Real-time status of your team members</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamStatus.slice(0, 6).map((member) => (
                <div key={member.user_id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-sm transition-shadow">
                  <Avatar className="w-12 h-12 ring-2 ring-white shadow">
                    <AvatarImage src={member.picture} alt={member.name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 text-sm font-semibold">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
                      <div className={`w-2 h-2 rounded-full ${
                        member.status === 'active' ? 'bg-green-500' :
                        member.status === 'idle' ? 'bg-yellow-500' : 'bg-slate-300'
                      }`}></div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                      <span className="font-semibold">{formatHours(member.today_hours)}</span>
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
                    className={`text-xs font-medium ${
                      member.status === 'active'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : member.status === 'idle'
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
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
