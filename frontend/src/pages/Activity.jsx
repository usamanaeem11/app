import React, { useState, useEffect } from 'react';
import { activityAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Activity as ActivityIcon,
  Monitor,
  Globe,
  Clock,
  Loader2,
  TrendingUp,
  Zap,
  Coffee,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { format, subDays } from 'date-fns';

// Demo activity data
const demoActivityLogs = [
  { log_id: '1', app_name: 'VS Code', activity_level: 95, window_title: 'server.py', url: null, timestamp: new Date().toISOString() },
  { log_id: '2', app_name: 'Chrome', activity_level: 80, window_title: 'GitHub', url: 'github.com', timestamp: new Date(Date.now() - 60000).toISOString() },
  { log_id: '3', app_name: 'Slack', activity_level: 60, window_title: 'Team Chat', url: null, timestamp: new Date(Date.now() - 120000).toISOString() },
  { log_id: '4', app_name: 'Terminal', activity_level: 90, window_title: 'bash', url: null, timestamp: new Date(Date.now() - 180000).toISOString() },
  { log_id: '5', app_name: 'Figma', activity_level: 75, window_title: 'Dashboard Design', url: 'figma.com', timestamp: new Date(Date.now() - 240000).toISOString() },
  { log_id: '6', app_name: 'Notion', activity_level: 70, window_title: 'Project Notes', url: 'notion.so', timestamp: new Date(Date.now() - 300000).toISOString() },
];

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];

export default function ActivityPage() {
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      const response = await activityAPI.getAll({
        start_date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      });
      
      if (response.data.length === 0) {
        setActivityLogs(demoActivityLogs);
      } else {
        setActivityLogs(response.data);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
      setActivityLogs(demoActivityLogs);
    } finally {
      setLoading(false);
    }
  };

  // Calculate app usage statistics
  const getAppStats = () => {
    const appTime = {};
    activityLogs.forEach((log) => {
      if (!appTime[log.app_name]) {
        appTime[log.app_name] = { time: 0, activity: 0, count: 0 };
      }
      appTime[log.app_name].time += 30; // Each log represents 30 seconds
      appTime[log.app_name].activity += log.activity_level;
      appTime[log.app_name].count += 1;
    });

    return Object.entries(appTime)
      .map(([name, data]) => ({
        name,
        time: data.time,
        avgActivity: Math.round(data.activity / data.count),
      }))
      .sort((a, b) => b.time - a.time);
  };

  const getOverallActivity = () => {
    if (activityLogs.length === 0) return 0;
    const total = activityLogs.reduce((sum, log) => sum + log.activity_level, 0);
    return Math.round(total / activityLogs.length);
  };

  const getProductivityStatus = (level) => {
    if (level >= 80) return { label: 'Highly Productive', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    if (level >= 60) return { label: 'Productive', color: 'text-blue-400', bg: 'bg-blue-500/10' };
    if (level >= 40) return { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    return { label: 'Low Activity', color: 'text-red-400', bg: 'bg-red-500/10' };
  };

  const appStats = getAppStats();
  const overallActivity = getOverallActivity();
  const productivityStatus = getProductivityStatus(overallActivity);

  // Prepare chart data
  const pieData = appStats.slice(0, 6).map((app, index) => ({
    name: app.name,
    value: app.time,
    color: COLORS[index % COLORS.length],
  }));

  const barData = appStats.slice(0, 6).map((app) => ({
    name: app.name,
    activity: app.avgActivity,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="activity-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Activity Monitor</h1>
        <p className="text-zinc-400 mt-1">Track app usage and productivity levels</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800 col-span-1 md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Overall Activity</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-zinc-100 mono">{overallActivity}%</span>
                  <Badge className={`${productivityStatus.bg} ${productivityStatus.color} border-0`}>
                    {productivityStatus.label}
                  </Badge>
                </div>
                <Progress value={overallActivity} className="h-2 mt-3 bg-zinc-800" />
              </div>
              <div className={`p-4 rounded-xl ${productivityStatus.bg}`}>
                {overallActivity >= 60 ? (
                  <Zap className={`w-8 h-8 ${productivityStatus.color}`} />
                ) : (
                  <Coffee className={`w-8 h-8 ${productivityStatus.color}`} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Monitor className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Apps Used</p>
              <p className="text-xl font-bold text-zinc-100 mono">{appStats.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Activity Logs</p>
              <p className="text-xl font-bold text-zinc-100 mono">{activityLogs.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* App Usage Pie Chart */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-100 text-base font-semibold">App Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181B',
                      border: '1px solid #27272A',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`${Math.round(value / 60)}m`, 'Time']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-zinc-400">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Level by App */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-100 text-base font-semibold">Activity Level by App</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                  <XAxis type="number" stroke="#71717A" fontSize={12} domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" stroke="#71717A" fontSize={12} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181B',
                      border: '1px solid #27272A',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`${value}%`, 'Activity']}
                  />
                  <Bar dataKey="activity" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* App List */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-zinc-100 text-base font-semibold">Top Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {appStats.slice(0, 8).map((app, index) => (
              <div
                key={app.name}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                data-testid={`app-${app.name.toLowerCase().replace(' ', '-')}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${COLORS[index % COLORS.length]}20` }}
                  >
                    <Monitor className="w-4 h-4" style={{ color: COLORS[index % COLORS.length] }} />
                  </div>
                  <div>
                    <p className="text-zinc-100 font-medium">{app.name}</p>
                    <p className="text-xs text-zinc-500 mono">{Math.round(app.time / 60)}m tracked</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-500">Activity</span>
                      <span className="text-zinc-300 mono">{app.avgActivity}%</span>
                    </div>
                    <Progress
                      value={app.avgActivity}
                      className="h-1.5 bg-zinc-800"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Timeline */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-zinc-100 text-base font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activityLogs.slice(0, 10).map((log) => (
              <div
                key={log.log_id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/30 transition-colors"
              >
                <div className="text-xs text-zinc-500 mono w-16">
                  {format(new Date(log.timestamp), 'HH:mm:ss')}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                    {log.app_name}
                  </Badge>
                  <span className="text-sm text-zinc-400 truncate">{log.window_title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16">
                    <Progress value={log.activity_level} className="h-1.5 bg-zinc-800" />
                  </div>
                  <span className="text-xs text-zinc-400 mono w-8">{log.activity_level}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
