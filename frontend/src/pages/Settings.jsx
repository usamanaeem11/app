import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { companyAPI, calendarAPI, ssoAPI, emailAPI, storageAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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
  Calendar,
  Mail,
  Cloud,
  Key,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

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
  const [searchParams] = useSearchParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState({
    calendar: { connected: false },
    email: { configured: false },
    storage: { configured: false },
    sso: { configured: false }
  });
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
    fetchIntegrations();

    // Check for calendar connection callback
    if (searchParams.get('calendar') === 'connected') {
      toast.success('Google Calendar connected successfully!');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  const fetchIntegrations = async () => {
    try {
      const [calendarRes, emailRes, storageRes, ssoRes] = await Promise.all([
        calendarAPI.getStatus(user?.user_id).catch(() => ({ data: { connected: false } })),
        emailAPI.getStatus().catch(() => ({ data: { configured: false } })),
        storageAPI.getStatus().catch(() => ({ data: { configured: false } })),
        ssoAPI.getStatus().catch(() => ({ data: { saml: { configured: false } } }))
      ]);
      
      setIntegrations({
        calendar: calendarRes.data,
        email: emailRes.data,
        storage: storageRes.data,
        sso: ssoRes.data?.saml || { configured: false }
      });
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const response = await calendarAPI.connect();
      if (response.data.auth_url) {
        window.location.href = response.data.auth_url;
      }
    } catch (error) {
      toast.error('Failed to connect Google Calendar');
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      await calendarAPI.disconnect(user?.user_id);
      toast.success('Google Calendar disconnected');
      fetchIntegrations();
    } catch (error) {
      toast.error('Failed to disconnect calendar');
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
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Key className="w-4 h-4 mr-2" />
            Integrations
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

        {/* Integrations Settings */}
        <TabsContent value="integrations" className="mt-6 space-y-6">
          {/* Google Calendar */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-zinc-100 text-base">Google Calendar</CardTitle>
                    <CardDescription>Sync time entries with your calendar</CardDescription>
                  </div>
                </div>
                {integrations.calendar.connected ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
                    <XCircle className="w-3 h-3 mr-1" /> Not Connected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {integrations.calendar.connected ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">
                    Connected as: {integrations.calendar.google_email}
                  </p>
                  <Button variant="outline" size="sm" onClick={handleDisconnectCalendar}>
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button onClick={handleConnectCalendar} className="bg-blue-600 hover:bg-blue-700">
                  <Calendar className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Email Configuration */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Mail className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-zinc-100 text-base">Email Notifications</CardTitle>
                    <CardDescription>SMTP configuration for sending emails</CardDescription>
                  </div>
                </div>
                {integrations.email.configured ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Configured
                  </Badge>
                ) : (
                  <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
                    <XCircle className="w-3 h-3 mr-1" /> Not Configured
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {integrations.email.configured ? (
                <div className="space-y-2 text-sm text-zinc-400">
                  <p>SMTP Host: {integrations.email.host}</p>
                  <p>From Email: {integrations.email.from_email}</p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  Configure SMTP settings in environment variables (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)
                </p>
              )}
            </CardContent>
          </Card>

          {/* Storage Configuration */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Cloud className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-zinc-100 text-base">Screenshot Storage</CardTitle>
                    <CardDescription>S3-compatible storage for screenshots</CardDescription>
                  </div>
                </div>
                {integrations.storage.configured ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Configured
                  </Badge>
                ) : (
                  <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
                    <XCircle className="w-3 h-3 mr-1" /> Not Configured
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {integrations.storage.configured && integrations.storage.accessible ? (
                <div className="space-y-2 text-sm text-zinc-400">
                  <p>Bucket: {integrations.storage.bucket}</p>
                  <p>Endpoint: {integrations.storage.endpoint}</p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  Configure S3 settings in environment variables (S3_ENDPOINT_URL, S3_ACCESS_KEY, S3_SECRET_KEY)
                </p>
              )}
            </CardContent>
          </Card>

          {/* SSO Configuration */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Key className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-zinc-100 text-base">SAML Single Sign-On</CardTitle>
                    <CardDescription>Enterprise SSO integration</CardDescription>
                  </div>
                </div>
                {integrations.sso.configured ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Configured
                  </Badge>
                ) : (
                  <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
                    <XCircle className="w-3 h-3 mr-1" /> Not Configured
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2 text-sm">
                  <p className="text-zinc-400">Service Provider (SP) Details:</p>
                  <div className="p-3 bg-zinc-800/50 rounded-lg space-y-1 font-mono text-xs text-zinc-500">
                    <p>Entity ID: {integrations.sso.entity_id || 'workmonitor'}</p>
                    <p>ACS URL: {integrations.sso.acs_url || window.location.origin + '/api/sso/saml/acs'}</p>
                  </div>
                </div>
                {!integrations.sso.configured && (
                  <p className="text-sm text-zinc-500">
                    Configure SAML IdP settings in environment variables (SAML_IDP_SSO_URL, SAML_IDP_CERT)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
