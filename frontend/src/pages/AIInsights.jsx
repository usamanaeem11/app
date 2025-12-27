import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { aiInsightsAPI, teamAPI } from '../lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '../components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Clock,
  Activity,
  Users,
  Loader2,
  RefreshCcw,
  Sparkles,
  Target,
  Flame,
  Zap
} from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

const AIInsights = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [selectedDays, setSelectedDays] = useState('30');
  const [team, setTeam] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [trends, setTrends] = useState([]);
  const [appUsage, setAppUsage] = useState({ top_apps: [], category_breakdown: [] });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchData();
    }
  }, [selectedUserId, selectedDays]);

  const fetchInitialData = async () => {
    try {
      if (user?.role === 'admin' || user?.role === 'manager') {
        const teamRes = await teamAPI.getAll();
        setTeam(teamRes.data);
      }
      await fetchData();
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const userId = selectedUserId === 'all' ? undefined : selectedUserId;
      const days = parseInt(selectedDays);

      const [trendsRes, appRes] = await Promise.all([
        aiInsightsAPI.getProductivityTrends({ days, user_id: userId }),
        aiInsightsAPI.getAppUsageBreakdown({ days, user_id: userId })
      ]);

      setTrends(trendsRes.data.trends);
      setAppUsage(trendsRes.data);
      setAppUsage(appRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const runAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const userId = selectedUserId === 'all' ? undefined : selectedUserId;
      
      const res = await aiInsightsAPI.analyzeProductivity({
        user_id: userId,
        analysis_type: selectedUserId === 'all' ? 'team' : 'individual'
      });

      setMetrics(res.data.metrics);
      setAiInsights(res.data.ai_insights);
      toast.success('AI analysis complete!');
    } catch (error) {
      console.error('AI analysis failed:', error);
      toast.error('Failed to run AI analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getBurnoutBadgeColor = (risk) => {
    if (risk === 'low') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (risk === 'medium') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="ai-insights-loading">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="ai-insights-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-500" />
            AI Productivity Insights
          </h1>
          <p className="text-zinc-400 mt-1">AI-powered analysis of team productivity and performance</p>
        </div>
        
        <div className="flex items-center gap-3">
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700" data-testid="user-select">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
                {team.map(member => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Select value={selectedDays} onValueChange={setSelectedDays}>
            <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700" data-testid="days-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="14">14 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="60">60 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            onClick={runAIAnalysis}
            disabled={analyzing}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="analyze-btn"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Run AI Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Productivity Score</p>
                  <p className={`text-3xl font-bold ${getScoreColor(metrics.productivity_score)}`}>
                    {metrics.productivity_score}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Total Hours</p>
                  <p className="text-3xl font-bold text-zinc-100">{metrics.total_tracked_hours}h</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Active Hours</p>
                  <p className="text-3xl font-bold text-zinc-100">{metrics.active_hours}h</p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Avg Activity</p>
                  <p className="text-3xl font-bold text-zinc-100">{metrics.average_activity_level}%</p>
                </div>
                <Zap className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights Panel */}
      {aiInsights && (
        <Card className="bg-gradient-to-br from-purple-900/20 to-zinc-900/50 border-purple-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-purple-400" />
                <div>
                  <CardTitle className="text-zinc-100">AI Analysis Results</CardTitle>
                  <CardDescription>Powered by GPT-5.2</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getBurnoutBadgeColor(aiInsights.burnout_risk?.toLowerCase() || 'low')}>
                  <Flame className="w-3 h-3 mr-1" />
                  Burnout Risk: {aiInsights.burnout_risk || 'Unknown'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Assessment */}
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <p className="text-zinc-300">{aiInsights.assessment}</p>
            </div>

            {/* Grid of insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Key Observations */}
              {aiInsights.key_observations?.length > 0 && (
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <h4 className="font-semibold text-zinc-100 flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    Key Observations
                  </h4>
                  <ul className="space-y-2">
                    {aiInsights.key_observations.map((obs, i) => (
                      <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        {obs}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Highlights */}
              {aiInsights.highlights?.length > 0 && (
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <h4 className="font-semibold text-zinc-100 flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Highlights
                  </h4>
                  <ul className="space-y-2">
                    {aiInsights.highlights.map((highlight, i) => (
                      <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">•</span>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concerns */}
              {aiInsights.concerns?.length > 0 && (
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <h4 className="font-semibold text-zinc-100 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Areas of Concern
                  </h4>
                  <ul className="space-y-2">
                    {aiInsights.concerns.map((concern, i) => (
                      <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                        <span className="text-amber-400 mt-1">•</span>
                        {concern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {aiInsights.recommendations?.length > 0 && (
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <h4 className="font-semibold text-zinc-100 flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {aiInsights.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                        <span className="text-yellow-400 mt-1">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Trend Analysis */}
            {aiInsights.trend_analysis && (
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <h4 className="font-semibold text-zinc-100 flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  Trend Analysis
                </h4>
                <p className="text-sm text-zinc-400">{aiInsights.trend_analysis}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productivity Trend Chart */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Productivity Trend</CardTitle>
            <CardDescription>Daily productivity score over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af" 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="productivity_score" 
                    stroke="#10b981" 
                    fill="url(#productivityGradient)"
                    strokeWidth={2}
                    name="Productivity %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hours Chart */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Work Hours Breakdown</CardTitle>
            <CardDescription>Active vs idle hours by day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af" 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Legend />
                  <Bar dataKey="active_hours" stackId="hours" fill="#10b981" name="Active Hours" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="idle_hours" stackId="hours" fill="#374151" name="Idle Hours" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* App Category Pie Chart */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">App Category Usage</CardTitle>
            <CardDescription>Activity by application category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={appUsage.category_breakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="category"
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  >
                    {appUsage.category_breakdown?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Apps */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Top Applications</CardTitle>
            <CardDescription>Most used applications by activity count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appUsage.top_apps?.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#9ca3af" 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                  <Bar dataKey="usage_count" fill="#8b5cf6" name="Usage Count" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {!aiInsights && !metrics && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Brain className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">No AI Analysis Yet</h3>
            <p className="text-zinc-500 mb-4">
              Click "Run AI Analysis" to get AI-powered insights about your team's productivity
            </p>
            <Button
              onClick={runAIAnalysis}
              disabled={analyzing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start AI Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIInsights;
