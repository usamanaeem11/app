import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { companyAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Settings as SettingsIcon,
  Building2,
  Clock,
  Camera,
  Shield,
  Bell,
  Loader2,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

export default function Settings() {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    timezone: 'UTC',
    tracking_policy: {
      screenshot_interval: 30,
      idle_timeout: 300,
      auto_start: true,
      blur_screenshots: false,
      track_apps: true,
      track_urls: true,
      silent_mode: false,
    },
  });

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    try {
      const response = await companyAPI.get();
      setCompany(response.data);
      setSettings({
        name: response.data.name || '',
        timezone: response.data.timezone || 'UTC',
        tracking_policy: response.data.tracking_policy || settings.tracking_policy,
      });
    } catch (error) {
      console.error('Error fetching company:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await companyAPI.update(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updatePolicy = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      tracking_policy: {
        ...prev.tracking_policy,
        [key]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
          <p className="text-zinc-400 mt-1">Configure company and tracking policies</p>
        </div>

        <Button
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-500"
          disabled={saving}
          data-testid="save-settings-btn"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="bg-zinc-800 border-zinc-700">
          <TabsTrigger value="company" data-testid="tab-company">
            <Building2 className="w-4 h-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="tracking" data-testid="tab-tracking">
            <Clock className="w-4 h-4 mr-2" />
            Tracking
          </TabsTrigger>
          <TabsTrigger value="screenshots" data-testid="tab-screenshots">
            <Camera className="w-4 h-4 mr-2" />
            Screenshots
          </TabsTrigger>
          <TabsTrigger value="privacy" data-testid="tab-privacy">
            <Shield className="w-4 h-4 mr-2" />
            Privacy
          </TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company" className="mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100 text-base">Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Company Name</label>
                  <Input
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    data-testid="company-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Timezone</label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100" data-testid="timezone-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-100 font-medium">Company ID</p>
                    <p className="text-sm text-zinc-500 mono">{company?.company_id}</p>
                  </div>
                  <Badge variant="outline" className="border-zinc-700">
                    {user?.role}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking Settings */}
        <TabsContent value="tracking" className="mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100 text-base">Tracking Policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <div>
                  <p className="text-zinc-100 font-medium">Auto-start Tracking</p>
                  <p className="text-sm text-zinc-500">
                    Automatically start tracking when employees log in
                  </p>
                </div>
                <Switch
                  checked={settings.tracking_policy.auto_start}
                  onCheckedChange={(checked) => updatePolicy('auto_start', checked)}
                  data-testid="auto-start-switch"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <div>
                  <p className="text-zinc-100 font-medium">Track Applications</p>
                  <p className="text-sm text-zinc-500">
                    Monitor which applications employees use
                  </p>
                </div>
                <Switch
                  checked={settings.tracking_policy.track_apps}
                  onCheckedChange={(checked) => updatePolicy('track_apps', checked)}
                  data-testid="track-apps-switch"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <div>
                  <p className="text-zinc-100 font-medium">Track URLs</p>
                  <p className="text-sm text-zinc-500">
                    Monitor websites visited in browsers
                  </p>
                </div>
                <Switch
                  checked={settings.tracking_policy.track_urls}
                  onCheckedChange={(checked) => updatePolicy('track_urls', checked)}
                  data-testid="track-urls-switch"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Idle Timeout (seconds)</label>
                <Select
                  value={String(settings.tracking_policy.idle_timeout)}
                  onValueChange={(value) => updatePolicy('idle_timeout', parseInt(value))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100" data-testid="idle-timeout-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="120">2 minutes</SelectItem>
                    <SelectItem value="180">3 minutes</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="600">10 minutes</SelectItem>
                    <SelectItem value="900">15 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500">
                  Mark employee as idle after this period of inactivity
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Screenshot Settings */}
        <TabsContent value="screenshots" className="mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100 text-base">Screenshot Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Capture Interval (seconds)</label>
                <Select
                  value={String(settings.tracking_policy.screenshot_interval)}
                  onValueChange={(value) => updatePolicy('screenshot_interval', parseInt(value))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100" data-testid="screenshot-interval-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="10">Every 10 seconds</SelectItem>
                    <SelectItem value="30">Every 30 seconds</SelectItem>
                    <SelectItem value="60">Every minute</SelectItem>
                    <SelectItem value="180">Every 3 minutes</SelectItem>
                    <SelectItem value="300">Every 5 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500">
                  How often to capture screenshots during active tracking
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <div>
                  <p className="text-zinc-100 font-medium">Blur Screenshots</p>
                  <p className="text-sm text-zinc-500">
                    Automatically blur sensitive content in screenshots
                  </p>
                </div>
                <Switch
                  checked={settings.tracking_policy.blur_screenshots}
                  onCheckedChange={(checked) => updatePolicy('blur_screenshots', checked)}
                  data-testid="blur-screenshots-switch"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100 text-base">Privacy & Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <div>
                  <p className="text-zinc-100 font-medium">Silent Mode</p>
                  <p className="text-sm text-zinc-500">
                    Hide tracking indicator from employees (use with proper consent)
                  </p>
                </div>
                <Switch
                  checked={settings.tracking_policy.silent_mode}
                  onCheckedChange={(checked) => updatePolicy('silent_mode', checked)}
                  data-testid="silent-mode-switch"
                />
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-amber-400 font-medium">Legal Compliance Notice</p>
                    <p className="text-sm text-amber-400/80 mt-1">
                      Ensure you have proper employee consent before enabling monitoring features.
                      Different jurisdictions have varying requirements for workplace monitoring.
                      Consult with legal counsel to ensure compliance with local laws.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-zinc-400 font-medium">Recommended Practices:</p>
                <ul className="space-y-2 text-sm text-zinc-500">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Obtain written consent from all employees
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Clearly communicate what data is being collected
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Allow employees to view their own monitoring data
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Implement data retention policies
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Provide clear break/private time options
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
